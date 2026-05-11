/**
 * Chris & Sons scraper.
 *
 * Their product pages sit behind Cloudflare so we can't use plain fetch —
 * we route through Playwright (see _browser.mjs).
 *
 * Chris & Sons runs on Magento. Magento product pages embed a JSON-LD
 * Product schema with current price + availability — same approach as
 * the BigCommerce / Shopify scrapers.
 *
 * IMPORTANT — VAT handling:
 * C&S is a trade supplier, so all prices on the site (and in JSON-LD/DOM
 * markup) are EX-VAT by default. Every other UK retailer we track shows
 * INC-VAT prices to consumers. We multiply C&S prices by 1.20 so the
 * comparison on Clipprr is apples-to-apples (all prices inc 20% UK VAT).
 */

const VAT_MULTIPLIER = 1.20;
const addVat = (price) => Math.round(price * VAT_MULTIPLIER * 100) / 100;

import * as cheerio from 'cheerio';
import { browserFetch } from './_browser.mjs';
import { parsePrice, parseStock } from './_lib.mjs';

export const retailerId = 'chris-sons';
export const matchesDomain = (url) => /(^|\.)chrisandsons\.co\.uk$/i.test(new URL(url).hostname);

// Track whether we've warmed up the Cloudflare session this run.
// Visiting a couple of non-CF sites first gives the browser a browsing
// history that makes Cloudflare more likely to pass us through.
let warmedUp = false;

export async function scrape(url) {
  if (!warmedUp) {
    warmedUp = true;
    const warmupSites = [
      'https://www.coolblades.co.uk/',       // non-CF, same industry
      'https://www.google.co.uk/',            // establishes normal browsing history
      'https://www.chrisandsons.co.uk/',      // CF homepage — get the session cookie
    ];
    for (const site of warmupSites) {
      try {
        await browserFetch(site);
      } catch {
        // Non-fatal
      }
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
            return { price: addVat(price), inStock };
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
  return { price: addVat(price), inStock: parseStock(stockText) };
}

function pickProduct(node) {
  if (!node || typeof node !== 'object') return null;
  if (node['@type'] === 'Product') return node;
  if (Array.isArray(node['@graph'])) {
    return node['@graph'].find((n) => n['@type'] === 'Product') ?? null;
  }
  return null;
}
