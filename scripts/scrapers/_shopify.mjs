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

  // Prefer an in-stock variant (so we report the correct price for what's
  // actually available), but fall back to the first variant if all are out.
  const available = variants.find((v) => v.available);
  const v = available ?? variants[0];
  const price = parsePrice(v.price);
  if (price == null) {
    throw new Error('Could not parse Shopify variant price');
  }

  return { price, inStock: !!available };
}
