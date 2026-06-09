#!/usr/bin/env node
/**
 * Cross-matches our products against every Shopify retailer's full catalogue
 * and inserts any retailer URLs we don't already have. Wider net than the
 * brand-by-brand import — paginates through /products.json and tries every
 * product name against our DB.
 *
 * Run:
 *   node --env-file=.env scripts/cross-match-retailers.mjs --dry-run
 *   node --env-file=.env scripts/cross-match-retailers.mjs
 */

import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dryRun = process.argv.includes('--dry-run');

const RETAILERS = [
  { id: 'barber-beauty',  host: 'barberbeautysupply.uk' },
  { id: 'mcr-barber',     host: 'mcrbarbersupplies.co.uk' },
  { id: 'eson-direct',    host: 'esondirect.co.uk' },
  { id: 'jrl-direct',     host: 'jrluk.co.uk' },
  { id: 'salons-direct',  host: 'www.salonsdirect.com' },
];

const KEEP = /(clipper|trimmer|shaver|foil)/i;
const SKIP = /\b(blade|guard|cape|oil|cleaner|spray|brush|stand|charger|battery|attachment|cord|comb|set of|kit\s*-\s*blade|replacement|cover|case|holder|hook|wire)/i;

/** Normalise a product title for fuzzy matching. */
function normalise(s) {
  return s
    .toLowerCase()
    .replace(/[™®]/g, '')   // ™ ®
    .replace(/\([^)]*\)/g, ' ')        // (Black) etc
    .replace(/[-_/]/g, ' ')
    .replace(/\b(the|new|cordless|professional|pro|barber|hair|men's|by gamma più|gamma\+|gamma plus|babylisspro|babyliss pro)\b/g, ' ')
    .replace(/[^\w\s+]/g, ' ')         // drop punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  return new Set(normalise(s).split(' ').filter((t) => t.length > 1));
}

/** Jaccard similarity 0..1 — overlap / union. Cheap fuzzy. */
function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function fetchAllProducts(host) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`https://${host}/products.json?limit=250&page=${page}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) break;
    const data = await res.json();
    const products = data?.products ?? [];
    if (!products.length) break;
    for (const p of products) {
      const title = p.title ?? '';
      if (!KEEP.test(title)) continue;
      if (SKIP.test(title)) continue;
      all.push({
        title,
        url: `https://${host}/products/${p.handle}`,
        vendor: p.vendor ?? null,
      });
    }
    if (products.length < 250) break;
  }
  return all;
}

async function main() {
  console.log('Loading our catalogue...');
  const { data: products } = await sb
    .from('products')
    .select('id, name, brands(name)');
  const { data: prices } = await sb.from('prices').select('product_id, retailer_id');

  const haveRetailer = new Map(); // product_id → Set of retailer_ids
  for (const p of prices) {
    if (!haveRetailer.has(p.product_id)) haveRetailer.set(p.product_id, new Set());
    haveRetailer.get(p.product_id).add(p.retailer_id);
  }

  const ourProducts = products.map((p) => ({
    id: String(p.id),
    name: p.name,
    brand: p.brands?.name?.toLowerCase() ?? '',
  }));

  const insertions = [];

  for (const r of RETAILERS) {
    process.stdout.write(`\n→ ${r.id} (${r.host}): `);
    let theirProducts;
    try {
      theirProducts = await fetchAllProducts(r.host);
    } catch (e) {
      console.log(`fetch failed (${e.message})`);
      continue;
    }
    console.log(`${theirProducts.length} candidates`);

    for (const ours of ourProducts) {
      if (haveRetailer.get(ours.id)?.has(r.id)) continue; // already have it

      let best = { score: 0, theirs: null };
      for (const theirs of theirProducts) {
        // Brand prefilter: their vendor / title should share at least one
        // brand word with ours, or we'll match wildly across brands.
        if (ours.brand && theirs.vendor) {
          const bv = theirs.vendor.toLowerCase();
          const ob = ours.brand;
          const shared =
            bv.includes(ob) ||
            ob.includes(bv) ||
            (ob.split(/\s+/).some((w) => bv.includes(w)) && ob.length > 2);
          if (!shared) continue;
        }
        const s = similarity(ours.name, theirs.title);
        if (s > best.score) best = { score: s, theirs };
      }

      // High-bar threshold. Below ~0.75, Wahl's huge family of "5 Star
      // <model> Clipper" SKUs produces massive false positives (Kuno → Pilot,
      // Vapor → Legend). 0.78+ matches feel reliable in practice; we
      // additionally require that any "X" / "2.0" / "metal" suffix on either
      // side is present on the other too — those are real product variants
      // not synonyms.
      const significantSuffixes = ['x', '2.0', 'metal', 'gold', 'rose gold'];
      const oursLower = ours.name.toLowerCase();
      const theirsLower = best.theirs?.title.toLowerCase() ?? '';
      const suffixMismatch = significantSuffixes.some((sfx) => {
        const o = oursLower.includes(` ${sfx}`) || oursLower.endsWith(sfx);
        const t = theirsLower.includes(` ${sfx}`) || theirsLower.endsWith(sfx);
        return o !== t;
      });
      if (best.score >= 0.78 && !suffixMismatch && best.theirs) {
        insertions.push({
          product_id: ours.id,
          retailer_id: r.id,
          url: best.theirs.url,
          ourName: ours.name,
          theirName: best.theirs.title,
          score: best.score,
        });
      }
    }
  }

  console.log(`\n\n${insertions.length} potential new retailer URLs found:\n`);
  for (const i of insertions.slice(0, 50)) {
    console.log(
      `  [${i.retailer_id}] ${i.ourName.slice(0, 40).padEnd(40)} → ${i.theirName.slice(0, 40)} (${i.score.toFixed(2)})`,
    );
  }
  if (insertions.length > 50) console.log(`  ... and ${insertions.length - 50} more`);

  if (dryRun || insertions.length === 0) {
    console.log(`\n(dry-run) ${insertions.length} matches found — re-run without --dry-run to insert.`);
    return;
  }

  console.log(`\nInserting ${insertions.length} rows...`);
  const rows = insertions.map((i) => ({
    product_id: i.product_id,
    retailer_id: i.retailer_id,
    price: 0,
    currency: 'GBP',
    in_stock: true,
    url: i.url,
  }));
  const r = await sb.from('prices').insert(rows);
  console.log('Insert:', r.error ?? 'ok');
}

main().catch((e) => { console.error(e); process.exit(1); });
