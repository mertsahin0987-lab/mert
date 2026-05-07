/**
 * Chris & Sons scraper.
 *
 * Their product pages sit behind Cloudflare so we can't use plain fetch —
 * we route through Playwright (see _browser.mjs).
 *
 * Chris & Sons runs on Magento. Magento product pages embed a JSON-LD
 * Product schema with current price + availability — same approach as
 * the BigCommerce / Shopify scrapers.
 */

import * as cheerio from 'cheerio';
import { browserFetch } from './_browser.mjs';
import { parsePrice, parseStock } from './_lib.mjs';

export const retailerId = 'chris-sons';
export const matchesDomain = (url) => /(^|\.)chrisandsons\.co\.uk$/i.test(new URL(url).hostname);

// Track whether we've warmed up the Cloudflare session this run.
// A single homepage visit establishes trust so subsequent product pages load.
let warmedUp = false;

export async function scrape(url) {
  if (!warmedUp) {
    warmedUp = true;
    try {
      // Visit the homepage first so Cloudflare grants session cookies before
      // we start hitting product pages. Ignore the result — we just need the
      // cookie handshake to complete.
      await browserFetch('https://www.chrisandsons.co.uk/');
    } catch {
      // Non-fatal — carry on and let the product fetch fail if CF still blocks
    }
  }
  const html = await browserFetch(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD product schema (preferred — most reliable)
  const ldBlocks = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).contents().text())
    .get();

  for (const block of ldBlocks) {
    try {
      const data = JSON.parse(block);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const product = pickProduct(item);
        if (!product) continue;
        const offers = [].concat(product.offers ?? []);
        for (const offer of offers) {
          const price = parsePrice(offer.price ?? offer.lowPrice ?? '');
          if (price != null) {
            const avail = String(offer.availability ?? '').toLowerCase();
            const inStock = avail.includes('outofstock') ? false : true;
            return { price, inStock };
          }
        }
      }
    } catch {
      // ignore malformed blocks
    }
  }

  // 2) Magento DOM fallback — scoped to the product-info area to avoid picking
  //    up prices of related/upsell products that appear later in the DOM.
  const priceText = $(
    '.product-info-main [data-price-amount],' +
    '.product-info-price .price,' +
    '.product-info-main .price-wrapper .price'
  ).first().text();
  const stockText = $('.stock, .product-info-stock-sku, .availability').first().text();
  const price = parsePrice(priceText);
  if (price == null) throw new Error('Could not find price on Chris & Sons page');
  return { price, inStock: parseStock(stockText) };
}

function pickProduct(node) {
  if (!node || typeof node !== 'object') return null;
  if (node['@type'] === 'Product') return node;
  if (Array.isArray(node['@graph'])) {
    return node['@graph'].find((n) => n['@type'] === 'Product') ?? null;
  }
  return null;
}
