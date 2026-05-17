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
 *
 * Price source: we prefer the storefront-rendered `og:price:amount` meta
 * over the variant JSON's base price. Some UK stores (JRL UK is the
 * confirmed example) use Shopify Markets / price-list overrides so the
 * variant JSON shows £250 while the customer actually pays £300 at
 * checkout. The meta tag reflects the rendered, customer-facing price.
 */

import { fetchHtml, parsePrice, parseStorefrontPriceMeta } from './_lib.mjs';

export async function shopifyScrape(url) {
  const u = new URL(url);
  const jsonUrl = u.origin + u.pathname.replace(/\/?$/, '') + '.json';

  // Fetch variant JSON and the storefront HTML in parallel. JSON gives us
  // reliable stock + variant fallback price; HTML gives us the displayed
  // price (when it differs from the variant base, which happens on stores
  // using Shopify Markets / price-list overrides).
  const [jsonText, html] = await Promise.all([
    fetchHtml(jsonUrl),
    fetchHtml(url).catch(() => null),
  ]);

  const data = JSON.parse(jsonText);
  const variants = data?.product?.variants ?? [];
  if (!variants.length) {
    throw new Error(`No variants in Shopify product JSON at ${jsonUrl}`);
  }

  const isVariantAvailable = (v) => v.available !== false;
  const available = variants.find(isVariantAvailable);
  const v = available ?? variants[0];

  const variantPrice = parsePrice(v.price);
  const storefrontPrice = parseStorefrontPriceMeta(html);
  const price = storefrontPrice ?? variantPrice;
  if (price == null) {
    throw new Error('Could not parse Shopify price (variant JSON + storefront meta both empty)');
  }

  return { price, inStock: !!available };
}
