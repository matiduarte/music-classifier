#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';
import cliProgress from 'cli-progress';

const supportedExtensions = ['.mp3', '.aiff', '.aif', '.flac', '.wav', '.m4a', '.ogg', '.opus'];

const sourceDir = path.join(process.cwd(), 'music');
const destDir = path.join(process.cwd(), 'organized-by-genre');

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

async function scanDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const nestedFiles = await scanDirectory(fullPath);
            files.push(...nestedFiles);
        } else if (entry.isFile()) {
            if (supportedExtensions.includes(path.extname(entry.name).toLowerCase())) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

async function organizeFile(file, progressBar) {
    try {
        const metadata = await parseFile(file);
        const genreArray = metadata.common.genre || [];
        const genre = genreArray.length > 0 ? genreArray[0] : 'Unknown';

        const sanitizedGenre = genre.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '').trim() || 'Unknown';
        const genreFolder = path.join(destDir, sanitizedGenre);
        await ensureDir(genreFolder);

        const fileName = path.basename(file);
        const destPath = path.join(genreFolder, fileName);

        await fs.copyFile(file, destPath);
    } catch (err) {
        console.error(`Failed to process "${file}": ${err.message}`);
    } finally {
        progressBar.increment();
    }
}

async function main() {
    await ensureDir(destDir);

    console.log(`📁 Scanning directory: ${sourceDir}`);
    const files = await scanDirectory(sourceDir);

    console.log(`🎧 Found ${files.length} supported audio files.`);

    const progressBar = new cliProgress.SingleBar({
        format: 'Progress |{bar}| {percentage}% || {value}/{total} files',
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true,
    });

    progressBar.start(files.length, 0);

    const concurrency = 5;
    let index = 0;

    async function worker() {
        while (index < files.length) {
            const currentIndex = index++;
            await organizeFile(files[currentIndex], progressBar);
        }
    }

    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
    progressBar.stop();

    console.log('✅ Organization complete!');
}

main().catch(err => {
    console.error('🚨 Unexpected error:', err);
});
