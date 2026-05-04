#!/usr/bin/env node
/**
 * Inject affiliate tracking tags into existing retailer URLs in the DB.
 *
 * Currently handles:
 *   - Amazon UK: appends ?tag=clipprr-21 (or replaces existing tag)
 *
 * Future: Awin tracking (deeplinks via dl/g.aspx?id=...) once we have
 *         an Awin publisher ID and per-merchant offer IDs.
 *
 * Run:    node scripts/inject-affiliate-tags.mjs            # dry-run
 *         node scripts/inject-affiliate-tags.mjs --fix      # write changes
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://xgoiabfbetftjomtvcgb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const FIX = process.argv.includes('--fix');
const AMAZON_TAG = 'clipprr-21';

/**
 * Add or replace `tag=` in any amazon.co.uk URL.
 * Idempotent — running it twice is safe.
 */
function tagAmazonUrl(url) {
  if (!url) return url;
  let u;
  try { u = new URL(url); } catch { return url; }
  if (!/(^|\.)amazon\.co\.uk$/i.test(u.hostname)) return url;
  u.searchParams.set('tag', AMAZON_TAG);
  return u.toString();
}

console.log('\n🔗 Injecting Amazon affiliate tag (' + AMAZON_TAG + ')\n');
if (!FIX) console.log('  --dry-run mode (use --fix to write)\n');

const { data: rows, error } = await supabase
  .from('prices')
  .select('product_id, retailer_id, url')
  .eq('retailer_id', 'amazon-uk')
  .not('url', 'is', null);

if (error) { console.error('✗', error.message); process.exit(1); }

let changed = 0, unchanged = 0;
for (const row of rows) {
  const newUrl = tagAmazonUrl(row.url);
  if (newUrl === row.url) { unchanged++; continue; }
  console.log(`  product ${row.product_id}`);
  console.log(`    OLD: ${row.url}`);
  console.log(`    NEW: ${newUrl}`);
  if (FIX) {
    const { error: upErr } = await supabase
      .from('prices')
      .update({ url: newUrl })
      .eq('product_id', row.product_id)
      .eq('retailer_id', 'amazon-uk');
    if (upErr) console.log(`    ✗ ${upErr.message}`);
  }
  changed++;
}

console.log(`\n  ${changed} URL(s) updated · ${unchanged} already correct\n`);
