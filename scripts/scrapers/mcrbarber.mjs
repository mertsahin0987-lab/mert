/**
 * MCR Barber Supplies scraper.
 * mcrbarbersupplies.co.uk is a UK Shopify store — uses the standard
 * /products/<handle>.json endpoint. Prices are GBP inc-VAT. See _shopify.mjs.
 */

import { shopifyScrape } from './_shopify.mjs';

export const retailerId = 'mcr-barber';
export const matchesDomain = (url) =>
  /(^|\.)mcrbarbersupplies\.co\.uk$/i.test(new URL(url).hostname);

export const scrape = shopifyScrape;
