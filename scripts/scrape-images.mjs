#!/usr/bin/env node
/**
 * Image scraper: pull product gallery images from retailer pages and save them
 * under web/public/products/<image_key>.png (plus -2.png, -3.png, ...).
 *
 * The Next.js product gallery (web/lib/product-images.ts) discovers gallery
 * angles by glob: `<image_key>.png`, `<image_key>-2.png`, `<image_key>-3.png`,
 * ..., so naming on disk drives the gallery — no DB changes needed once the
 * files are written.
 *
 * Sources, in order of preference:
 *   - Shopify (eson-direct, mcr-barber, barber-beauty, salons-direct, jrl-direct)
 *     → fetch `/products/<handle>.json`, read `product.images[].src`
 *   - Chris & Sons (Cloudflare-protected, Magento)
 *     → route through Playwright (`scripts/scrapers/_browser.mjs`) and parse
 *       the JSON-LD `image` field plus DOM gallery thumbnails
 *
 * Coolblades (BigCommerce) and Amazon UK are not handled here — they're
 * either not Cloudflare-blocked but use a different gallery structure (we
 * already have a separate path for Coolblades), or have anti-bot measures
 * that aren't worth fighting here (Amazon).
 *
 * Usage:
 *   node --env-file=.env scripts/scrape-images.mjs --all-missing  # all 22
 *   node --env-file=.env scripts/scrape-images.mjs --product=84   # single
 *   node --env-file=.env scripts/scrape-images.mjs --dry-run      # preview
 */

import { createClient } from '@supabase/supabase-js';
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { browserFetch, browserFetchBytes, closeBrowser } from './scrapers/_browser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DIR = join(__dirname, '..', 'web', 'public', 'products');
if (!existsSync(PRODUCTS_DIR)) mkdirSync(PRODUCTS_DIR, { recursive: true });

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const allMissing = argv.includes('--all-missing');
const productArg = argv.find((a) => a.startsWith('--product='));
const onlyProductId = productArg ? productArg.split('=')[1] : null;
const limitArg = argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SHOPIFY_RETAILERS = new Set([
  'eson-direct',
  'mcr-barber',
  'barber-beauty',
  'salons-direct',
  'jrl-direct',
]);

/**
 * Amazon UK: load via Playwright and pull image URLs out of the page.
 * Amazon embeds a JS object called colorImages that holds every gallery
 * angle. We grab the page HTML, regex the JSON out, and return the high-res
 * URLs from m.media-amazon.com (a public CDN — no Cloudflare in front).
 */
async function amazonImages(productUrl) {
  const html = await browserFetch(productUrl);

  // Hero image — og:image meta tag is the most reliable single image source.
  const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)/i);
  const hero = ogMatch ? ogMatch[1] : null;

  // Gallery — Amazon stuffs all the angles into a JS object called
  // colorImages.initial. Each entry has hiRes / large / mainUrl URLs.
  // Regex the JSON-ish block; full parse is brittle and version-specific.
  const urls = new Set();
  if (hero) urls.add(hero);
  const reHi = /"hiRes":"(https?:[^"]+)"/g;
  const reLg = /"large":"(https?:[^"]+)"/g;
  let m;
  while ((m = reHi.exec(html))) urls.add(m[1].replace(/\\u002F/g, '/'));
  // Fall back to "large" if no hiRes (some listings only have large)
  if (urls.size <= 1) {
    while ((m = reLg.exec(html))) urls.add(m[1].replace(/\\u002F/g, '/'));
  }
  return [...urls];
}

// ─────────────────────────────────────────────────────────────────────────────
// Image extraction by retailer

/** Shopify: fetch /products/<handle>.json and pull image src URLs. */
async function shopifyImages(productUrl) {
  const u = new URL(productUrl);
  const jsonUrl = u.origin + u.pathname.replace(/\/?$/, '') + '.json';
  const res = await fetch(jsonUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`Shopify JSON ${res.status} for ${jsonUrl}`);
  const data = await res.json();
  return (data?.product?.images ?? []).map((i) => i.src).filter(Boolean);
}

/** Chris & Sons: load via Playwright, extract images from JSON-LD + DOM. */
async function chrisAndSonsImages(productUrl) {
  const html = await browserFetch(productUrl);
  const $ = cheerio.load(html);

  const imageUrls = new Set();

  // 1) JSON-LD `image` field — usually the main hero image (sometimes array)
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const product = item?.['@type'] === 'Product' ? item :
          (Array.isArray(item?.['@graph']) ? item['@graph'].find((n) => n['@type'] === 'Product') : null);
        if (!product?.image) continue;
        const imgs = Array.isArray(product.image) ? product.image : [product.image];
        for (const i of imgs) imageUrls.add(i);
      }
    } catch {}
  });

  // 2) DOM fallback: the Magento media gallery embeds image URLs in JSON inside
  //    the `mage/gallery/gallery` script tag.
  const galleryScript = $('script[type="text/x-magento-init"]').filter((_, el) => {
    const t = $(el).contents().text();
    return t.includes('mage/gallery/gallery') || t.includes('"data":[');
  }).first().contents().text();

  if (galleryScript) {
    try {
      const data = JSON.parse(galleryScript);
      const walk = (n) => {
        if (!n || typeof n !== 'object') return;
        for (const [k, v] of Object.entries(n)) {
          if (k === 'data' && Array.isArray(v)) {
            for (const entry of v) {
              if (entry?.full) imageUrls.add(entry.full);
              if (entry?.img) imageUrls.add(entry.img);
            }
          }
          if (typeof v === 'object') walk(v);
        }
      };
      walk(data);
    } catch {}
  }

  // 3) Plain <img> in the product gallery as a last resort
  $('.fotorama__stage__shaft img, .gallery-placeholder img, .product.media img').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src');
    if (src && /\.(jpe?g|png|webp)/i.test(src)) imageUrls.add(src);
  });

  // Filter out Cloudflare challenge / tiny / placeholder images
  const filtered = [...imageUrls].filter((u) =>
    !/cloudflare|placeholder|loader\.svg|nopict/i.test(u) &&
    /^https?:\/\//.test(u)
  );

  // Dedupe by the image's actual filename (Magento serves the same image at
  // many cached sizes — /catalog/product/X.jpg, /cache/.../X.jpg, etc. all
  // point to the same picture). Keep the first occurrence of each basename,
  // preferring uncached versions (no `/cache/`) when both exist.
  const byBasename = new Map();
  // Pass 1: uncached URLs win.
  for (const u of filtered) {
    if (u.includes('/cache/')) continue;
    const base = u.split('/').pop();
    if (!byBasename.has(base)) byBasename.set(base, u);
  }
  // Pass 2: fall back to cached for any basename we haven't seen yet.
  for (const u of filtered) {
    const base = u.split('/').pop();
    if (!byBasename.has(base)) byBasename.set(base, u);
  }
  return [...byBasename.values()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Download

async function downloadImage(url, destPath, useBrowser = false, referer = null) {
  let buf;
  if (useBrowser) {
    // Route through Playwright context — needed for Cloudflare-protected CDNs.
    buf = await browserFetchBytes(url, { referer });
  } else {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  if (buf.length < 2000) throw new Error(`image suspiciously small (${buf.length} bytes)`);
  writeFileSync(destPath, buf);
  return buf.length;
}

function pickSourceUrl(prices) {
  // Prefer Shopify (fast), then C&S (Playwright), then Amazon (Playwright).
  const shopify = prices.find((p) => SHOPIFY_RETAILERS.has(p.retailer_id));
  if (shopify) return { url: shopify.url, source: 'shopify', retailer: shopify.retailer_id };
  const cs = prices.find((p) => p.retailer_id === 'chris-sons');
  if (cs) return { url: cs.url, source: 'chris-sons', retailer: 'chris-sons' };
  const amzn = prices.find((p) => p.retailer_id === 'amazon-uk');
  if (amzn) return { url: amzn.url, source: 'amazon', retailer: 'amazon-uk' };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main

async function main() {
  const { data: products } = await sb.from('products').select('id, name, image_key, image_url');
  const { data: prices } = await sb.from('prices').select('product_id, retailer_id, url');
  const byPid = new Map();
  for (const p of prices) (byPid.get(p.product_id) ?? byPid.set(p.product_id, []).get(p.product_id)).push(p);

  const files = new Set(readdirSync(PRODUCTS_DIR));

  let candidates;
  if (onlyProductId) {
    candidates = products.filter((p) => String(p.id) === onlyProductId);
  } else {
    candidates = products.filter((p) => {
      if (p.image_url) return false;
      if (!p.image_key) return false;
      return !files.has(`${p.image_key}.png`);
    });
  }
  if (limit) candidates = candidates.slice(0, limit);

  console.log(`${candidates.length} product(s) to process\n`);

  let succeeded = 0, skipped = 0, failed = 0;
  for (const p of candidates) {
    const pr = byPid.get(String(p.id)) ?? [];
    const source = pickSourceUrl(pr);
    if (!source) {
      console.log(`  ⚠ #${p.id} ${p.name} — no usable retailer URL`);
      skipped++;
      continue;
    }
    console.log(`  → #${p.id} ${p.name}`);
    console.log(`    via ${source.retailer}`);
    try {
      const urls =
        source.source === 'shopify' ? await shopifyImages(source.url) :
        source.source === 'amazon' ? await amazonImages(source.url) :
        await chrisAndSonsImages(source.url);
      if (!urls.length) throw new Error('no images found');

      if (dryRun) {
        console.log(`    found ${urls.length} image(s):`);
        for (let i = 0; i < Math.min(3, urls.length); i++) console.log('      -', urls[i]);
        succeeded++;
        continue;
      }

      // Save: main = <key>.png, then <key>-2.png, -3.png, ...
      let saved = 0;
      for (let i = 0; i < urls.length; i++) {
        const filename = i === 0
          ? `${p.image_key}.png`
          : `${p.image_key}-${i + 1}.png`;
        const dest = join(PRODUCTS_DIR, filename);
        try {
          const useBrowser = source.source === 'chris-sons';
          const referer = useBrowser ? source.url : null;
          const bytes = await downloadImage(urls[i], dest, useBrowser, referer);
          saved++;
          if (i < 3) console.log(`    ✓ ${filename} (${(bytes / 1024).toFixed(0)} KB)`);
        } catch (e) {
          // First image is required; later ones are bonus
          if (i === 0) throw e;
        }
      }
      console.log(`    ${saved} image(s) saved\n`);
      succeeded++;
    } catch (e) {
      console.log(`    ✗ failed: ${e.message}\n`);
      failed++;
    }
  }

  console.log(`\n  ${succeeded} ok · ${skipped} skipped · ${failed} failed`);
  await closeBrowser();
  process.exit(0);
}

main().catch(async (e) => { console.error(e); await closeBrowser(); process.exit(1); });
