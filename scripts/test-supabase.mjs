#!/usr/bin/env node
/**
 * Quick sanity check that Supabase is wired up and has data.
 * Run with: node scripts/test-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xgoiabfbetftjomtvcgb.supabase.co',
  'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1'
);

console.log('🔍 Testing Supabase connection...\n');

const checks = [
  ['brands', 'id, name'],
  ['retailers', 'id, name'],
  ['products', 'id, name, brand_id, base_price'],
  ['prices', 'product_id, retailer_id, price'],
  ['product_colors', 'product_id, name, hex'],
];

let allOk = true;

for (const [table, cols] of checks) {
  const { data, error, count } = await supabase
    .from(table)
    .select(cols, { count: 'exact' })
    .limit(2);

  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
    allOk = false;
    continue;
  }

  console.log(`✓ ${table.padEnd(16)} ${count} rows`);
}

// Confirm the joined-prices query the app actually runs returns the shape we expect
console.log('\n🔗 Testing the joined query the app uses (prices + retailers)...');
const joined = await supabase
  .from('prices')
  .select('product_id, retailer_id, price, url, in_stock, retailers(name)')
  .limit(1);

if (joined.error) {
  console.log(`❌ joined query: ${joined.error.message}`);
  allOk = false;
} else {
  console.log('   sample row:', JSON.stringify(joined.data[0], null, 2));
  const r = joined.data[0]?.retailers;
  if (Array.isArray(r)) {
    console.log('   ⚠  retailers came back as ARRAY — DataContext mapping needs r[0].name');
  } else if (r && typeof r === 'object') {
    console.log('   ✓ retailers came back as OBJECT — DataContext mapping is correct');
  }
}

if (allOk) {
  console.log('\n🎉 Supabase is live and populated.\n');
} else {
  process.exit(1);
}
