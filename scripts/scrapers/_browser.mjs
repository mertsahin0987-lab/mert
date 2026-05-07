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

// Use playwright-extra with the stealth plugin so Cloudflare's bot detection
// doesn't catch us. Stealth patches ~17 telltale signs that we're automated
// (navigator.webdriver, missing chrome.runtime, fake plugins, etc.).
import { chromium as _chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { execSync } from 'child_process';

_chromium.use(StealthPlugin());
const chromium = _chromium;

let browser = null;
let context = null;

async function getContext() {
  if (browser && context) return context;
  // Try system Chrome first (harder for Cloudflare to detect vs Playwright's
  // bundled Chromium). Fall back to bundled Chromium if Chrome isn't found.
  // headless: false so Cloudflare sees a real browser window and can't fingerprint
  // it as automated. After launch we immediately hide Chrome via AppleScript so
  // the window never appears on your desktop. The three disable-* flags prevent
  // macOS from throttling JS execution in hidden windows.
  const launchOptions = {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  };
  try {
    browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
  } catch {
    browser = await chromium.launch(launchOptions);
  }
  // Hide the Chrome window on macOS so it never appears on screen.
  // The process is still fully "visible" to Cloudflare (GPU, canvas, etc.)
  // — it's just hidden from the user via the OS app-hiding API.
  try {
    execSync(`osascript -e 'tell application "System Events" to set visible of process "Google Chrome" to false'`, { timeout: 3000 });
  } catch {
    // Non-fatal — window may briefly appear if osascript isn't available
  }
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
  // We used to block images/fonts here for speed, but Cloudflare's challenge
  // pages need them to render & complete the proof-of-work. Leave them on.
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
export async function browserFetch(url, { timeoutMs = 90000 } = {}) {
  const ctx = await getContext();
  const page = await ctx.newPage();
  try {
    // Use 'load' (not 'domcontentloaded') so the CF challenge JS has already
    // started executing before we check the title.
    await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });

    // If we landed on a Cloudflare interstitial, poll the title for up to 60s.
    // The challenge runs JS that eventually redirects to the real page.
    const isChallenge = (t) =>
      /just a moment|attention required|checking your browser|verifying you/i.test(t);

    let title = await page.title();
    if (isChallenge(title)) {
      const start = Date.now();
      while (Date.now() - start < 60000 && isChallenge(title)) {
        await page.waitForTimeout(2000);
        title = await page.title();
      }
      // After challenge clears, wait for the real page to fully load
      if (!isChallenge(title)) {
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      }
    } else {
      // Even without a challenge, allow a brief networkidle settle
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
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
