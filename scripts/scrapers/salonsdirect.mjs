/**
 * Salons Direct scraper.
 * Same pattern as Coolblades: try JSON-LD first, fall back to visible DOM.
 */

import * as cheerio from 'cheerio';
import { fetchHtml, parsePrice, parseStock } from './_lib.mjs';

export const retailerId = 'salons-direct';
export const matchesDomain = (url) => /(^|\.)salonsdirect\.com$/i.test(new URL(url).hostname);

export async function scrape(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD
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
      // ignore
    }
  }

  // 2) DOM fallback — Salons Direct uses Magento-style markup
  const priceText = $('[data-price-amount], .price-wrapper .price, .product-info-price .price').first().text();
  const stockText = $('.stock, .product-info-stock-sku').first().text();
  const price = parsePrice(priceText);
  if (price == null) throw new Error('Could not find price on Salons Direct page');
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
