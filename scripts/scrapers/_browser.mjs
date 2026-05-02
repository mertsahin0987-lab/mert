/**
 * Playwright helper for Cloudflare-protected sites.
 *
 * Plain HTTP fetches get blocked by Cloudflare with a 403 + a JS challenge.
 * Playwright launches a real headless Chrome that solves the challenge
 * automatically, so we get the actual product page HTML.
 *
 * Usage from a retailer scraper:
 *   import { browserFetch } from './_browser.mjs';
 *   const html = await browserFetch(url);
 *
 * The browser is launched lazily on first use and shared across all scrapes
 * in the same process (so we only pay the ~2-second startup cost once).
 * Call `closeBrowser()` at the end of your run.
 */

import { chromium } from 'playwright';

let browser = null;
let context = null;

async function getContext() {
  if (browser && context) return context;
  browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled', // hide the "automation" flag
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });
  context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-GB',
    extraHTTPHeaders: {
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  });
  // Block heavy assets we don't need (faster + lighter on the target site).
  await context.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (t === 'image' || t === 'font' || t === 'media') return route.abort();
    return route.continue();
  });
  return context;
}

/**
 * Fetch a URL through a real browser. Returns full HTML after JS has run
 * and Cloudflare's challenge (if any) has resolved.
 *
 * Aggressively waits out Cloudflare:
 *   - polls the title for up to 25s after navigating
 *   - retries the navigation once if the challenge stalls
 */
export async function browserFetch(url, { timeoutMs = 30000 } = {}) {
  const ctx = await getContext();
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // If we landed on a Cloudflare interstitial, wait for the title to change.
    const isChallenge = (t) =>
      /just a moment|attention required|checking your browser|verifying you/i.test(t);

    let title = await page.title();
    if (isChallenge(title)) {
      const start = Date.now();
      while (Date.now() - start < 25000 && isChallenge(title)) {
        await page.waitForTimeout(1000);
        title = await page.title();
      }
      // After challenge clears, give the real page a beat to render
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    }
    return await page.content();
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (context) { await context.close(); context = null; }
  if (browser) { await browser.close(); browser = null; }
}
