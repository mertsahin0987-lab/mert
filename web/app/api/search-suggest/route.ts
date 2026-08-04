import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/data';

// Typeahead endpoint for the header search dropdown. Returns the top few
// products matching the query, trimmed to just what the dropdown UI renders
// (no descriptions, no schema, no retailer breakdown). Client debounces
// requests; we keep the payload lean so it responds instantly even on 3G.

const MAX_RESULTS = 6;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

  const all = await searchProducts(q);

  // Prefer in-stock, then name-starts-with, then everything else — so someone
  // typing "wahl m" sees "Wahl Magic Clip" before "Wahl 5-Star Cordless Magic".
  const qLower = q.toLowerCase();
  const scored = all.map((p) => {
    const nameLower = p.name.toLowerCase();
    let score = 0;
    if (nameLower === qLower) score += 100;
    else if (nameLower.startsWith(qLower)) score += 50;
    else if (nameLower.includes(qLower)) score += 20;
    if (p.brand_name.toLowerCase().startsWith(qLower)) score += 30;
    if (p.in_stock) score += 5;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, MAX_RESULTS).map(({ p }) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand_name: p.brand_name,
    category: p.category,
    base_price: p.base_price,
    compare_at_price: p.compare_at_price,
    image_key: p.image_key,
    image_url: p.image_url,
    in_stock: p.in_stock,
  }));
  return NextResponse.json({ results });
}
