/**
 * Discovers all gallery images for a product.
 *
 * Convention: the main image lives at `/products/{image_key}.png` and
 * additional gallery angles at `/products/{image_key}-2.png`,
 * `/products/{image_key}-3.png`, ... up to whatever number we've saved.
 *
 * Server-side only — reads from web/public/products at request/build time.
 */

import { readdirSync } from 'fs';
import { join } from 'path';

let cachedDir: string[] | null = null;

function getDir(): string[] {
  if (cachedDir) return cachedDir;
  try {
    cachedDir = readdirSync(join(process.cwd(), 'public', 'products'));
  } catch {
    cachedDir = [];
  }
  return cachedDir;
}

/**
 * Returns the public paths for every gallery image of a product, in order:
 * [main, -2, -3, ...]. If only the main image exists, returns a single-element array.
 * If no image exists at all, returns an empty array.
 */
export function getProductImages(imageKey: string | null): string[] {
  if (!imageKey) return [];
  const files = getDir();
  const main = `${imageKey}.png`;
  if (!files.includes(main)) return [];

  // Find numbered variants
  const variantPrefix = `${imageKey}-`;
  const variants = files
    .filter((f) => f.startsWith(variantPrefix) && f.endsWith('.png'))
    .map((f) => {
      const m = f.match(new RegExp(`^${imageKey}-(\\d+)\\.png$`));
      return m ? { file: f, n: parseInt(m[1], 10) } : null;
    })
    .filter((x): x is { file: string; n: number } => x !== null)
    .sort((a, b) => a.n - b.n)
    .map((x) => `/products/${x.file}`);

  return [`/products/${main}`, ...variants];
}
