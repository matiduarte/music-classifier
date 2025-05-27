#!/usr/bin/env node

import fs from 'fs/promises';
import path, { dirname } from 'path';
import { parseFile } from 'music-metadata';
import { fileURLToPath } from 'url';
import cliProgress from 'cli-progress';
import pLimit from 'p-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPPORTED_EXTENSIONS = ['.mp3', '.aiff', '.flac', '.wav', '.ogg'];

const args = process.argv.slice(2);
const sourceDir = args.find(arg => arg.startsWith('--source='))?.split('=')[1] || path.join(__dirname, 'music');
const outputDir = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || path.join(__dirname, 'organized-by-genre');
const concurrency = parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1]) || 20;

async function getAllAudioFiles(dir) {
    let results = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(await getAllAudioFiles(fullPath));
        } else if (SUPPORTED_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
            results.push(fullPath);
        }
    }
    return results;
}

async function processFile(filePath) {
    try {
        const metadata = await parseFile(filePath);
        const genre = (metadata.common.genre || ['Unknown'])[0];
        const safeGenre = genre.replace(/[<>:"/\\|?*]/g, '_');
        const destinationDir = path.join(outputDir, safeGenre);
        await fs.mkdir(destinationDir, { recursive: true });

        const destinationPath = path.join(destinationDir, path.basename(filePath));

        // Skip if file already exists to save time
        try {
            await fs.access(destinationPath);
            // File exists, skip copying/moving
            return `Skipped existing: ${path.basename(filePath)}`;
        } catch {
            // File doesn't exist, proceed
        }

        await fs.copyFile(filePath, destinationPath);
        return `Copied: ${path.basename(filePath)} → ${safeGenre}`;

    } catch (err) {
        return `Error: ${path.basename(filePath)} - ${err.message}`;
    }
}

async function processFiles(files) {
    const bar = new cliProgress.SingleBar({
        format: '🎶 Processing |{bar}| {percentage}% || {value}/{total} files',
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true
    });
    bar.start(files.length, 0);

    const limit = pLimit(concurrency);

    let processedCount = 0;

    const promises = files.map(file => limit(async () => {
        const result = await processFile(file);
        processedCount++;
        bar.update(processedCount);
        if (result.startsWith('Error')) {
            console.error(`❌ ${result}`);
        }
    }));

    await Promise.all(promises);
    bar.stop();
    console.log('✅ Done processing all files.');
}

(async () => {
    try {
        console.log(`📁 Scanning: ${sourceDir}`);
        const files = await getAllAudioFiles(sourceDir);
        if (!files.length) {
            console.log('⚠️ No supported audio files found.');
            return;
        }
        console.log(`🎧 Found ${files.length} supported audio files.`);
        await processFiles(files);

    } catch (err) {
        console.error(`💥 Error: ${err.message}`);
    }
})();
