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

export async function scrape(url) {
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

  // 2) Magento DOM fallback — common selectors
  const priceText = $(
    '[data-price-amount], .price-wrapper .price, .product-info-price .price, .price .price'
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
