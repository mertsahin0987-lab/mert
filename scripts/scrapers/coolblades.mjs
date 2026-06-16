/**
 * Coolblades scraper.
 * Coolblades runs on BigCommerce — product pages embed JSON-LD with structured
 * product data, which is the reliable place to read price/availability from.
 */

import * as cheerio from 'cheerio';
import { fetchHtml, parsePrice, parseStock } from './_lib.mjs';

export const retailerId = 'coolblades';
export const matchesDomain = (url) => /(^|\.)coolblades\.co\.uk$/i.test(new URL(url).hostname);

export async function scrape(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // BigCommerce surfaces the strike-through RRP in a dedicated inc-VAT
  // container only when the product is on sale. JSON-LD doesn't expose
  // it, so we pull it from the DOM (".rrp-price--withTax" → "Was £X").
  const rrpText = $('.price-section.rrp-price-section.rrp-price--withTax').first().text();
  const rrpRaw = parsePrice(rrpText);

  // Primary source: JSON-LD product schema
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
            const inStock = avail.includes('instock') || avail.includes('in_stock')
              ? true
              : avail.includes('outofstock') ? false : true;
            const compareAtPrice = rrpRaw != null && rrpRaw > price + 0.01 ? rrpRaw : null;
            return { price, inStock, compareAtPrice };
          }
        }
      }
    } catch {
      // Skip malformed blocks; fall through to DOM fallback
    }
  }

  // Fallback: scrape visible price + add-to-cart text from the DOM
  const priceText = $('[data-product-price-with-tax], .price--withTax, .productView-price .price').first().text();
  const stockText = $('[data-product-stock-level], .productView-info, .form-action').first().text();
  const price = parsePrice(priceText);
  if (price == null) throw new Error('Could not find price on Coolblades page');
  const compareAtPrice = rrpRaw != null && rrpRaw > price + 0.01 ? rrpRaw : null;
  return { price, inStock: parseStock(stockText), compareAtPrice };
}

function pickProduct(node) {
  if (!node || typeof node !== 'object') return null;
  if (node['@type'] === 'Product') return node;
  if (Array.isArray(node['@graph'])) {
    return node['@graph'].find((n) => n['@type'] === 'Product') ?? null;
  }
  return null;
}
