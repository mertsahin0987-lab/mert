/**
 * JRL scraper.
 * Both jrlusa.com and jrluk.co.uk run on Shopify; JRL UK uses Shopify
 * Markets price-list overrides, which means the variant `.json` base price
 * lags the actual checkout price. The shared `shopifyScrape` helper handles
 * this by preferring the storefront-displayed `og:price:amount`.
 */

import { shopifyScrape } from './_shopify.mjs';

export const retailerId = 'jrl-direct';
// Supports both jrlusa.com (USD) and jrluk.co.uk (GBP — preferred for UK users)
export const matchesDomain = (url) =>
  /(^|\.)jrlusa\.com$|(^|\.)jrluk\.co\.uk$/i.test(new URL(url).hostname);

export const scrape = shopifyScrape;
