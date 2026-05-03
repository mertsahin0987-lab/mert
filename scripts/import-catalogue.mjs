#!/usr/bin/env node
/**
 * Catalogue importer — bulk-loads barber tools into Supabase from Coolblades.
 *
 * For each brand we hit https://coolblades.co.uk/<brand-slug>/?limit=200,
 * which returns ALL of that brand's products on one page (Coolblades runs on
 * BigCommerce, ?limit=200 is a stencil URL parameter).
 *
 * From each product card we extract: name, url, image, price.
 * We then filter out replacement parts, accessories, and grooming products
 * (we only want the actual clipping tools — clippers, trimmers, shavers).
 *
 * Run:    node scripts/import-catalogue.mjs                # all brands
 *         node scripts/import-catalogue.mjs --brand=wahl   # one brand
 *         node scripts/import-catalogue.mjs --dry-run      # no DB writes
 */

import 'dotenv/config';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { fetchHtml, parsePrice, log } from './scrapers/_lib.mjs';

// ============================================================================
// Setup
// ============================================================================

const URL = process.env.SUPABASE_URL || 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('paste-your-secret-key-here')) {
  console.error('✗ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const DRY_RUN = !!args['dry-run'];
const BRAND_FILTER = args.brand || null;

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ============================================================================
// Brand list — Coolblades slug → our DB brand name
// ============================================================================

// Per-retailer config. Each entry tells us how to walk that retailer's catalogue.
// Coolblades (BigCommerce) has /<slug>/ pages we scrape via HTML.
// Salons Direct (Shopify) has /collections/<slug>/products.json — clean JSON.
const RETAILERS = {
  coolblades: {
    retailerId: 'coolblades',
    type: 'bigcommerce',
    brands: [
      { slug: 'wahl',          dbName: 'Wahl' },
      { slug: 'babyliss-pro',  dbName: 'BaByliss PRO' },
      { slug: 'andis',         dbName: 'Andis' },
      { slug: 'jrl',           dbName: 'JRL' },
      { slug: 'stylecraft',    dbName: 'StyleCraft' },
    ],
  },
  'salons-direct': {
    retailerId: 'salons-direct',
    type: 'shopify',
    brands: [
      { slug: 'wahl-clippers-trimmers',          dbName: 'Wahl' },
      { slug: 'babyliss-pro-clippers-trimmers',  dbName: 'BaByliss PRO' },
      { slug: 'andis',                            dbName: 'Andis' },
    ],
  },
};

// Backwards-compatibility for the old --brand=<slug> CLI flag (Coolblades only)
const BRANDS = RETAILERS.coolblades.brands;

// ============================================================================
// Filtering — keep only "real" barber tools, drop accessories/spares/grooming
// ============================================================================

// Keywords that mean "this IS a tool we want"
const KEEP_KEYWORDS = /(clipper|trimmer|shaver|foil)/i;

// Keywords that mean "this is NOT a tool we want" (overrides KEEP).
// Word-boundaries (\b) so "brush" doesn't match "brushless", "guard" doesn't
// match real product names containing it, etc. SKU regex requires a digit so
// "(Black)" / "(Gold)" colour variants aren't blocked.
const REJECT_KEYWORDS = new RegExp(
  '(' + [
    '\\breplacement\\b', '\\bspare\\b', '\\battachment\\b',
    '\\bcam follower\\b', '\\bfade blade\\b', '\\btaper blade\\b',
    '\\bstandard blade\\b', '\\btravel blade\\b', '\\bfine blade\\b',
    '\\bchrome blade\\b', '\\bzero gap tool\\b', '\\bgap tool\\b',
    '\\bclipper blades?\\b', '\\btrimmer blades?\\b',
    '\\bcharging? (stand|station|base|cord|cable|dock|lead)\\b',
    '\\bcharge stand\\b',
    '\\badapt(?:er|or)?\\b', '\\bbattery\\b', '\\bcase\\b', '\\bbag\\b',
    '\\b(comb|guide)\\b', '\\bguard\\b',
    '\\blubricant\\b', '\\boil(?: spray)?\\b', '\\bcoolant\\b', '\\bdisinfect',
    '\\bbrush\\b', '\\bhair[-\\s]?dryer\\b', '\\bdryer\\b',
    '\\bcurling\\b', '\\bstraightener\\b', '\\bwand\\b',
    '\\bcape\\b', '\\bchair\\b', '\\btrolley\\b', '\\bcabinet\\b',
    '\\bmirror\\b', '\\bsign\\b', '\\bdrawer\\b',
    '\\bpet\\b', '\\bdog\\b', '\\bbeard\\b', '\\bnose\\b',
    '\\bear trimmer\\b', '\\bpubic\\b', '\\bbody groomer\\b',
    // SKU-style — needs at least one digit
    '\\(#?[A-Z0-9]*\\d[A-Z0-9-]*\\)',
  ].join('|') + ')',
  'i'
);

// Map the product name to a category our app understands
function classify(name) {
  const n = name.toLowerCase();
  if (/foil|shaver/.test(n)) return 'Shavers';
  if (/trimmer/.test(n)) return 'Trimmers';
  if (/clipper/.test(n)) return 'Clippers';
  return 'Clippers'; // sensible default for skeleton/fade-style tools
}

function shouldKeep(name, price) {
  if (!KEEP_KEYWORDS.test(name)) return false;
  if (REJECT_KEYWORDS.test(name)) return false;
  // Anything below £30 is almost certainly an accessory or replacement part
  if (price != null && price < 30) return false;
  return true;
}

// ============================================================================
// Scrape a brand catalogue page
// ============================================================================

// Salons Direct (Shopify) — uses Shopify's standard products.json endpoint
async function getShopifyCollection(host, collectionSlug) {
  log.info(`Fetching ${host}/collections/${collectionSlug}/products.json`);
  const products = [];
  for (let page = 1; page <= 5; page++) {
    const url = `https://${host}/collections/${collectionSlug}/products.json?limit=250&page=${page}`;
    const text = await fetchHtml(url);
    const data = JSON.parse(text);
    const batch = data.products ?? [];
    if (!batch.length) break;
    for (const p of batch) {
      const variant = p.variants?.[0];
      const price = parsePrice(variant?.price);
      const imageUrl = (p.images?.[0]?.src ?? '').split('?')[0];
      products.push({
        name: p.title,
        url: `https://${host}/products/${p.handle}`,
        imageUrl,
        price,
      });
    }
    if (batch.length < 250) break;
  }
  return products;
}

async function getCoolbladesBrand(slug) {
  const url = `https://www.coolblades.co.uk/${slug}/?limit=200`;
  log.info(`Fetching /${slug}/?limit=200`);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const products = [];
  const seenUrls = new Set();
  $('article').each((_, el) => {
    const a = $(el).find('a.card-figure__link, a').first();
    let href = (a.attr('href') || '').split('?')[0];
    if (!href.includes('coolblades.co.uk')) return;
    if (seenUrls.has(href)) return;
    seenUrls.add(href);

    const name =
      $(el).find('.card-title, h2, h3, h4').first().text().trim() ||
      a.attr('aria-label')?.split(',')[0].trim() ||
      '';
    if (!name) return;

    // Image — prefer high-res from srcset
    const img = $(el).find('img').first();
    let imageUrl = img.attr('data-src') || img.attr('src') || '';
    const srcset = img.attr('srcset') || '';
    if (srcset) {
      const widest = srcset.split(',')
        .map((s) => s.trim().split(' '))
        .map(([url, w]) => ({ url, w: parseInt(w) || 0 }))
        .sort((a, b) => b.w - a.w)[0];
      if (widest?.url) imageUrl = widest.url;
    }
    // Coolblades sometimes serves placeholder images — replace with no-img marker
    if (/no_image|placeholder/i.test(imageUrl)) imageUrl = '';
    // Upgrade BigCommerce CDN URLs to HD (1280x1280) — the listing page serves
    // thumbnails by default but the same CDN endpoint serves any size.
    imageUrl = imageUrl.replace(/\/stencil\/[^/]+\//, '/stencil/1280x1280/');

    // Price — look for the actual price element first. The aria-label often
    // contains SKU numbers (e.g. "BAB825U") that parsePrice would misread as
    // £825. Only fall back to aria-label if no price element exists, and even
    // then strip out the SKU pattern first.
    const priceEl = $(el).find('.price, [class*="price"], [data-test-info-type="price"]').first().text().trim();
    let priceText = priceEl;
    if (!priceText) {
      const ariaLabel = a.attr('aria-label') || '';
      // Aria labels look like: "Wahl Senior Clipper, Price range from £83 to £100"
      // or "Babyliss BAB825U, £35.99". Pull just the £-prefixed part.
      const m = ariaLabel.match(/£\s*\d[\d,.]*/);
      priceText = m ? m[0] : '';
    }
    const price = parsePrice(priceText);

    products.push({ name, url: href, imageUrl, price });
  });

  return products;
}

// ============================================================================
// Supabase writes
// ============================================================================

async function ensureBrand(name) {
  const { data: existing } = await supabase
    .from('brands').select('id').eq('name', name).limit(1);
  if (existing?.length) return existing[0].id;
  const { data: maxRow } = await supabase
    .from('brands').select('id').order('id', { ascending: false }).limit(1);
  const nextId = String((parseInt(maxRow?.[0]?.id ?? '0') || 0) + 1);
  const { error } = await supabase.from('brands')
    .insert({ id: nextId, name, logo_key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
  if (error) throw new Error(`brand insert failed: ${error.message}`);
  return nextId;
}

let _nextId = null;
async function reserveProductId() {
  if (_nextId == null) {
    const { data } = await supabase.from('products').select('id');
    let max = 0;
    for (const r of data ?? []) {
      const n = parseInt(r.id);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    _nextId = max + 1;
  }
  return String(_nextId++);
}

async function insertProduct({ brandId, name, category, imageUrl, price }) {
  // Dedup by (brand_id, name)
  const { data: existing } = await supabase
    .from('products')
    .select('id, name')
    .eq('brand_id', brandId)
    .ilike('name', name);
  if (existing?.length) return { productId: existing[0].id, isNew: false };

  const id = await reserveProductId();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const { error } = await supabase.from('products').insert({
    id, name, brand_id: brandId, category,
    image_key: slug,
    image_url: imageUrl || null,
    base_price: price ?? 0,
    is_new: false, trending: false, upcoming_release: false,
  });
  if (error) throw new Error(`product insert failed (${name}): ${error.message}`);
  return { productId: id, isNew: true };
}

async function upsertPrice({ productId, retailerId, price, url, inStock }) {
  const { error } = await supabase
    .from('prices')
    .upsert(
      {
        product_id: productId, retailer_id: retailerId,
        price: price ?? 0, url, in_stock: inStock, currency: 'GBP',
      },
      { onConflict: 'product_id,retailer_id' }
    );
  if (error) throw new Error(`price upsert failed: ${error.message}`);
}

// ============================================================================
// Main
// ============================================================================

const RETAILER_FILTER = args.retailer || null;

console.log('\n📦 Catalogue importer\n');
if (DRY_RUN) console.log('  (dry-run mode — no DB writes)\n');

const stats = { scraped: 0, kept: 0, skipped: 0, new: 0, dup: 0, errors: 0 };

const retailersToProcess = RETAILER_FILTER
  ? [[RETAILER_FILTER, RETAILERS[RETAILER_FILTER]]].filter(([_, v]) => v)
  : Object.entries(RETAILERS);

for (const [retailerName, cfg] of retailersToProcess) {
  console.log(`\n━━━━━━━━━━ ${retailerName.toUpperCase()} ━━━━━━━━━━`);

  for (const brand of cfg.brands) {
    if (BRAND_FILTER && brand.slug !== BRAND_FILTER) continue;
    console.log(`\n=== ${brand.dbName} (${retailerName}) ===`);
    let brandId = null;
    if (!DRY_RUN) brandId = await ensureBrand(brand.dbName);

    let products;
    try {
      if (cfg.type === 'shopify') {
        const host = retailerName === 'salons-direct' ? 'www.salonsdirect.com' : null;
        if (!host) throw new Error('No shopify host mapped for ' + retailerName);
        products = await getShopifyCollection(host, brand.slug);
      } else {
        products = await getCoolbladesBrand(brand.slug);
      }
    } catch (e) {
      log.warn(`Brand fetch failed: ${e.message}`);
      continue;
    }
    log.info(`  ${products.length} products on page`);
    stats.scraped += products.length;

    for (const p of products) {
      if (!shouldKeep(p.name, p.price)) { stats.skipped++; continue; }
      stats.kept++;
      const category = classify(p.name);

      if (DRY_RUN) {
        console.log(`    + [${category}] ${p.name}  £${p.price?.toFixed(2) ?? '?'}`);
        stats.new++;
        continue;
      }

      try {
        const { productId, isNew } = await insertProduct({
          brandId, name: p.name, category, imageUrl: p.imageUrl, price: p.price,
        });
        await upsertPrice({
          productId, retailerId: cfg.retailerId,
          price: p.price, url: p.url, inStock: true,
        });
        if (isNew) {
          stats.new++;
          console.log(`    + [${category}] ${p.name}  £${p.price?.toFixed(2) ?? '?'}`);
        } else {
          stats.dup++;
        }
      } catch (e) {
        stats.errors++;
        console.log(`    ✗ ${p.name} — ${e.message}`);
      }
    }
  } // end brand loop
} // end retailer loop

console.log('\n' + '─'.repeat(50));
console.log(
  `  ${stats.scraped} products scraped · ${stats.kept} matched filters · ${stats.skipped} filtered out`
);
console.log(
  `  ${stats.new} NEW products inserted · ${stats.dup} already existed · ${stats.errors} errors\n`
);
