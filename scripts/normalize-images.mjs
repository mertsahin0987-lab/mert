#!/usr/bin/env node
/**
 * Normalize every product image to the same visual proportions.
 *
 * Each retailer crops their product photos differently — some leave 5%
 * whitespace around the clipper, some leave 40%. When we display these on a
 * uniform aspect-square grid, the products inside end up at wildly different
 * apparent sizes and the grid looks chaotic, especially on mobile where the
 * cards are smaller.
 *
 * Pipeline per file:
 *   1. Trim near-white pixels off all four edges (tight crop to the product)
 *   2. Fit the trimmed product into a 1000×1000 square, scaled to leave 10%
 *      padding on the long axis (so the clipper itself fills ~80% of the
 *      visible area on every card, no matter the source)
 *   3. Composite on a white background and overwrite the file
 *
 * Usage:
 *   node scripts/normalize-images.mjs --dry-run
 *   node scripts/normalize-images.mjs
 */

import sharp from '../web/node_modules/sharp/lib/index.js';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'web', 'public', 'products');
const dryRun = process.argv.includes('--dry-run');

const CANVAS = 1000;
const PADDING_RATIO = 0.10; // 10% padding → product fills 80% of canvas

const files = readdirSync(DIR).filter((f) => f.endsWith('.png'));
console.log(`${files.length} PNG files`);

let processed = 0, skipped = 0, failed = 0;

for (const f of files) {
  const path = join(DIR, f);
  try {
    const buf = await sharp(path)
      // Trim near-white edges. threshold = how close to white counts as
      // "background" — 12 is loose enough to handle slightly off-white JPEG
      // backgrounds without clipping into product highlights.
      .trim({ threshold: 12 })
      .toBuffer();

    const trimmed = sharp(buf);
    const meta = await trimmed.metadata();
    if (!meta.width || !meta.height) throw new Error('no metadata');

    // Compute target size: fit longest side into (CANVAS * (1 - 2*padding))
    const usable = Math.floor(CANVAS * (1 - 2 * PADDING_RATIO));
    const scale = usable / Math.max(meta.width, meta.height);
    const targetW = Math.round(meta.width * scale);
    const targetH = Math.round(meta.height * scale);

    const resized = await trimmed
      .resize(targetW, targetH, { fit: 'inside' })
      .toBuffer();

    const final = await sharp({
      create: {
        width: CANVAS,
        height: CANVAS,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    if (!dryRun) {
      await sharp(final).toFile(path);
    }
    processed++;
    if (processed % 50 === 0) console.log(`  ${processed}/${files.length}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${f}: ${e.message}`);
  }
}

console.log(`\n${processed} normalized · ${skipped} skipped · ${failed} failed`);
