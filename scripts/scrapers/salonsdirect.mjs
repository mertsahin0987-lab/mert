/**
 * Salons Direct scraper.
 *
 * SD runs on Shopify but with a quirk: their storefront shows inc-VAT
 * prices by default (with an "ex VAT" toggle), and the SEO JSON-LD reflects
 * the inc-VAT customer-facing price. The /products/<handle>.json endpoint
 * however returns the raw ex-VAT variant prices.
 *
 * So we pull the displayed price from JSON-LD (inc-VAT) but read the RRP
 * (compare_at_price) from /products/<handle>.json — which is ex-VAT — and
 * apply the SD VAT factor of 1.20 to align it with the inc-VAT current
 * price. This lets the /sale page surface real SD discounts.
 */

import * as cheerio from 'cheerio';
import { fetchHtml, parsePrice, parseStock } from './_lib.mjs';

export const retailerId = 'salons-direct';
export const matchesDomain = (url) => /(^|\.)salonsdirect\.com$/i.test(new URL(url).hostname);

const VAT_MULTIPLIER = 1.20;

async function fetchCompareAtIncVat(url) {
  try {
    const u = new URL(url);
    if (!u.pathname.startsWith('/products/')) return null;
    const jsonUrl = u.origin + u.pathname.replace(/\/?$/, '') + '.json';
    const text = await fetchHtml(jsonUrl);
    const data = JSON.parse(text);
    const variants = data?.product?.variants ?? [];
    // Pick the first variant with both a price and a higher compare_at_price.
    for (const v of variants) {
      const exVatPrice = parsePrice(v.price);
      const exVatCompare = parsePrice(v.compare_at_price);
      if (exVatCompare != null && exVatPrice != null && exVatCompare > exVatPrice + 0.01) {
        return Math.round(exVatCompare * VAT_MULTIPLIER * 100) / 100;
      }
    }
  } catch {
    // .json endpoint missing or blocked — fine, no RRP
  }
  return null;
}

export async function scrape(url) {
  const [html, compareAtPrice] = await Promise.all([
    fetchHtml(url),
    fetchCompareAtIncVat(url),
  ]);
  const $ = cheerio.load(html);

  // 1) JSON-LD — Salons Direct uses ProductGroup (Shopify), not plain Product
  const ldBlocks = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).contents().text())
    .get();

  for (const block of ldBlocks) {
    try {
      const data = JSON.parse(block);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        // Direct Product
        const product = pickProduct(item);
        if (product) {
          const offers = [].concat(product.offers ?? []);
          for (const offer of offers) {
            const price = parsePrice(offer.price ?? offer.lowPrice ?? '');
            if (price != null) {
              const avail = String(offer.availability ?? '').toLowerCase();
              const inStock = !avail.includes('outofstock');
              return { price, inStock, compareAtPrice };
            }
          }
        }
        // ProductGroup → variants (Shopify format)
        if (item['@type'] === 'ProductGroup') {
          const variants = [].concat(item.hasVariant ?? []);
          for (const v of variants) {
            const offers = [].concat(v.offers ?? []);
            for (const offer of offers) {
              const price = parsePrice(offer.price ?? offer.lowPrice ?? '');
              if (price != null) {
                const avail = String(offer.availability ?? '').toLowerCase();
                const inStock = !avail.includes('outofstock');
                return { price, inStock, compareAtPrice };
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2) DOM fallback — try Shopify selectors first, then Magento
  const priceText = $(
    '[data-product-price], .price-item--regular, .price__regular .price-item, ' +
    '[data-price-amount], .price-wrapper .price, .product-info-price .price'
  ).first().text();
  const stockText = $('.product-form__submit, .stock, .product-info-stock-sku').first().text();
  const price = parsePrice(priceText);
  if (price == null) throw new Error('Could not find price on Salons Direct page');
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

// Salons Direct URL can be /[alias] or /products/[handle] — both work
// The retailer table stores the alias form; the scraper follows redirects.
