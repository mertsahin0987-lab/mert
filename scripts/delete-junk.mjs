#!/usr/bin/env node
/**
 * Delete junk products from the catalogue.
 *
 * "Junk" = anything matching the catalogue importer's REJECT regex (charging
 * bases, fine blades, zero-gap tools, etc.) OR products where base_price is
 * suspiciously high (almost certainly a SKU-as-price import bug).
 *
 * Run:    node scripts/delete-junk.mjs            # dry-run, just lists
 *         node scripts/delete-junk.mjs --fix      # actually deletes
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://xgoiabfbetftjomtvcgb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const FIX = !!process.argv.find((a) => a === '--fix');

// Conservative — only flag OBVIOUS junk imports, not user's curated products.
// Word-boundaries (\b) prevent "brushless" matching "brush", etc.
const REJECT_KEYWORDS = new RegExp(
  '(' + [
    // Charging/power accessories
    '\\bcharging? (stand|station|base|cord|cable|dock|lead)\\b',
    '\\bcharge stand\\b',
    // Replacement parts
    '\\breplacement\\b', '\\bspare\\b',
    '\\bcam follower\\b', '\\bfade blade\\b', '\\btaper blade\\b',
    '\\bstandard blade\\b', '\\btravel blade\\b', '\\bfine blade\\b',
    '\\bchrome blade\\b', '\\bzero gap tool\\b', '\\bgap tool\\b',
    '\\bclipper blades?\\b', '\\btrimmer blades?\\b',
    // SKU-style names — REQUIRE at least one digit so "(Black)" doesn't trigger.
    // Matches (BAB825U), (1006-400), (#62280), (2092-100), but NOT (Black), (Gold).
    '\\(#?[A-Z0-9]*\\d[A-Z0-9-]*\\)',
  ].join('|') + ')',
  'i'
);

// Real high-end barber gear caps out around £600 (JRL Lamborghini, BaByliss
// Super Motor Collection). Anything higher is almost certainly a SKU-as-price
// bug.
const SUSPICIOUS_PRICE_THRESHOLD = 600;

console.log('\n🗑  Junk-product cleanup\n');
if (!FIX) console.log('  --dry-run mode — no rows will be deleted (use --fix to actually delete)\n');

const { data: products, error } = await supabase
  .from('products')
  .select('id, name, base_price, brand_id');
if (error) { console.error('✗', error.message); process.exit(1); }

console.log(`  Scanning ${products.length} products...\n`);

// Original products (IDs 1-41) were curated by hand — never auto-delete them
// even if they happen to match our heuristics. The Lamborghini kit is the
// classic example: legitimately £999, would be flagged otherwise.
const ORIGINAL_PRODUCT_MAX = 41;

const flagged = [];
for (const p of products) {
  const numericId = parseInt(p.id);
  if (Number.isFinite(numericId) && numericId <= ORIGINAL_PRODUCT_MAX) continue;

  const reasons = [];
  if (REJECT_KEYWORDS.test(p.name)) reasons.push('matches REJECT regex');
  if (Number(p.base_price) > SUSPICIOUS_PRICE_THRESHOLD) {
    reasons.push(`absurd base_price £${p.base_price} (likely SKU-as-price bug)`);
  }
  if (reasons.length) flagged.push({ ...p, reasons });
}

if (!flagged.length) {
  console.log('✓ No junk products found — catalogue is clean!\n');
  process.exit(0);
}

console.log(`🚨 ${flagged.length} junk products:\n`);
flagged.forEach((p) => {
  console.log(`  ${p.id}: ${p.name}  £${p.base_price}`);
  console.log(`     reasons: ${p.reasons.join(', ')}`);
});
console.log();

if (!FIX) {
  console.log('Re-run with --fix to delete these (also clears their prices, colors, links).\n');
  process.exit(0);
}

console.log('🛠  Deleting flagged products + their prices/colors...');
let deleted = 0;
for (const p of flagged) {
  // prices, product_colors and product_links cascade via FK ON DELETE CASCADE
  const { error: dErr } = await supabase.from('products').delete().eq('id', p.id);
  if (dErr) console.log(`  ✗ ${p.id}: ${dErr.message}`);
  else { deleted++; console.log(`  ✓ deleted ${p.id} (${p.name.slice(0, 50)})`); }
}
console.log(`\n  ${deleted}/${flagged.length} products deleted.\n`);
