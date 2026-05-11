/**
 * Catalogue filter + sort logic.
 *
 * Filters are read from URL search params and applied in-memory.
 * Multi-select filters are comma-separated in the URL (e.g. ?brand=wahl,jrl).
 *
 * The page server-renders both the filtered list AND the per-option counts,
 * so the sidebar shows e.g. "Wahl (51)" — counts respect every OTHER filter
 * the user has applied (so ticking another brand updates the counts).
 */

import type { Product } from './data';

export type FilterValues = {
  brands?: string[];        // brand slugs (multi)
  categories?: string[];    // category names lowercased (multi)
  priceBucket?: string;     // single
  onSale?: boolean;
  sort?: string;
};

const PRICE_BUCKETS: Record<string, [number, number]> = {
  '0-100':    [0, 100],
  '100-200':  [100, 200],
  '200-300':  [200, 300],
  '300-400':  [300, 400],
  '400-plus': [400, Infinity],
};

export const PRICE_BUCKET_LABELS: Record<string, string> = {
  '0-100':    '£0 – £100',
  '100-200':  '£100 – £200',
  '200-300':  '£200 – £300',
  '300-400':  '£300 – £400',
  '400-plus': '£400+',
};

export const SORT_LABELS: Record<string, string> = {
  'price-asc':     'Price: low to high',
  'price-desc':    'Price: high to low',
  'name-asc':      'Name: A to Z',
  'discount-desc': 'Biggest discount',
};

function getList(sp: Record<string, string | string[] | undefined>, key: string): string[] {
  const raw = sp[key];
  const str = Array.isArray(raw) ? raw[0] : raw;
  if (!str) return [];
  return str.split(',').filter(Boolean);
}

export function readFilters(searchParams: Record<string, string | string[] | undefined>): FilterValues {
  const single = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    brands:      getList(searchParams, 'brand'),
    categories:  getList(searchParams, 'category'),
    priceBucket: single('price'),
    onSale:      single('sale') === '1',
    sort:        single('sort'),
  };
}

// ---------- Individual predicates ----------
// We export these so the facet-count helper can apply every filter
// EXCEPT the one it's currently counting, giving "live" counts that
// adjust to your other choices.

const matchBrand     = (p: Product, brands: string[]) =>
  brands.length === 0 || brands.includes(slugify(p.brand_name));

const matchCategory  = (p: Product, cats: string[]) =>
  cats.length === 0 || cats.includes(p.category.toLowerCase());

const matchPrice = (p: Product, bucket?: string) => {
  if (!bucket || !PRICE_BUCKETS[bucket]) return true;
  const [min, max] = PRICE_BUCKETS[bucket];
  return p.base_price >= min && p.base_price < max;
};

const matchSale = (p: Product, onSale?: boolean) =>
  !onSale || (p.compare_at_price != null && p.compare_at_price > p.base_price);

export function applyFilters(products: Product[], f: FilterValues): Product[] {
  let out = products.filter((p) =>
    matchBrand(p, f.brands ?? []) &&
    matchCategory(p, f.categories ?? []) &&
    matchPrice(p, f.priceBucket) &&
    matchSale(p, f.onSale)
  );

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

/**
 * Returns counts for each facet option, applying every OTHER filter so the
 * numbers update as you tick boxes. Standard "ecommerce facet" behavior.
 */
export function facetCounts(products: Product[], f: FilterValues) {
  // Brand counts: apply category, price, sale — NOT brand
  const brandPool = products.filter((p) =>
    matchCategory(p, f.categories ?? []) &&
    matchPrice(p, f.priceBucket) &&
    matchSale(p, f.onSale)
  );
  const brand: Record<string, number> = {};
  for (const p of brandPool) {
    const s = slugify(p.brand_name);
    brand[s] = (brand[s] ?? 0) + 1;
  }

  // Category counts: apply brand, price, sale — NOT category
  const catPool = products.filter((p) =>
    matchBrand(p, f.brands ?? []) &&
    matchPrice(p, f.priceBucket) &&
    matchSale(p, f.onSale)
  );
  const category: Record<string, number> = {};
  for (const p of catPool) {
    const k = p.category.toLowerCase();
    category[k] = (category[k] ?? 0) + 1;
  }

  // Price bucket counts: apply brand, category, sale — NOT price
  const pricePool = products.filter((p) =>
    matchBrand(p, f.brands ?? []) &&
    matchCategory(p, f.categories ?? []) &&
    matchSale(p, f.onSale)
  );
  const price: Record<string, number> = {};
  for (const p of pricePool) {
    for (const [k, [min, max]] of Object.entries(PRICE_BUCKETS)) {
      if (p.base_price >= min && p.base_price < max) {
        price[k] = (price[k] ?? 0) + 1;
        break;
      }
    }
  }

  return { brand, category, price };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
