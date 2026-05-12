/**
 * Generic Shopify product scraper.
 *
 * Every Shopify store exposes /products/<handle>.json which returns clean
 * structured product data including all variants and prices. This is far
 * more reliable than parsing HTML and works for any UK Shopify retailer
 * out-of-the-box (Eson Direct, MCR Barber Supplies, Barber Beauty Supply,
 * Salons Direct, JRL UK, etc.).
 *
 * UK Shopify stores show inc-VAT prices to consumers by default, so no
 * adjustment is needed on the price returned.
 *
 * Stock detection: many small Shopify stores have inventory tracking
 * DISABLED, in which case `variant.available` is missing or null. We treat
 * "missing available field" the same as "yes, it's buyable" — only mark
 * a product OOS when the API explicitly says `available: false`.
 */

import { fetchHtml, parsePrice } from './_lib.mjs';

export async function shopifyScrape(url) {
  const u = new URL(url);
  const jsonUrl = u.origin + u.pathname.replace(/\/?$/, '') + '.json';

  const text = await fetchHtml(jsonUrl);
  const data = JSON.parse(text);
  const variants = data?.product?.variants ?? [];
  if (!variants.length) {
    throw new Error(`No variants in Shopify product JSON at ${jsonUrl}`);
  }

  // Some stores omit the `available` field entirely → treat as available.
  // Only treat as OOS when ALL variants explicitly say available: false.
  const isVariantAvailable = (v) => v.available !== false;

  const available = variants.find(isVariantAvailable);
  const v = available ?? variants[0];
  const price = parsePrice(v.price);
  if (price == null) {
    throw new Error('Could not parse Shopify variant price');
  }

  return { price, inStock: !!available };
}
