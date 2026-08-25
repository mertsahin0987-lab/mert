import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: products } = await sb.from('products').select('id, name, brand_id, category, base_price, upcoming_release');
const { data: prices } = await sb.from('prices').select('product_id, retailer_id');
const { data: brands } = await sb.from('brands').select('id, name');
const bn = Object.fromEntries(brands.map(b => [b.id, b.name]));

const counts = new Map();
for (const p of prices) counts.set(p.product_id, (counts.get(p.product_id) || 0) + 1);

const buckets = { zero: [], one: [], two: [], three: [], more: [] };
for (const p of products) {
  if (p.upcoming_release) continue;
  const n = counts.get(p.id) || 0;
  if (n === 0) buckets.zero.push(p);
  else if (n === 1) buckets.one.push(p);
  else if (n === 2) buckets.two.push(p);
  else if (n === 3) buckets.three.push(p);
  else buckets.more.push(p);
}

console.log(`Distribution across ${products.filter(p=>!p.upcoming_release).length} live products:`);
console.log(`  0 retailers: ${buckets.zero.length}`);
console.log(`  1 retailer:  ${buckets.one.length}  ← price comparison broken`);
console.log(`  2 retailers: ${buckets.two.length}`);
console.log(`  3 retailers: ${buckets.three.length}`);
console.log(`  4+ retailers: ${buckets.more.length}`);

console.log(`\n──── Only 1 retailer (${buckets.one.length}) ────`);
const byBrand = {};
for (const p of buckets.one) (byBrand[bn[p.brand_id] || '?'] ||= []).push(p);
for (const [b, arr] of Object.entries(byBrand).sort()) {
  console.log(`\n[${b}] ${arr.length}`);
  for (const p of arr.sort((a,b)=>Number(a.id)-Number(b.id))) {
    const r = prices.find(x => x.product_id === p.id);
    console.log(`  #${String(p.id).padStart(3)} [${p.category[0]}] £${String(p.base_price).padEnd(7)} ${p.name.slice(0,55).padEnd(55)} on ${r?.retailer_id}`);
  }
}

if (buckets.zero.length) {
  console.log(`\n──── 0 retailers (${buckets.zero.length}) — dead listings ────`);
  for (const p of buckets.zero) console.log(`  #${p.id}  ${p.name}`);
}
