/**
 * Beauty World Plus scraper.
 *
 * beautyworldplus.com is a Canada-based Shopify store. Append `.json` to any
 * /products/<handle> URL to get clean structured product data.
 *
 * Prices are returned in CAD. We convert to GBP and add typical UK import
 * duties (20% VAT + £10 handling fee) so the user sees the real landed cost,
 * not a misleading sticker price.
 */

import { fetchHtml, parsePrice } from './_lib.mjs';

export const retailerId = 'beauty-world-plus';
export const matchesDomain = (url) =>
  /(^|\.)beautyworldplus\.com$/i.test(new URL(url).hostname);

// Cache rate per scraper run so we don't hammer the FX API
let cachedRate = null;
async function cadToGbpRate() {
  if (cachedRate != null) return cachedRate;
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/CAD');
    const json = await res.json();
    cachedRate = json?.rates?.GBP ?? 0.55;
  } catch {
    cachedRate = 0.55; // fallback if API down
  }
  return cachedRate;
}

// UK import: 20% VAT on landed value, plus a flat handling fee (Royal Mail
// charges £8, couriers ~£12). We use £10 as a sensible average.
function landedGbp(cadPrice, fxRate) {
  const gbpPrice = cadPrice * fxRate;
  const vat = gbpPrice * 0.20;
  const handlingFee = 10;
  return Math.round((gbpPrice + vat + handlingFee) * 100) / 100;
}

export async function scrape(url) {
  const u = new URL(url);
  const jsonUrl = u.origin + u.pathname.replace(/\/?$/, '') + '.json';

  const text = await fetchHtml(jsonUrl);
  const data = JSON.parse(text);
  const variants = data?.product?.variants ?? [];
  if (!variants.length) throw new Error('No variants in Beauty World Plus product JSON');

  const available = variants.find((v) => v.available);
  const v = available ?? variants[0];
  const cadPrice = parsePrice(v.price);
  if (cadPrice == null) throw new Error('Could not parse Beauty World Plus variant price');

  const fxRate = await cadToGbpRate();
  const finalPrice = landedGbp(cadPrice, fxRate);
  return { price: finalPrice, inStock: !!available };
}
