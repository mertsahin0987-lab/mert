/**
 * Barber Beauty Supply UK scraper.
 * barberbeautysupply.uk is a UK Shopify store — uses the standard
 * /products/<handle>.json endpoint. Prices are GBP inc-VAT. See _shopify.mjs.
 */

import { shopifyScrape } from './_shopify.mjs';

export const retailerId = 'barber-beauty';
export const matchesDomain = (url) =>
  /(^|\.)barberbeautysupply\.uk$/i.test(new URL(url).hostname);

export const scrape = shopifyScrape;
