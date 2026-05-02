#!/usr/bin/env node
/**
 * One-shot: upgrade every Coolblades image URL in our DB from /stencil/80w/
 * (thumbnail) to /stencil/1280x1280/ (HD). Same image, just bigger size from
 * the same CDN endpoint — no re-scraping needed.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

console.log('\n🖼  Upgrading product images to HD\n');

const { data, error } = await supabase
  .from('products')
  .select('id, name, image_url')
  .not('image_url', 'is', null);

if (error) { console.error(error.message); process.exit(1); }

let upgraded = 0;
for (const p of data) {
  if (!p.image_url) continue;
  // Only upgrade BigCommerce stencil URLs (Coolblades uses these)
  const upgraded_url = p.image_url.replace(
    /\/stencil\/[^/]+\//,
    '/stencil/1280x1280/'
  );
  if (upgraded_url === p.image_url) continue;

  const { error: upErr } = await supabase
    .from('products')
    .update({ image_url: upgraded_url })
    .eq('id', p.id);
  if (upErr) {
    console.log(`  ✗ ${p.name}: ${upErr.message}`);
  } else {
    upgraded++;
  }
}

console.log(`  ✓ ${upgraded} image URLs upgraded to 1280×1280\n`);
