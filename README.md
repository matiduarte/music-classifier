# 🎵 organize-music

A simple **Node.js script** to organize your music files by genre.  
Supports `.mp3` and `.aiff` audio files. Reads metadata and copies songs into genre folders.

---

## Features

- Recursively scans a directory for `.mp3` and `.aiff` files
- Reads metadata using [`music-metadata`](https://github.com/Borewit/music-metadata)
- Organizes songs into folders by genre
- Processes files concurrently for faster performance

---

## Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/yourusername/organize-music.git
cd organize-music
npm install
```

## Usage

This script reads music files from a source directory, extracts metadata, and organizes them by genre into folders.

By default, it processes the `./music` folder and copies files into `./organized-by-genre`.

### Running the script

Simply run:

```bash
npm start
```


