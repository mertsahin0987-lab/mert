#!/usr/bin/env node
/**
 * Price scraper runner.
 *
 *   1. Load every (product_id, retailer_id, url) row from `prices`.
 *   2. Dispatch each URL to the right per-retailer scraper.
 *   3. Update the row in `prices` with the fresh price + in_stock + last_seen_at.
 *   4. Append a row to `price_history` so we have a time-series record.
 *
 * Run locally:
 *   node scripts/scrape-prices.mjs
 *
 * Run with filtering (only one retailer, useful for testing):
 *   node scripts/scrape-prices.mjs --retailer=coolblades
 *   node scripts/scrape-prices.mjs --product=1
 *   node scripts/scrape-prices.mjs --limit=5
 *   node scripts/scrape-prices.mjs --dry-run        (don't write to DB)
 *
 * Auth:
 *   Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.
 *   The service-role key bypasses RLS — keep it server-side ONLY.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { setTimeout as sleep } from 'node:timers/promises';

import * as coolblades from './scrapers/coolblades.mjs';
import * as salonsdirect from './scrapers/salonsdirect.mjs';
import * as tomb45 from './scrapers/tomb45.mjs';
import * as chrisandsons from './scrapers/chrisandsons.mjs';
import * as jrl from './scrapers/jrl.mjs';
import * as amazon from './scrapers/amazon.mjs';
import * as beautyworldplus from './scrapers/beautyworldplus.mjs';
import { closeBrowser } from './scrapers/_browser.mjs';

// ============================================================================
// Setup
// ============================================================================

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://xgoiabfbetftjomtvcgb.supabase.co';
// Treat the .env.example placeholder as "not set" so dry-run still works.
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SERVICE_KEY =
  rawServiceKey && !rawServiceKey.includes('paste-your-secret-key-here')
    ? rawServiceKey
    : null;
// Public/anon key — safe to embed, only allows reads via RLS.
// Used as a fallback in dry-run mode so you can probe URLs without the secret key.
const PUBLIC_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

// Parse CLI flags FIRST so we can decide whether the secret is required.
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const DRY_RUN = !!args['dry-run'];
const FILTER_RETAILER = args.retailer || null;
const FILTER_PRODUCT = args.product || null;
const LIMIT = args.limit ? Number(args.limit) : Infinity;

if (!DRY_RUN && !SERVICE_KEY) {
  console.error('✗ Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  console.error('  Copy .env.example to .env and paste your secret service-role key,');
  console.error('  or run with --dry-run to probe URLs without writing to the database.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY || PUBLIC_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SCRAPERS = [coolblades, salonsdirect, tomb45, chrisandsons, jrl, amazon, beautyworldplus];

// ============================================================================
// Dispatch
// ============================================================================

function findScraper(url) {
  if (!url) return null;
  try {
    return SCRAPERS.find((s) => s.matchesDomain(url)) ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// DB writes
// ============================================================================

async function recordResult({ productId, retailerId, url, price, inStock, error }) {
  if (DRY_RUN) return;

  // Update the canonical "current price" row (only on success — we don't want
  // a transient error to clobber the last-known good price).
  if (!error) {
    const { error: upErr } = await supabase
      .from('prices')
      .update({ price, in_stock: inStock, fetched_at: new Date().toISOString() })
      .eq('product_id', productId)
      .eq('retailer_id', retailerId);
    if (upErr) console.warn(`    DB update failed: ${upErr.message}`);

    // Append to price_history (clean time series — only successful scrapes)
    const { error: histErr } = await supabase.from('price_history').insert({
      product_id: productId,
      retailer_id: retailerId,
      price,
      in_stock: inStock,
    });
    if (histErr) console.warn(`    History insert failed: ${histErr.message}`);
  }
}

// ============================================================================
// Main
// ============================================================================

console.log('\n🔍 MySection price scraper\n');
if (DRY_RUN) console.log('  (dry-run mode — no DB writes)\n');

let query = supabase
  .from('prices')
  .select('product_id, retailer_id, price, url')
  .not('url', 'is', null)
  .neq('url', '');

if (FILTER_RETAILER) query = query.eq('retailer_id', FILTER_RETAILER);
if (FILTER_PRODUCT) query = query.eq('product_id', String(FILTER_PRODUCT));

const { data: rows, error } = await query;
if (error) {
  console.error('✗ Failed to load prices:', error.message);
  process.exit(1);
}

const todo = rows.slice(0, LIMIT);
console.log(`  ${todo.length} URL(s) to scrape\n`);

const stats = { ok: 0, skipped: 0, failed: 0, changed: 0 };
const failures = [];

for (let i = 0; i < todo.length; i++) {
  const row = todo[i];
  const tag = `[${i + 1}/${todo.length}] ${row.retailer_id} · product ${row.product_id}`;
  const scraper = findScraper(row.url);

  if (!scraper) {
    console.log(`${tag}  ⊘  no scraper for ${row.url}`);
    stats.skipped++;
    continue;
  }

  try {
    const result = await scraper.scrape(row.url);
    const oldPrice = Number(row.price);
    const changed = Math.abs(result.price - oldPrice) > 0.01;
    const arrow = changed
      ? oldPrice > result.price ? '↓' : '↑'
      : '=';
    console.log(
      `${tag}  ✓  £${result.price.toFixed(2)} ${arrow} (was £${oldPrice.toFixed(2)})${result.inStock ? '' : '  out of stock'}`
    );
    await recordResult({
      productId: row.product_id,
      retailerId: row.retailer_id,
      url: row.url,
      price: result.price,
      inStock: result.inStock,
    });
    stats.ok++;
    if (changed) stats.changed++;
  } catch (e) {
    console.log(`${tag}  ✗  ${e.message}`);
    failures.push({ row, error: e.message });
    await recordResult({
      productId: row.product_id,
      retailerId: row.retailer_id,
      url: row.url,
      error: e.message,
    });
    stats.failed++;
  }

  // Be polite — don't hammer any one retailer. Cloudflare-protected
  // retailers (Chris & Sons, Amazon) get a longer pause to avoid triggering
  // bot challenges from rapid-fire requests.
  const usesBrowser =
    row.retailer_id === 'chris-sons' || row.retailer_id === 'amazon-uk';
  await sleep(usesBrowser ? 3000 + Math.random() * 2000 : 800 + Math.random() * 700);
}

console.log('\n' + '─'.repeat(50));
console.log(`  ${stats.ok} ok · ${stats.changed} prices changed · ${stats.skipped} skipped · ${stats.failed} failed\n`);

if (failures.length) {
  console.log('  Failures:');
  failures.forEach((f) =>
    console.log(`    • ${f.row.retailer_id} product ${f.row.product_id} — ${f.error}`)
  );
  console.log();
}

// Shut down the Playwright browser if it was opened. Otherwise the Node
// process hangs waiting for the browser handle to close.
await closeBrowser();
