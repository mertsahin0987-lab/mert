/**
 * Shared scraper helpers.
 *
 * Every retailer module exports a `scrape(url) → { price, inStock, currency }`
 * function. This file gives them the common building blocks: HTTP fetching
 * with retry/backoff, a tolerant price parser, and standard logging.
 */

import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_HEADERS = {
  // A real desktop Chrome UA — avoids the 95% of bot blocks that just check UA.
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,' +
    'image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
};

/**
 * Fetch a URL with retries on transient failure.
 * Throws after `attempts` exhausted; returns the response body string on success.
 */
export async function fetchHtml(url, { attempts = 3, timeoutMs = 20000 } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: DEFAULT_HEADERS,
        redirect: 'follow',
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.status === 403 || res.status === 429) {
        // Cloudflare / rate-limited — retry with backoff won't help much,
        // but try once more in case it was transient.
        const text = await res.text();
        const err = new Error(`HTTP ${res.status} (likely bot-blocked)`);
        err.status = res.status;
        err.body = text.slice(0, 500);
        throw err;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (i < attempts) {
        const wait = 1000 * Math.pow(2, i - 1) + Math.random() * 500;
        await sleep(wait);
      }
    }
  }
  throw lastErr;
}

/**
 * Extract a numeric price from a string.
 * Handles "£149.99", "$149.99", "149,99", "1,299.00", "Now £149.99 (was £179)" etc.
 * Always returns the FIRST price found (typically the current/sale price).
 */
export function parsePrice(text) {
  if (!text) return null;
  // Strip thin spaces, non-breaking spaces, currency words
  const cleaned = String(text).replace(/[\u00a0\u2009]/g, ' ');
  // Match either "£1,299.99" / "1299.99" / "1.299,99" / etc.
  // Look for at least one digit, optional thousands separators, optional decimal.
  const m = cleaned.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  let n = m[1];
  // If there's both . and , the last one is the decimal, the other is thousands.
  const lastDot = n.lastIndexOf('.');
  const lastComma = n.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastDot > lastComma) {
      n = n.replace(/,/g, ''); // 1,299.99
    } else {
      n = n.replace(/\./g, '').replace(',', '.'); // 1.299,99
    }
  } else if (lastComma >= 0 && (n.length - lastComma === 3)) {
    // 149,99 → 149.99
    n = n.replace(',', '.');
  } else {
    n = n.replace(/,/g, '');
  }
  const num = parseFloat(n);
  return Number.isFinite(num) ? num : null;
}

/**
 * Detect "in stock" / "out of stock" from common phrases.
 * Returns true (in stock) by default — better to assume available than miss a sale.
 */
export function parseStock(text) {
  if (!text) return true;
  const t = String(text).toLowerCase();
  if (/out of stock|sold out|unavailable|discontinued|notify me/.test(t)) return false;
  if (/in stock|add to (cart|basket)|buy now/.test(t)) return true;
  return true; // default optimistic
}

/** Pretty console output (no colour deps — keep scraper minimal). */
export const log = {
  info: (msg) => console.log(`  ${msg}`),
  ok: (msg) => console.log(`  ✓ ${msg}`),
  warn: (msg) => console.log(`  ⚠ ${msg}`),
  err: (msg) => console.log(`  ✗ ${msg}`),
};
