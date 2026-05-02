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

const BRANDS = [
  { slug: 'wahl',          dbName: 'Wahl' },
  { slug: 'babyliss-pro',  dbName: 'BaByliss PRO' },
  { slug: 'andis',         dbName: 'Andis' },
  { slug: 'jrl',           dbName: 'JRL' },
  { slug: 'stylecraft',    dbName: 'StyleCraft' },
];

// ============================================================================
// Filtering — keep only "real" barber tools, drop accessories/spares/grooming
// ============================================================================

// Keywords that mean "this IS a tool we want"
const KEEP_KEYWORDS = /(clipper|trimmer|shaver|foil)/i;

// Keywords that mean "this is NOT a tool we want" (overrides KEEP).
// Anything containing these words is dropped even if it also matches KEEP.
const REJECT_KEYWORDS = new RegExp(
  '(' + [
    'replacement', 'spare', 'cam follower', 'fade blade', 'taper blade',
    'standard blade', 'travel blade', 'attachment', 'charging? (stand|station|cord|cable|dock|lead)',
    'adapt', 'battery', 'case', 'bag', 'comb', 'guide', 'guard',
    'lubricant', 'oil( spray)?', 'coolant', 'disinfect',
    'brush', 'hair[-\\s]?dryer', 'dryer', 'curling', 'straightener', 'wand',
    'cape', 'chair', 'trolley', 'cabinet', 'mirror', 'sign', 'drawer',
    'pet', 'dog', 'beard', 'nose', 'ear', 'pubic', 'body groomer',
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

async function getBrandCatalogue(slug) {
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

    // Price — usually in aria-label of the link, or in a price element
    const priceText =
      a.attr('aria-label') ||
      $(el).find('[class*="price"]').first().text().trim() ||
      '';
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

console.log('\n📦 Coolblades catalogue importer\n');
if (DRY_RUN) console.log('  (dry-run mode — no DB writes)\n');

const brandsToProcess = BRAND_FILTER
  ? BRANDS.filter((b) => b.slug === BRAND_FILTER)
  : BRANDS;

const stats = { scraped: 0, kept: 0, skipped: 0, new: 0, dup: 0, errors: 0 };

for (const brand of brandsToProcess) {
  console.log(`\n=== ${brand.dbName} ===`);
  let brandId = null;
  if (!DRY_RUN) brandId = await ensureBrand(brand.dbName);

  let products;
  try {
    products = await getBrandCatalogue(brand.slug);
  } catch (e) {
    log.warn(`Brand fetch failed: ${e.message}`);
    continue;
  }
  log.info(`  ${products.length} products on page`);
  stats.scraped += products.length;

  for (const p of products) {
    if (!shouldKeep(p.name, p.price)) {
      stats.skipped++;
      continue;
    }
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
        productId, retailerId: 'coolblades',
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
}

console.log('\n' + '─'.repeat(50));
console.log(
  `  ${stats.scraped} products scraped · ${stats.kept} matched filters · ${stats.skipped} filtered out`
);
console.log(
  `  ${stats.new} NEW products inserted · ${stats.dup} already existed · ${stats.errors} errors\n`
);
