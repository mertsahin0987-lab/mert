#!/usr/bin/env node
/**
 * URL discovery scraper.
 *
 * Walks each retailer's category pages, extracts (name, url) pairs for every
 * product they sell, then fuzzy-matches them against our products (by name +
 * brand) and writes the matched URLs back into data/prices.csv.
 *
 * Run:   node scripts/discover-urls.mjs
 * After: npm run sync-data && npm run generate-supabase-sql
 *        then re-paste the SQL into Supabase and run scrape.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { fetchHtml, log } from './scrapers/_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');

// ============================================================================
// CSV (matches build-data.mjs)
// ============================================================================

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && next === '\n') i++;
        row.push(field);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = []; field = '';
      } else field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { header: [], rows: [] };
  const header = rows[0].map(h => h.trim());
  const data = rows.slice(1).map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
  return { header, rows: data };
}

function writeCsv(header, rows) {
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) lines.push(header.map(h => esc(r[h])).join(','));
  return lines.join('\n') + '\n';
}

// ============================================================================
// Per-retailer discovery — return list of { name, url }
// ============================================================================

// Search Coolblades for a single product — returns top hits as { name, url }
async function searchCoolblades(query) {
  const url = `https://www.coolblades.co.uk/search.php?search_query=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results = [];
  $('article.card, article').each((_, el) => {
    const a = $(el).find('a.card-figure__link, a').first();
    let href = a.attr('href') || '';
    // Search result URLs come with ?searchid=... — strip it.
    href = href.split('?')[0].replace(/\/$/, '/');
    const name =
      $(el).find('.card-title, h2, h3, h4').first().text().trim() ||
      a.attr('aria-label')?.split(',')[0].trim() ||
      '';
    if (href && name && href.includes('coolblades.co.uk')) {
      results.push({ name, url: href });
    }
  });
  return results;
}

// Search JRL USA — also Shopify, same suggest.json pattern
async function searchJrl(query) {
  const url =
    `https://www.jrlusa.com/search/suggest.json?q=${encodeURIComponent(query)}` +
    `&resources%5Btype%5D=product&resources%5Blimit%5D=10`;
  try {
    const text = await fetchHtml(url);
    const data = JSON.parse(text);
    const products = data?.resources?.results?.products ?? [];
    return products.map((p) => ({
      name: p.title,
      url: 'https://www.jrlusa.com' + (p.url || `/products/${p.handle}`).split('?')[0],
    }));
  } catch {
    return [];
  }
}

// Search Amazon UK via Playwright — needed because Amazon blocks plain fetch
async function searchAmazon(query) {
  const { browserFetch } = await import('./scrapers/_browser.mjs');
  const url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}`;
  try {
    const html = await browserFetch(url);
    const $ = cheerio.load(html);
    const results = [];
    const seen = new Set();
    $('div[data-component-type="s-search-result"]').each((_, el) => {
      const a = $(el).find('h2 a, a.a-link-normal[href*="/dp/"]').first();
      const href = a.attr('href') || '';
      const m = href.match(/\/dp\/([A-Z0-9]{10})/);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const name = $(el).find('h2 span').first().text().trim() || a.text().trim();
      if (name) results.push({ name, url: `https://www.amazon.co.uk/dp/${m[1]}` });
    });
    return results;
  } catch {
    return [];
  }
}

// Search Salons Direct for a single product (Shopify suggest.json — clean JSON)
async function searchSalonsDirect(query) {
  const url =
    `https://www.salonsdirect.com/search/suggest.json?q=${encodeURIComponent(query)}` +
    `&resources%5Btype%5D=product&resources%5Blimit%5D=10`;
  try {
    const text = await fetchHtml(url);
    const data = JSON.parse(text);
    const products = data?.resources?.results?.products ?? [];
    return products.map((p) => ({
      name: p.title,
      // p.url has tracking params (?_pos=...) — strip them
      url: 'https://www.salonsdirect.com' + (p.url || `/products/${p.handle}`).split('?')[0],
    }));
  } catch (e) {
    return [];
  }
}

// ============================================================================
// Fuzzy name matcher
// ============================================================================

function normaliseName(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(the|cordless|professional|pro|hair|clipper|clippers|trimmer|trimmers|barber|with|and|edition|kit)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s) {
  return new Set(normaliseName(s).split(' ').filter(t => t.length > 1));
}

function similarity(a, b) {
  const A = tokenSet(a), B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  // Jaccard index
  return inter / (A.size + B.size - inter);
}

function bestMatch(productName, candidates, brand) {
  let best = null;
  for (const c of candidates) {
    let score = similarity(productName, c.name);
    // Boost score if brand name appears in candidate
    if (brand && tokenSet(c.name).has(brand.toLowerCase().split(' ')[0])) score += 0.1;
    if (!best || score > best.score) best = { ...c, score };
  }
  return best && best.score >= 0.5 ? best : null;
}

// ============================================================================
// Main
// ============================================================================

console.log('\n🔎 URL discovery — finding real retailer URLs for your products\n');

const products = parseCsv(readFileSync(join(DATA_DIR, 'products.csv'), 'utf8')).rows;
const pricesParsed = parseCsv(readFileSync(join(DATA_DIR, 'prices.csv'), 'utf8'));
const pricesHeader = pricesParsed.header;
const prices = pricesParsed.rows;

console.log(`  ${products.length} products × ${prices.length} retailer rows in CSV\n`);

// Cache per-query results so we don't search the same query twice
const searchCache = new Map();

async function searchOnce(retailerId, query) {
  const key = `${retailerId}:${query}`;
  if (searchCache.has(key)) return searchCache.get(key);
  const fn =
    retailerId === 'coolblades' ? searchCoolblades :
    retailerId === 'salons-direct' ? searchSalonsDirect :
    retailerId === 'jrl-direct' ? searchJrl :
    retailerId === 'amazon-uk' ? searchAmazon :
    null;
  let res = [];
  if (fn) {
    try { res = await fn(query); } catch { res = []; }
  }
  searchCache.set(key, res);
  // Throttle so we don't hammer the search endpoint
  await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
  return res;
}

const retailerMap = {
  'Coolblades': 'coolblades',
  'Salons Direct': 'salons-direct',
  'JRL Direct': 'jrl-direct',
  'Amazon UK': 'amazon-uk',
};

console.log('🔗 Searching each retailer for each product...\n');

const updated = [];
let matchCount = 0, missCount = 0;

for (const price of prices) {
  const retailerId = retailerMap[price.retailer];
  if (!retailerId) {
    updated.push(price);
    continue;
  }
  const product = products.find(p => p.id === price.productId);
  if (!product) {
    updated.push(price);
    continue;
  }

  const fullName = `${product.brand} ${product.name}`;
  // Build a search query: brand + key model words, strip parentheticals
  const queryName = product.name.replace(/\([^)]*\)/g, '').trim();
  const query = `${product.brand} ${queryName}`.replace(/\s+/g, ' ').trim();

  const candidates = await searchOnce(retailerId, query);
  const match = bestMatch(fullName, candidates, product.brand);

  if (match) {
    console.log(`  ✓ ${product.brand} ${product.name}`);
    console.log(`      → ${price.retailer}: ${match.url}`);
    console.log(`        (matched "${match.name}" — score ${match.score.toFixed(2)})`);
    updated.push({ ...price, url: match.url });
    matchCount++;
  } else {
    console.log(`  ✗ ${product.brand} ${product.name} @ ${price.retailer} — no match (${candidates.length} candidates from search)`);
    updated.push(price);
    missCount++;
  }
}

writeFileSync(join(DATA_DIR, 'prices.csv'), writeCsv(pricesHeader, updated));

console.log('\n' + '─'.repeat(50));
console.log(`  ${matchCount} URLs updated · ${missCount} unmatched`);
console.log(`  ✓ Wrote data/prices.csv`);
console.log(`\nNext:`);
console.log(`  1. npm run sync-data              # rebuild app data file`);
console.log(`  2. npm run generate-supabase-sql  # regenerate SQL`);
console.log(`  3. paste supabase/init.sql into Supabase SQL Editor → Run`);
console.log(`  4. npm run scrape:dry             # try scraping the new URLs\n`);

// Close the Playwright browser if we opened it for Amazon discovery.
try {
  const { closeBrowser } = await import('./scrapers/_browser.mjs');
  await closeBrowser();
} catch {}

