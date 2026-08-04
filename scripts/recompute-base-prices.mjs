#!/usr/bin/env node
/**
 * Recompute products.base_price from the live prices table.
 *
 * `base_price` is the canonical "From £X" shown on listing cards and used by
 * filters/sort/alerts. Scrapers only update `prices`, so without this script
 * the card price drifts out of sync with the cheapest live retailer price.
 *
 * Rule: base_price = cheapest **fresh** in-stock retailer price (price > 0).
 *       "Fresh" = scraped within the last STALE_DAYS (default 7). This stops
 *       stale sale prices — especially Chris & Sons, which the automated
 *       cron can't refresh from GitHub-Actions IPs — from being surfaced as
 *       the "From £X" when they may no longer be valid. Users would rather
 *       see a slightly-higher accurate price than a lower fictional one.
 *       If nothing fresh is in stock, we fall back through: fresh any-stock
 *       → any-age in-stock → any-age any-stock. Products with no price rows
 *       at all are left untouched.
 *
 * Usage:
 *   node scripts/recompute-base-prices.mjs             # apply
 *   node scripts/recompute-base-prices.mjs --dry-run   # show changes only
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

// Any retailer price scraped more than STALE_DAYS ago is considered
// unreliable and won't be surfaced as the "From £X" headline. Bump this if
// you re-establish reliable Chris & Sons scraping (see workflow comment).
const STALE_DAYS = 7;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

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
  .select('product_id, price, in_stock, fetched_at')
  .gt('price', 0);
if (prErr) {
  console.error('✗ Failed to load prices:', prErr.message);
  process.exit(1);
}

// Bucket prices by product id into fresh/any × in-stock/any-stock corners.
// Preference order applied later: freshInStock → freshAny → anyInStock → any.
const now = Date.now();
const byProduct = new Map();
let staleSkipped = 0;
for (const r of priceRows) {
  const id = String(r.product_id);
  const bucket = byProduct.get(id) ?? {
    freshInStock: null, freshAny: null,
    anyInStock:   null, any:      null,
  };
  const p = Number(r.price);
  const fresh = r.fetched_at && (now - new Date(r.fetched_at).getTime()) < STALE_MS;
  const inStock = r.in_stock !== false;

  if (fresh && inStock) bucket.freshInStock = bucket.freshInStock == null ? p : Math.min(bucket.freshInStock, p);
  if (fresh)            bucket.freshAny     = bucket.freshAny     == null ? p : Math.min(bucket.freshAny,     p);
  if (inStock)          bucket.anyInStock   = bucket.anyInStock   == null ? p : Math.min(bucket.anyInStock,   p);
                        bucket.any          = bucket.any          == null ? p : Math.min(bucket.any,          p);
  if (!fresh) staleSkipped++;
  byProduct.set(id, bucket);
}
console.log(`  ${staleSkipped} stale price rows (>${STALE_DAYS}d old) demoted from the headline\n`);

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
  const newBase =
    bucket.freshInStock ??
    bucket.freshAny     ??
    bucket.anyInStock   ??
    bucket.any;
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
