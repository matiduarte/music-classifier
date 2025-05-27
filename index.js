import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFile } from 'music-metadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_EXTENSIONS = ['.mp3', '.aiff', '.aif'];
const DESTINATION_ROOT = path.join(__dirname, 'organized-by-genre');

function sanitize(name) {
    return name.replace(/[^a-z0-9-_ ]/gi, '_');
}

async function readMetadata(filePath) {
    try {
        const metadata = await parseFile(filePath);
        const common = metadata.common;
        const duration = metadata.format.duration;
        return {
            file: path.basename(filePath),
            title: common.title || '',
            artist: common.artist || '',
            album: common.album || '',
            genre: (common.genre && common.genre[0]) || 'Unknown',
            durationSeconds: duration ? Math.round(duration) : null,
        };
    } catch (err) {
        console.error(`[Error] ${filePath}:`, err.message);
        return null;
    }
}

async function moveFileToGenreFolder(filePath, genre) {
    const genreDir = path.join(DESTINATION_ROOT, sanitize(genre));
    fs.mkdirSync(genreDir, { recursive: true });

    const destPath = path.join(genreDir, path.basename(filePath));

    try {
        fs.copyFileSync(filePath, destPath);
        console.log(`✅ Copied to ${genreDir}`);
    } catch (err) {
        console.error(`❌ Error copying ${filePath} → ${destPath}: ${err.message}`);
    }
}

async function readDirectory(directory) {
    const files = fs.readdirSync(directory);

    // Map all files/folders to promises
    const processingTasks = files.map(async (file) => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Process directories sequentially (await)
            await readDirectory(fullPath);
        } else if (SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
            const metadata = await readMetadata(fullPath);
            if (metadata) {
                console.log(`🎵 ${metadata.title} (${metadata.genre})`);
                await moveFileToGenreFolder(fullPath, metadata.genre);
            }
        }
    });

    // Wait for all files in this directory to finish processing in parallel
    await Promise.all(processingTasks);
}

// Change this to your music source directory or leave it as default "./music"
const sourceDir = process.argv[2] || path.join(__dirname, 'music');

console.log(`Processing music files from: ${sourceDir}`);
console.log(`Organizing into: ${DESTINATION_ROOT}`);

await readDirectory(sourceDir);

console.log('All done!');
