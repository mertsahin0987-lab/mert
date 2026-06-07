#!/usr/bin/env node
/**
 * News scraper. Pulls editorial articles from configured barber blogs and
 * upserts them into the news_articles table. Designed to run from the same
 * Vercel daily cron that scrapes prices — so the /news feed gets fresh
 * editorial alongside the auto-generated price-drop / restock events.
 *
 * Adding a new source is a one-line append to the SOURCES array below. The
 * parser handles standard Atom (Shopify blogs all expose one) — other feed
 * formats can be plugged in alongside without changing the rest of the file.
 *
 * Usage:
 *   node --env-file=.env scripts/scrape-news.mjs
 *   node --env-file=.env scripts/scrape-news.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dryRun = process.argv.includes('--dry-run');

// Add a new source by appending a row. `type` chooses the parser. The atom
// type handles every Shopify-blog feed straight out of the box.
const SOURCES = [
  {
    source: 'Barber Beauty Supply UK',
    sourceUrl: 'https://barberbeautysupply.uk',
    feedUrl: 'https://barberbeautysupply.uk/blogs/blog.atom',
    type: 'atom',
  },
];

/**
 * Strip HTML to plain text, collapse whitespace, and take the first ~300
 * chars as an excerpt. Doesn't try to parse the full DOM — articles are
 * Times New Roman blobs from Shopify rich text, the cleanup is mostly
 * stripping tags + entities.
 */
function makeExcerpt(html) {
  if (!html) return null;
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= 300) return text;
  // End on a sentence boundary if possible
  const trimmed = text.slice(0, 300);
  const lastDot = trimmed.lastIndexOf('. ');
  if (lastDot > 200) return trimmed.slice(0, lastDot + 1);
  return trimmed.replace(/\s+\S*$/, '') + '…';
}

/** Pull the first <img src="..."> URL out of the article HTML. */
function extractImage(html) {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/**
 * Decode XML CDATA + entities inside an Atom string/element value.
 */
function decodeXml(s) {
  if (s == null) return null;
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Tiny regex-based Atom parser. Pulls each <entry>...</entry> block and
 * extracts the fields we care about. Avoids dragging an XML library into
 * scripts/ for a job this small.
 */
async function fetchAtom(feedUrl) {
  const res = await fetch(feedUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/atom+xml,application/xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${feedUrl}`);
  const xml = await res.text();

  const entries = [];
  const entryRe = /<entry[\s\S]*?<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const block = m[0];

    const title = decodeXml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim());
    const linkUrl = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1]
      ?? block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1];
    const published = block.match(/<published>([^<]+)<\/published>/)?.[1]
      ?? block.match(/<updated>([^<]+)<\/updated>/)?.[1];
    const author = block.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/)?.[1];
    const contentMatch = block.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    const html = decodeXml(contentMatch?.[1] ?? block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] ?? '');

    if (title && linkUrl && published) {
      entries.push({
        title,
        url: linkUrl,
        published_at: published,
        author: author ?? null,
        excerpt: makeExcerpt(html),
        image_url: extractImage(html),
      });
    }
  }
  return entries;
}

async function main() {
  let total = 0, inserted = 0, updated = 0, failed = 0;

  for (const source of SOURCES) {
    console.log(`\n→ ${source.source}`);
    let entries;
    try {
      entries = source.type === 'atom' ? await fetchAtom(source.feedUrl) : [];
    } catch (e) {
      console.log(`  ✗ feed fetch failed: ${e.message}`);
      failed++;
      continue;
    }
    console.log(`  ${entries.length} entries`);
    total += entries.length;

    for (const entry of entries) {
      const row = {
        source: source.source,
        source_url: source.sourceUrl,
        title: entry.title,
        excerpt: entry.excerpt,
        image_url: entry.image_url,
        url: entry.url,
        author: entry.author,
        published_at: entry.published_at,
      };

      if (dryRun) {
        console.log(`  ◦ ${entry.published_at.slice(0, 10)} ${entry.title.slice(0, 60)}`);
        continue;
      }

      // Upsert on URL — re-running the scraper just refreshes excerpts /
      // images if the source edited the post, never duplicates.
      const r = await sb
        .from('news_articles')
        .upsert(row, { onConflict: 'url' })
        .select('id');
      if (r.error) { failed++; console.log(`  ✗ ${entry.title.slice(0, 50)}: ${r.error.message}`); }
      else inserted++;
    }
  }

  console.log(`\n${inserted} upserted · ${failed} failed · ${total} seen`);
}

main().catch((e) => { console.error(e); process.exit(1); });
