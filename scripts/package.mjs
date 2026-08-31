#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { ZipArchive } from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

/**
 * Read version from src/manifest.json
 */
async function getVersion() {
  const manifestPath = path.join(rootDir, 'src', 'manifest.json');
  const content = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(content);
  return manifest.version;
}

/**
 * Create a zip archive of a directory
 */
async function zipDirectory(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });

    output.on('close', () => {
      resolve(archive.pointer());
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Main packaging logic
 */
async function main() {
  try {
    const version = await getVersion();
    console.log(`Packaging extension v${version}...`);

    // Create artifacts directory if it doesn't exist
    const artifactsDir = path.join(rootDir, 'artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });

    const targets = ['chrome', 'firefox'];
    const zips = [];

    for (const target of targets) {
      const distDir = path.join(rootDir, 'dist', target);

      // Check if dist/<target> exists
      try {
        await fs.access(distDir);
      } catch (err) {
        console.error(`Error: dist/${target} does not exist. Run 'npm run build' first.`);
        process.exit(1);
      }

      const zipName = `mahalinkam-${version}-${target}.zip`;
      const zipPath = path.join(artifactsDir, zipName);

      console.log(`Zipping ${distDir}...`);
      const bytes = await zipDirectory(distDir, zipPath);
      const sizeKB = (bytes / 1024).toFixed(2);

      console.log(`  → ${zipPath} (${sizeKB} KB)`);
      zips.push({ path: zipPath, size: sizeKB });
    }

    console.log('\nPackaging complete:');
    zips.forEach(({ path: p, size }) => {
      console.log(`  ${p} (${size} KB)`);
    });
  } catch (err) {
    console.error('Packaging failed:', err.message);
    process.exit(1);
  }
}

main();
