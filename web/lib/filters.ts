/**
 * Catalogue filter + sort logic.
 *
 * Reads filter values from URL search params, applies them in-memory to a
 * Product[] (catalogue size is small enough — 250+ products today, fast).
 * Bigger catalogues would need to push these to Supabase queries.
 */

import type { Product } from './data';

export type FilterValues = {
  brand?: string;        // brand slug
  priceBucket?: string;  // 'under-50' | '50-100' | '100-200' | '200-plus'
  onSale?: boolean;
  sort?: string;         // 'price-asc' | 'price-desc' | 'name-asc' | 'discount-desc'
};

const PRICE_BUCKETS: Record<string, [number, number]> = {
  'under-50':  [0, 50],
  '50-100':    [50, 100],
  '100-200':   [100, 200],
  '200-plus':  [200, Infinity],
};

export const PRICE_BUCKET_LABELS: Record<string, string> = {
  'under-50':  'Under £50',
  '50-100':    '£50 – £100',
  '100-200':   '£100 – £200',
  '200-plus':  '£200+',
};

export const SORT_LABELS: Record<string, string> = {
  'price-asc':    'Price: low to high',
  'price-desc':   'Price: high to low',
  'name-asc':     'Name: A to Z',
  'discount-desc':'Biggest discount',
};

export function readFilters(searchParams: Record<string, string | string[] | undefined>): FilterValues {
  const get = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    brand:        get('brand'),
    priceBucket:  get('price'),
    onSale:       get('sale') === '1',
    sort:         get('sort'),
  };
}

export function applyFilters(products: Product[], f: FilterValues): Product[] {
  let out = products;

  if (f.brand) {
    out = out.filter((p) => slugify(p.brand_name) === f.brand);
  }

  if (f.priceBucket && PRICE_BUCKETS[f.priceBucket]) {
    const [min, max] = PRICE_BUCKETS[f.priceBucket];
    out = out.filter((p) => p.base_price >= min && p.base_price < max);
  }

  if (f.onSale) {
    out = out.filter((p) => p.compare_at_price != null && p.compare_at_price > p.base_price);
  }

  switch (f.sort) {
    case 'price-asc':
      out = [...out].sort((a, b) => a.base_price - b.base_price);
      break;
    case 'price-desc':
      out = [...out].sort((a, b) => b.base_price - a.base_price);
      break;
    case 'name-asc':
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'discount-desc':
      out = [...out].sort((a, b) => {
        const da = a.compare_at_price ? (a.compare_at_price - a.base_price) / a.compare_at_price : 0;
        const db = b.compare_at_price ? (b.compare_at_price - b.base_price) / b.compare_at_price : 0;
        return db - da;
      });
      break;
  }

  return out;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
