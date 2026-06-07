/**
 * Server-side data fetchers — called from React Server Components.
 * Each function returns clean, typed data ready for the UI.
 */

import { supabase } from './supabase';

export type Brand = { id: string; name: string; slug: string };

export type Product = {
  id: string;
  name: string;
  slug: string;          // url-safe version of the name
  brand_name: string;
  brand_id: string;
  category: string;
  image_key: string | null;
  image_url: string | null;
  base_price: number;
  compare_at_price: number | null;  // RRP / pre-sale price; if > base_price, it's on sale
  description: string | null;
  is_new: boolean;
  trending: boolean;
  in_stock: boolean;     // true if ANY retailer reports it in stock (or no data yet)
};

export type RetailerPrice = {
  retailer_id: string;
  retailer_name: string;
  price: number;
  url: string | null;
  in_stock: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toBrand(b: any): Brand {
  return { id: b.id, name: b.name, slug: slugify(b.name) };
}

function toProduct(p: any, brandName: string, inStock: boolean = true): Product {
  return {
    id: p.id,
    name: p.name,
    slug: slugify(p.name),
    brand_name: brandName,
    brand_id: p.brand_id,
    category: p.category,
    image_key: p.image_key ?? null,
    image_url: p.image_url,
    base_price: Number(p.base_price),
    compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    description: p.description,
    is_new: p.is_new,
    trending: p.trending,
    in_stock: inStock,
  };
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export async function getBrands(): Promise<Brand[]> {
  const { data } = await supabase.from('brands').select('id, name').order('name');
  return (data ?? []).map(toBrand);
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const all = await getBrands();
  return all.find((b) => b.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

async function getBrandNameMap(): Promise<Map<string, string>> {
  const { data } = await supabase.from('brands').select('id, name');
  return new Map((data ?? []).map((b: any) => [b.id, b.name]));
}

export async function getAllProducts(): Promise<Product[]> {
  const [productsRes, brandMap, stockMap] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, brand_id, category, image_key, image_url, base_price, compare_at_price, description, is_new, trending')
      .order('id'),
    getBrandNameMap(),
    getProductStockMap(),
  ]);
  return (productsRes.data ?? []).map((p: any) =>
    toProduct(
      p,
      brandMap.get(p.brand_id) ?? p.brand_id,
      // If product has no price rows yet, default to in-stock so it doesn't
      // hide. Only mark OOS if every retailer explicitly reports in_stock:false.
      stockMap.get(p.id) ?? true,
    )
  );
}

/**
 * Returns a map of product_id → in_stock (true if at least one retailer has it).
 * Used by getAllProducts so each Product carries its aggregate stock state.
 */
async function getProductStockMap(): Promise<Map<string, boolean>> {
  const { data } = await supabase.from('prices').select('product_id, in_stock');
  const map = new Map<string, boolean>();
  for (const row of data ?? []) {
    if (map.get(row.product_id) === true) continue; // already known in-stock
    map.set(row.product_id, row.in_stock || (map.get(row.product_id) ?? false));
  }
  return map;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  // Slug isn't stored in DB — load all and find. Fine at this catalogue size.
  const all = await getAllProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getProductsByBrandId(brandId: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.brand_id === brandId);
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.category.toLowerCase() === category.toLowerCase());
}

// ---------------------------------------------------------------------------
// Trending — driven by real retailer-click counts when we have them, falls
// back to a randomised pick from the catalogue while click data is sparse.
//
// ISR caches the rendered home page for 60s, so within any minute every
// visitor sees the same "random" set; on the next rebuild the set rotates.
// That's the behaviour we want — fresh enough to keep the home page lively,
// stable enough that anyone sharing a link gets a coherent screenshot.
// ---------------------------------------------------------------------------

export async function getTrendingProducts(limit: number = 8): Promise<Product[]> {
  // Pull last-7-day click counts. If the table doesn't exist yet (migration
  // not applied) or there's simply no click data, we'll fall through to the
  // randomised path below — never crash.
  let clickCounts = new Map<string, number>();
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('product_clicks')
      .select('product_id')
      .gte('clicked_at', since);
    for (const row of data ?? []) {
      const k = String(row.product_id);
      clickCounts.set(k, (clickCounts.get(k) ?? 0) + 1);
    }
  } catch {
    // table missing — ignore
  }

  const all = await getAllProducts();
  // Only show products that are presentable + buyable. A "trending" tile
  // pointing at an out-of-stock item with no image is a bad first impression.
  const eligible = all.filter((p) => p.in_stock && (p.image_url || p.image_key));

  if (clickCounts.size >= limit) {
    // We have real engagement data — sort by clicks, break ties at random
    return eligible
      .map((p) => ({ p, c: clickCounts.get(p.id) ?? 0, r: Math.random() }))
      .sort((a, b) => b.c - a.c || b.r - a.r)
      .slice(0, limit)
      .map((x) => x.p);
  }

  // No (or sparse) click data — randomise. Shuffle in place then slice.
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  return eligible.slice(0, limit);
}

/**
 * Products sorted by their real release_date if set, falling back to
 * created_at. Anything older than 90 days is dropped — these are *new*
 * releases, not catalogue history.
 */
export async function getNewReleases(limit: number = 4): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, brand_id, category, image_key, image_url, base_price, compare_at_price, description, is_new, trending, release_date, created_at')
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const brandMap = await getBrandNameMap();
  const stockMap = await getProductStockMap();
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;

  return data
    .filter((p: any) => {
      // Must look complete: image + price + recent enough to be a "new release"
      if (!p.image_key && !p.image_url) return false;
      const when = new Date(p.release_date ?? p.created_at).getTime();
      return when >= cutoff;
    })
    .slice(0, limit * 2)
    .map((p: any) => toProduct(p, brandMap.get(p.brand_id) ?? p.brand_id, stockMap.get(p.id) ?? true))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Prices for a product
// ---------------------------------------------------------------------------

export async function getProductPrices(productId: string): Promise<RetailerPrice[]> {
  const { data } = await supabase
    .from('prices')
    .select('retailer_id, price, url, in_stock, retailers(name)')
    .eq('product_id', productId)
    .order('price', { ascending: true });
  return (data ?? []).map((r: any) => ({
    retailer_id: r.retailer_id,
    retailer_name: r.retailers?.name ?? r.retailer_id,
    price: Number(r.price),
    url: r.url,
    in_stock: r.in_stock,
  }));
}

// ---------------------------------------------------------------------------
// Sale items — products with compare_at_price > base_price
// ---------------------------------------------------------------------------

export async function getSaleProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all
    .filter((p) => p.compare_at_price != null && p.compare_at_price > p.base_price)
    .sort((a, b) => {
      // Biggest discount first
      const da = (a.compare_at_price! - a.base_price) / a.compare_at_price!;
      const db = (b.compare_at_price! - b.base_price) / b.compare_at_price!;
      return db - da;
    });
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const all = await getAllProducts();
  return all.filter((p) =>
    p.name.toLowerCase().includes(q) ||
    p.brand_name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Categories — derived from products
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<string[]> {
  const all = await getAllProducts();
  return [...new Set(all.map((p) => p.category))].sort();
}
