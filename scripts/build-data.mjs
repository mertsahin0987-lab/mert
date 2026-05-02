#!/usr/bin/env node
/**
 * MySection product data sync.
 *
 * Reads CSV files from data/ and generates a typed TypeScript file at
 * constants/generatedData.ts that the app imports from.
 *
 * Usage:  npm run sync-data
 *
 * Edit data/products.csv, data/prices.csv, data/colors.csv, data/brands.csv
 * in any spreadsheet program (Numbers, Excel, Google Sheets) — save as CSV —
 * then run this script to update the app.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const PRODUCTS_DIR = join(ROOT, 'assets', 'products');
const BRANDS_DIR = join(ROOT, 'assets', 'brands');
const OUTPUT = join(ROOT, 'constants', 'generatedData.ts');

// === ANSI colours for nice console output ===
const c = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  blue: s => `\x1b[34m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

const errors = [];
const warnings = [];
const fail = msg => errors.push(msg);
const warn = msg => warnings.push(msg);

// === Robust CSV parser (handles quoted fields, commas, escaped quotes) ===
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && next === '\n') i++;
        row.push(field);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
}

function readCsv(name) {
  const path = join(DATA_DIR, name);
  if (!existsSync(path)) {
    fail(`Missing data file: data/${name}`);
    return [];
  }
  return parseCsv(readFileSync(path, 'utf8'));
}

const parseBool = (v, def = false) => {
  const s = String(v).trim().toLowerCase();
  if (s === 'true' || s === 'yes' || s === '1') return true;
  if (s === 'false' || s === 'no' || s === '0' || s === '') return def;
  return def;
};

const parseNum = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

// === Image scanning ===
function scanImageKeys(dir, label) {
  if (!existsSync(dir)) {
    warn(`No ${label} directory at ${dir.replace(ROOT + '/', '')}`);
    return new Set();
  }
  const keys = new Set();
  for (const f of readdirSync(dir)) {
    const m = f.match(/^(.+)\.(png|jpg|jpeg|webp)$/i);
    if (m) keys.add(m[1]);
  }
  return keys;
}

// === Main ===
console.log(c.bold('\n📦 MySection — Building product data\n'));

const productImages = scanImageKeys(PRODUCTS_DIR, 'product images');
const brandLogos = scanImageKeys(BRANDS_DIR, 'brand logos');

const brandsRaw = readCsv('brands.csv');
const productsRaw = readCsv('products.csv');
const pricesRaw = readCsv('prices.csv');
const colorsRaw = readCsv('colors.csv');

// Build brands
const brands = brandsRaw.map((b, idx) => {
  if (!b.id) fail(`brands.csv row ${idx + 2}: missing id`);
  if (!b.name) fail(`brands.csv row ${idx + 2}: missing name`);
  if (!b.logo) fail(`brands.csv row ${idx + 2}: missing logo`);
  if (b.logo && !brandLogos.has(b.logo)) {
    warn(`brands.csv row ${idx + 2}: logo "${b.logo}" not found in assets/brands/`);
  }
  return { id: b.id, name: b.name, logo: b.logo };
});

const brandNames = new Set(brands.map(b => b.name));

// Group prices by productId
const pricesByProduct = new Map();
for (let i = 0; i < pricesRaw.length; i++) {
  const p = pricesRaw[i];
  const row = i + 2;
  if (!p.productId) { fail(`prices.csv row ${row}: missing productId`); continue; }
  if (!p.retailer)  { fail(`prices.csv row ${row}: missing retailer`);  continue; }
  if (!p.price)     { fail(`prices.csv row ${row}: missing price`);     continue; }
  const list = pricesByProduct.get(p.productId) || [];
  list.push({
    name: p.retailer,
    url: p.url || '',
    inStock: parseBool(p.inStock, true),
    price: parseNum(p.price),
  });
  pricesByProduct.set(p.productId, list);
}

// Group colors by productId
const colorsByProduct = new Map();
for (let i = 0; i < colorsRaw.length; i++) {
  const co = colorsRaw[i];
  const row = i + 2;
  if (!co.productId) continue;
  if (!co.name) { fail(`colors.csv row ${row}: missing name`); continue; }
  if (!co.hex)  { fail(`colors.csv row ${row}: missing hex`);  continue; }
  if (co.image && !productImages.has(co.image)) {
    warn(`colors.csv row ${row}: image "${co.image}" not found in assets/products/`);
  }
  const list = colorsByProduct.get(co.productId) || [];
  list.push({
    name: co.name,
    hex: co.hex,
    image: co.image || null,
    productId: co.linkedProductId || null,
  });
  colorsByProduct.set(co.productId, list);
}

// Build products
const products = productsRaw.map((p, idx) => {
  const row = idx + 2;
  if (!p.id)       fail(`products.csv row ${row}: missing id`);
  if (!p.name)     fail(`products.csv row ${row}: missing name`);
  if (!p.brand)    fail(`products.csv row ${row}: missing brand`);
  if (!p.category) fail(`products.csv row ${row}: missing category`);
  if (!p.image)    fail(`products.csv row ${row}: missing image`);
  if (!p.price)    fail(`products.csv row ${row}: missing price`);

  if (p.brand && !brandNames.has(p.brand)) {
    warn(`products.csv row ${row}: brand "${p.brand}" is not in brands.csv`);
  }
  if (p.image && !productImages.has(p.image)) {
    warn(`products.csv row ${row}: image "${p.image}" not found in assets/products/`);
  }

  const stores = pricesByProduct.get(p.id) || [];
  if (stores.length === 0) {
    warn(`products.csv row ${row} (${p.name || p.id}): no retailer prices in prices.csv`);
  }

  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    image: p.image,
    price: parseNum(p.price),
    description: p.description || '',
    isNew: parseBool(p.isNew),
    trending: parseBool(p.trending),
    upcomingRelease: parseBool(p.upcomingRelease),
    releaseDate: p.releaseDate || null,
    stores,
    colors: colorsByProduct.get(p.id) || [],
  };
});

// === Validation summary ===
if (warnings.length) {
  console.log(c.yellow(`⚠  ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`));
  warnings.forEach(w => console.log(c.yellow(`   • ${w}`)));
  console.log();
}
if (errors.length) {
  console.log(c.red(`✗ ${errors.length} error${errors.length === 1 ? '' : 's'}:`));
  errors.forEach(e => console.log(c.red(`   • ${e}`)));
  console.log(c.red('\nFix the errors above and run again. No file written.\n'));
  process.exit(1);
}

// === Generate TypeScript output ===
// Only reference image files that actually exist — for missing ones, fall back
// to an existing "placeholder" image so the app still bundles. The missing
// image warnings above tell the user which files still need to be added.

const allProductImageKeys = new Set();
products.forEach(p => p.image && allProductImageKeys.add(p.image));
colorsRaw.forEach(co => co.image && allProductImageKeys.add(co.image));

// Pick a fallback that definitely exists in the assets dir
const fallbackProductKey = [...productImages].sort()[0] || null;
const fallbackBrandKey = [...brandLogos].sort()[0] || null;

if (!fallbackProductKey) {
  fail(`No product images found in assets/products/. Add at least one PNG before running sync.`);
}

const productImageMap = [...allProductImageKeys]
  .sort()
  .map(k => {
    const realKey = productImages.has(k) ? k : fallbackProductKey;
    return `  '${k}': require('../assets/products/${realKey}.png'),`;
  })
  .join('\n');

const brandLogoMap = brands
  .map(b => {
    const realKey = brandLogos.has(b.logo) ? b.logo : (fallbackBrandKey || b.logo);
    return `  '${b.logo}': require('../assets/brands/${realKey}.png'),`;
  })
  .join('\n');

const out = `// AUTO-GENERATED by scripts/build-data.mjs — DO NOT EDIT BY HAND.
// Edit data/*.csv files instead, then run: npm run sync-data
//
// Generated at: ${new Date().toISOString()}
// Source: data/products.csv, data/prices.csv, data/colors.csv, data/brands.csv

import { ImageSourcePropType } from 'react-native';
import type { Product, Brand, ColorVariant } from './MockData';

// Exported so other modules (e.g. lib/DataContext.tsx) can attach the right
// bundled image to live data fetched from Supabase.
export const productImages: Record<string, ImageSourcePropType> = {
${productImageMap}
};

export const brandLogos: Record<string, ImageSourcePropType> = {
${brandLogoMap}
};

export const generatedBrands: Brand[] = ${JSON.stringify(brands, null, 2).replace(/"logo": "([^"]+)"/g, '"logo": __BRAND__$1__')};

export const generatedProducts: Product[] = ${JSON.stringify(
  products.map(p => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    image: `__PRODUCT__${p.image}__`,
    stores: p.stores,
    trending: p.trending,
    isNew: p.isNew,
    ...(p.releaseDate ? { releaseDate: p.releaseDate } : {}),
    ...(p.upcomingRelease ? { upcomingRelease: p.upcomingRelease } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.colors.length
      ? {
          colors: p.colors.map(co => ({
            name: co.name,
            hex: co.hex,
            ...(co.image ? { image: `__PRODUCT__${co.image}__` } : {}),
            ...(co.productId ? { productId: co.productId } : {}),
          })),
        }
      : {}),
  })),
  null,
  2
)};
`
  // Replace placeholder strings with real require() calls
  .replace(/"image": "__PRODUCT__([^"]+)__"/g, (_, k) => `"image": productImages['${k}']`)
  .replace(/"logo": __BRAND__([^"]+?)__/g, (_, k) => `"logo": brandLogos['${k}']`);

writeFileSync(OUTPUT, out);

console.log(c.green(`✓ Wrote ${OUTPUT.replace(ROOT + '/', '')}`));
console.log(c.dim(`  ${products.length} products · ${brands.length} brands · ${pricesRaw.length} retailer prices · ${colorsRaw.length} color variants`));
console.log(c.dim(`  ${productImages.size} product images, ${brandLogos.size} brand logos found in assets\n`));
