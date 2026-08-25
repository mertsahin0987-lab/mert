import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: products } = await sb.from('products').select('id, name, brand_id, category, base_price, upcoming_release');
const { data: prices } = await sb.from('prices').select('product_id, retailer_id');
const { data: brands } = await sb.from('brands').select('id, name');
const bn = Object.fromEntries(brands.map(b => [b.id, b.name]));

const counts = new Map();
const retailersByProd = new Map();
for (const p of prices) {
  counts.set(p.product_id, (counts.get(p.product_id) || 0) + 1);
  const s = retailersByProd.get(p.product_id) || new Set();
  s.add(p.retailer_id);
  retailersByProd.set(p.product_id, s);
}

const singles = products.filter(p => !p.upcoming_release && counts.get(p.id) === 1);

const SHOPIFY = {
  'salons-direct':  'www.salonsdirect.com',
  'mcr-barber':     'mcrbarbersupplies.co.uk',
  'eson-direct':    'esondirect.co.uk',
  'barber-beauty':  'barberbeautysupply.uk',
  'jrl-direct':     'jrluk.co.uk',
};

const STOP = new Set(['the','and','for','with','pro','from','plus','of','x','5','star','hair','professional']);
const toks = s => new Set((s.toLowerCase().match(/[a-z0-9+]+/g) || []).filter(t => t.length > 1 && !STOP.has(t)));
const jaccard = (a,b) => { if (a.size===0||b.size===0) return 0; const inter=[...a].filter(t=>b.has(t)).length; return inter/(new Set([...a,...b]).size); };

async function shopifySearch(host, q) {
  try {
    const r = await fetch(`https://${host}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=5`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.resources?.results?.products || []).map(p => ({ title: p.title, url: `https://${host}${(p.url || '').replace(/\?.*$/,'')}`, price: p.price }));
  } catch { return []; }
}

function variants(brand, name) {
  const clean = name.replace(/[™®©]/g,'').trim();
  const tokens = clean.toLowerCase().split(/\s+/).filter(t => t.length>1);
  const out = new Set();
  out.add(`${brand} ${clean}`);
  out.add(clean);
  out.add(clean.replace(/\s*\b(kit|combo|set|collection|bundle)s?\b\s*$/i, '').trim());
  if (tokens.length >= 3) out.add(`${brand} ${tokens.slice(0,3).join(' ')}`);
  return [...out].filter(v => v.length > 3);
}

function inferCategory(text) {
  const t = text.toLowerCase();
  if (/\btrimmer\b/.test(t)) return 'Trimmers';
  if (/\bshaver\b|\bfoil\b/.test(t)) return 'Shavers';
  if (/\bclipper\b/.test(t)) return 'Clippers';
  return null;
}

const COLOURS = ['gold','black','white','red','blue','silver','matte','rose','onyx','ghost','green','yellow','orange','pink','sand','camo','grey'];
function colourMismatch(srcName, hitTitle) {
  const sn = srcName.toLowerCase(), ht = hitTitle.toLowerCase();
  const src = COLOURS.filter(c => sn.includes(c));
  if (src.length === 0) return false;
  for (const c of src) if (!ht.includes(c)) return true;
  return false;
}

const candidates = [];
console.log(`Scanning ${singles.length} single-retailer products across ${Object.keys(SHOPIFY).length} Shopify retailers…`);
let n = 0;
for (const p of singles) {
  const brand = bn[p.brand_id] || '';
  const alreadyOn = retailersByProd.get(p.id) || new Set();
  const pTok = toks(`${brand} ${p.name}`);
  const queries = variants(brand, p.name);
  for (const [rid, host] of Object.entries(SHOPIFY)) {
    if (alreadyOn.has(rid)) continue;
    let best = null;
    for (const q of queries) {
      const hits = await shopifySearch(host, q);
      for (const h of hits) {
        const hCat = inferCategory(h.title);
        if (hCat && p.category !== 'Shavers' && hCat !== p.category) continue;
        if (colourMismatch(p.name, h.title)) continue;
        const score = jaccard(pTok, toks(h.title));
        if (!best || score > best.score) best = { ...h, score };
      }
    }
    if (best && best.score >= 0.65) {
      candidates.push({
        product_id: p.id, name: p.name, brand, category: p.category, base_price: p.base_price,
        retailer: rid, hit_title: best.title, hit_url: best.url, hit_price: best.price, score: best.score,
      });
    }
  }
  n++;
  if (n % 20 === 0) console.log(`  scanned ${n}/${singles.length}  — ${candidates.length} candidates so far`);
}
console.log(`\nDone — ${candidates.length} candidates`);
writeFileSync('/tmp/more-candidates.json', JSON.stringify(candidates, null, 2));

const HIGH = candidates.filter(c => c.score >= 0.80);
console.log(`\nHigh confidence (sim ≥ 0.80): ${HIGH.length}`);
for (const c of HIGH.sort((a,b)=>b.score-a.score)) {
  console.log(`  #${c.product_id.padEnd(4)} sim=${c.score.toFixed(2)} ${c.retailer.padEnd(14)} £${c.hit_price||'?'}  ${c.hit_title.slice(0,55)}`);
  console.log(`     ${c.hit_url}`);
}
