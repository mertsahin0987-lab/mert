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
import { zenrowsFetch } from './_browser.mjs';
import { parsePrice, parseStock } from './_lib.mjs';

export const retailerId = 'chris-sons';
export const matchesDomain = (url) => /(^|\.)chrisandsons\.co\.uk$/i.test(new URL(url).hostname);

// C&S sits behind Cloudflare which blocks GitHub Actions IPs outright and
// intermittently the Mac's home IP. Route every request through ZenRows'
// premium proxy + antibot pool so the daily cron actually gets prices back.
// Costs ~25 credits/request — worth it for the ~140 URLs C&S covers.
export async function scrape(url) {
  const html = await zenrowsFetch(url);
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
  const magentoPrice = parsePrice(priceText);
  if (magentoPrice != null) {
    return { price: addVat(magentoPrice), inStock: parseStock(stockText) };
  }

  // 3) Shopify Hydrogen fallback — C&S has migrated many products to a
  //    Shopify Oxygen storefront where the Magento DOM selectors don't match.
  //    Hydrogen doesn't ship a JSON-LD block, so we scrape rendered prices.
  //    C&S is a trade site and displays ex-VAT prominently with the inc-VAT
  //    figure right next to it: e.g. "£86.40 / £103.68 inc VAT" (ratio 1.20).
  //    Finding an adjacent (ex, inc) pair where inc ≈ ex × 1.20 identifies
  //    the product's own price with high confidence — any promo/shipping
  //    figures that also appear on the page don't come in that pattern.
  const priceMatches = [...html.matchAll(/£\s*([\d,]+\.\d{2})/g)]
    .map((m) => parseFloat(m[1].replace(/,/g, '')))
    .filter((p) => p >= 1);
  for (let i = 0; i < priceMatches.length - 1; i++) {
    const a = priceMatches[i];
    const b = priceMatches[i + 1];
    // Allow 1p rounding either way on the ×1.20 relationship.
    if (Math.abs(b - a * 1.20) <= 0.02) {
      // `a` is the ex-VAT price; addVat() re-derives the inc-VAT to match.
      const oosMarker = /out of stock|sold out|unavailable/i.test(html);
      return { price: addVat(a), inStock: !oosMarker };
    }
  }

  throw new Error('Could not find price on Chris & Sons page');
}

function pickProduct(node) {
  if (!node || typeof node !== 'object') return null;
  if (node['@type'] === 'Product') return node;
  if (Array.isArray(node['@graph'])) {
    return node['@graph'].find((n) => n['@type'] === 'Product') ?? null;
  }
  return null;
}
