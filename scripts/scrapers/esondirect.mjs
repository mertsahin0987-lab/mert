/**
 * Eson Direct scraper.
 * esondirect.co.uk is a UK Shopify store — uses the standard /products/<handle>.json
 * endpoint. Prices are GBP inc-VAT. See _shopify.mjs.
 */

import { shopifyScrape } from './_shopify.mjs';

export const retailerId = 'eson-direct';
export const matchesDomain = (url) =>
  /(^|\.)esondirect\.co\.uk$/i.test(new URL(url).hostname);

export const scrape = shopifyScrape;
