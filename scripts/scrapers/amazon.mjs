/**
 * Amazon UK scraper.
 *
 * Amazon aggressively blocks plain HTTP scrapers — needs Playwright.
 * Even with Playwright, we throttle and randomise to look human; if Amazon
 * starts serving us CAPTCHAs we'll need to add a stealth plugin or proxies.
 *
 * Price selectors are stable across most product pages:
 *   #corePrice_feature_div .a-price .a-offscreen   ← canonical "deal" price
 *   span.a-price .a-offscreen                      ← fallback (any visible price)
 *
 * Stock is in `#availability span` ("In stock", "Currently unavailable", etc.)
 */

import * as cheerio from 'cheerio';
import { browserFetch } from './_browser.mjs';
import { parsePrice } from './_lib.mjs';

export const retailerId = 'amazon-uk';
export const matchesDomain = (url) => /(^|\.)amazon\.co\.uk$/i.test(new URL(url).hostname);

export async function scrape(url) {
  const html = await browserFetch(url);

  // CAPTCHA / bot wall detection — Amazon shows a "discuss automated access"
  // page when it suspects you. Fail loudly so we know to back off.
  if (/discuss automated access|enter the characters you see|api-services-support/i.test(html.slice(0, 8000))) {
    throw new Error('Amazon CAPTCHA / bot wall — back off and retry later');
  }

  const $ = cheerio.load(html);

  // Try the main "price you'll pay" selectors in order of reliability.
  const priceSelectors = [
    '#corePriceDisplay_desktop_feature_div .a-price.priceToPay .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
    '#corePrice_feature_div .a-price .a-offscreen',
    '#apex_desktop .a-price .a-offscreen',
    'span.a-price.priceToPay .a-offscreen',
    'span.a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '#priceblock_saleprice',
  ];

  let priceText = '';
  for (const sel of priceSelectors) {
    priceText = $(sel).first().text().trim();
    if (priceText) break;
  }

  const price = parsePrice(priceText);
  if (price == null) {
    throw new Error('Could not find price on Amazon page');
  }

  // Stock — Amazon's wording: "In stock", "Only N left", "Currently unavailable",
  // "Temporarily out of stock", etc.
  const availability = $('#availability').first().text().trim().toLowerCase();
  const inStock = !/unavailable|out of stock|temporarily/i.test(availability);

  return { price, inStock };
}
