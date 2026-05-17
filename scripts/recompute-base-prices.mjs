#!/usr/bin/env node
/**
 * Recompute products.base_price from the live prices table.
 *
 * `base_price` is the canonical "From £X" shown on listing cards and used by
 * filters/sort/alerts. Scrapers only update `prices`, so without this script
 * the card price drifts out of sync with the cheapest live retailer price.
 *
 * Rule: base_price = cheapest in-stock retailer price (price > 0).
 *       If nothing is in stock, fall back to the cheapest overall.
 *       If a product has no price rows at all, leave it untouched.
 *
 * Usage:
 *   node scripts/recompute-base-prices.mjs             # apply
 *   node scripts/recompute-base-prices.mjs --dry-run   # show changes only
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log(`\n📊 Recomputing base_price${DRY_RUN ? ' (dry-run)' : ''}\n`);

const { data: products, error: pErr } = await sb
  .from('products')
  .select('id, name, base_price');
if (pErr) {
  console.error('✗ Failed to load products:', pErr.message);
  process.exit(1);
}

const { data: priceRows, error: prErr } = await sb
  .from('prices')
  .select('product_id, price, in_stock')
  .gt('price', 0);
if (prErr) {
  console.error('✗ Failed to load prices:', prErr.message);
  process.exit(1);
}

// Bucket prices by product id, keeping in-stock and any-stock minima separately.
const byProduct = new Map();
for (const r of priceRows) {
  const id = String(r.product_id);
  const bucket = byProduct.get(id) ?? { inStockMin: null, anyMin: null };
  const p = Number(r.price);
  if (r.in_stock !== false) {
    bucket.inStockMin = bucket.inStockMin == null ? p : Math.min(bucket.inStockMin, p);
  }
  bucket.anyMin = bucket.anyMin == null ? p : Math.min(bucket.anyMin, p);
  byProduct.set(id, bucket);
}

let changed = 0;
let unchanged = 0;
let untouched = 0;

for (const product of products) {
  const id = String(product.id);
  const bucket = byProduct.get(id);
  if (!bucket) {
    untouched++;
    continue;
  }
  const newBase = bucket.inStockMin ?? bucket.anyMin;
  const oldBase = Number(product.base_price);
  if (Math.abs(newBase - oldBase) < 0.01) {
    unchanged++;
    continue;
  }
  const arrow = newBase > oldBase ? '↑' : '↓';
  console.log(
    `  ${arrow} ${product.id} ${product.name.slice(0, 50).padEnd(50)} £${oldBase.toFixed(2).padStart(7)} → £${newBase.toFixed(2)}`
  );
  if (!DRY_RUN) {
    const { error: uErr } = await sb
      .from('products')
      .update({ base_price: newBase })
      .eq('id', product.id);
    if (uErr) console.warn(`    ✗ update failed: ${uErr.message}`);
  }
  changed++;
}

console.log(
  `\n  ${changed} changed · ${unchanged} same · ${untouched} no prices${DRY_RUN ? ' (dry-run, nothing written)' : ''}\n`
);
