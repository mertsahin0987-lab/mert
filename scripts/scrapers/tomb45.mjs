/**
 * Tomb45 Direct scraper.
 * Tomb45 runs on Shopify — Shopify exposes product data at `<url>.json`,
 * which is way more reliable than scraping HTML.
 */

import { fetchHtml, parsePrice } from './_lib.mjs';

export const retailerId = 'tomb45-direct';
export const matchesDomain = (url) => /(^|\.)tomb45\.com$/i.test(new URL(url).hostname);

export async function scrape(url) {
  // Shopify product JSON endpoint: append .json to any /products/<handle> URL
  const u = new URL(url);
  const jsonUrl = u.origin + u.pathname.replace(/\/?$/, '') + '.json';

  const text = await fetchHtml(jsonUrl);
  const data = JSON.parse(text);
  const variants = data?.product?.variants ?? [];
  if (!variants.length) throw new Error('No variants in Tomb45 product JSON');

  // Pick the first available variant; fall back to first variant.
  const available = variants.find((v) => v.available);
  const v = available ?? variants[0];
  const price = parsePrice(v.price);
  if (price == null) throw new Error('Could not parse Tomb45 variant price');
  return { price, inStock: !!available };
}
