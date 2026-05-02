#!/usr/bin/env node
/**
 * One-shot: pushes current data/prices.csv URLs straight into Supabase
 * via the service-role key. Used after `discover-urls.mjs` has patched in
 * fresh URLs, so we don't have to re-paste init.sql in the dashboard.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('paste-your-secret-key-here')) {
  console.error('✗ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Tiny CSV parser (matches build-data.mjs)
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
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

// Slugify retailer name to id (matches generate-supabase-sql.mjs)
function retailerId(name) {
  return name.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

console.log('\n📤 Syncing prices.csv URLs to Supabase\n');

const prices = parseCsv(readFileSync(join(ROOT, 'data/prices.csv'), 'utf8'));
console.log(`  ${prices.length} rows to update\n`);

let ok = 0, failed = 0;

for (const p of prices) {
  if (!p.productId || !p.retailer) continue;
  const rid = retailerId(p.retailer);
  const { error } = await supabase
    .from('prices')
    .update({ url: p.url || null })
    .eq('product_id', p.productId)
    .eq('retailer_id', rid);
  if (error) {
    console.log(`  ✗ ${p.productId} @ ${p.retailer}: ${error.message}`);
    failed++;
  } else {
    ok++;
  }
}

console.log(`\n  ${ok} updated · ${failed} failed\n`);
