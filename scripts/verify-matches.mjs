#!/usr/bin/env node
/**
 * Verify every retailer URL in the DB still points at the right product.
 *
 * For each (product, retailer, url) row:
 *   1. Scrape the URL to get the current live price.
 *   2. Compare to the product's base_price (the canonical expected price).
 *   3. Flag as suspect if the scraped price differs by more than ±50%.
 *      (e.g. base £150, scraped £25 = wrong product or replacement part)
 *   4. With --fix, clear the URL + reset price for suspect rows.
 *
 * Run:    node scripts/verify-matches.mjs              # dry — just report
 *         node scripts/verify-matches.mjs --fix        # clear suspect rows
 *         node scripts/verify-matches.mjs --retailer=coolblades  # one retailer
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
import { closeBrowser } from './scrapers/_browser.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://xgoiabfbetftjomtvcgb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const FIX = !!args.fix;
const RETAILER = args.retailer || null;

const SCRAPERS = [coolblades, salonsdirect, tomb45, chrisandsons, jrl, amazon];

function findScraper(url) {
  if (!url) return null;
  try { return SCRAPERS.find((s) => s.matchesDomain(url)) ?? null; } catch { return null; }
}

console.log('\n🔍 Verifying retailer URL → product matches\n');
if (FIX) console.log('  --fix mode: suspect rows will be CLEARED\n');

// Pull every row that has a URL
let q = supabase
  .from('prices')
  .select('product_id, retailer_id, price, url, products!inner(name, base_price)')
  .not('url', 'is', null)
  .neq('url', '');
if (RETAILER) q = q.eq('retailer_id', RETAILER);

const { data: rows, error } = await q;
if (error) { console.error('✗', error.message); process.exit(1); }

console.log(`  ${rows.length} rows to check\n`);

const flagged = [];
let checked = 0, ok = 0, skipped = 0, errors = 0;

for (const row of rows) {
  const scraper = findScraper(row.url);
  if (!scraper) { skipped++; continue; }

  const productName = row.products.name;
  const expected = Number(row.products.base_price);
  let result;
  try {
    result = await scraper.scrape(row.url);
  } catch (e) {
    errors++;
    // Don't flag — just couldn't scrape (404, captcha, etc)
    process.stdout.write('.');
    await sleep(scraper === chrisandsons || scraper === amazon ? 2500 : 600);
    continue;
  }
  checked++;

  // Suspect if scraped price differs from base_price by more than 50%
  const ratio = expected > 0 ? result.price / expected : 1;
  const isSuspect = ratio < 0.5 || ratio > 2.0;

  if (isSuspect) {
    flagged.push({
      product_id: row.product_id,
      retailer_id: row.retailer_id,
      product_name: productName,
      base_price: expected,
      scraped_price: result.price,
      url: row.url,
      ratio: ratio.toFixed(2),
    });
    process.stdout.write('🚨');
  } else {
    ok++;
    process.stdout.write('✓');
  }

  // Throttle (longer for browser-based scrapers)
  const isBrowser = scraper === chrisandsons || scraper === amazon;
  await sleep(isBrowser ? 2500 : 600);
}

console.log('\n');
console.log('─'.repeat(60));
console.log(`  Checked: ${checked} · OK: ${ok} · Suspect: ${flagged.length} · Errors: ${errors} · Skipped (no scraper): ${skipped}\n`);

if (flagged.length) {
  console.log('🚨 SUSPECT MATCHES (scraped price doesn\'t match expected ±50%):\n');
  flagged.forEach((f) => {
    console.log(`  product ${f.product_id} (${f.product_name}) @ ${f.retailer_id}`);
    console.log(`    expected ~£${f.base_price.toFixed(2)} but URL returned £${f.scraped_price.toFixed(2)} (ratio ${f.ratio})`);
    console.log(`    ${f.url}`);
    console.log();
  });

  if (FIX) {
    console.log('🛠  Clearing flagged URLs from prices table...');
    for (const f of flagged) {
      const { error } = await supabase
        .from('prices')
        .update({ url: null, price: f.base_price })
        .eq('product_id', f.product_id)
        .eq('retailer_id', f.retailer_id);
      if (error) console.log(`  ✗ ${f.product_id}/${f.retailer_id}: ${error.message}`);
      else       console.log(`  ✓ Cleared ${f.product_id}/${f.retailer_id}`);
    }
    console.log();
  } else {
    console.log('Re-run with --fix to clear these.\n');
  }
}

await closeBrowser();
