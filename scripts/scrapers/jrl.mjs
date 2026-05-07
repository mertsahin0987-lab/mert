/**
 * JRL USA scraper.
 * jrlusa.com runs on Shopify — append `.json` to any /products/<handle>
 * URL to get clean structured data (price + availability + variants).
 */

import { fetchHtml, parsePrice } from './_lib.mjs';

export const retailerId = 'jrl-direct';
// Supports both jrlusa.com (USD) and jrluk.co.uk (GBP — preferred for UK users)
export const matchesDomain = (url) =>
  /(^|\.)jrlusa\.com$|(^|\.)jrluk\.co\.uk$/i.test(new URL(url).hostname);

export async function scrape(url) {
  const u = new URL(url);
  const jsonUrl = u.origin + u.pathname.replace(/\/?$/, '') + '.json';

  const text = await fetchHtml(jsonUrl);
  const data = JSON.parse(text);
  const variants = data?.product?.variants ?? [];
  if (!variants.length) throw new Error('No variants in JRL product JSON');

  const available = variants.find((v) => v.available);
  const v = available ?? variants[0];
  const price = parsePrice(v.price);
  if (price == null) throw new Error('Could not parse JRL variant price');
  return { price, inStock: !!available };
}
