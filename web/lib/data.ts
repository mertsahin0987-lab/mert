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
// Price history — daily aggregated snapshots for the chart
// ---------------------------------------------------------------------------

export type PricePoint = {
  date: string;     // YYYY-MM-DD
  price: number;    // cheapest in-stock price that day across all retailers
  retailer_id: string;  // which retailer had it
};

export type PriceHistory = {
  points: PricePoint[];
  current: number | null;     // most recent cheapest in-stock
  lowest: number | null;       // lowest in-stock price ever seen
  lowestDate: string | null;
  highest: number | null;
  averagePrice: number | null; // mean of in-stock prices
};

/**
 * Returns daily price history for a product, focused on the cheapest in-stock
 * price each day (which matches the "From £X" headline). OOS rows are excluded
 * because they're not buyable and would skew the line downward misleadingly.
 *
 * The data is sparse (cron runs daily, so 1 snapshot per retailer per day, and
 * we only have ~3 weeks of history). We bucket by date and pick the day's
 * cheapest in-stock price.
 */
export async function getPriceHistory(productId: string): Promise<PriceHistory> {
  const { data } = await supabase
    .from('price_history')
    .select('retailer_id, price, in_stock, seen_at')
    .eq('product_id', productId)
    .eq('in_stock', true)
    .order('seen_at', { ascending: true });

  if (!data || data.length === 0) {
    return { points: [], current: null, lowest: null, lowestDate: null, highest: null, averagePrice: null };
  }

  // Bucket by date, keep the cheapest price for that day
  const byDate = new Map<string, { price: number; retailer_id: string }>();
  for (const r of data) {
    const date = String(r.seen_at).slice(0, 10);
    const price = Number(r.price);
    const cur = byDate.get(date);
    if (!cur || price < cur.price) byDate.set(date, { price, retailer_id: r.retailer_id });
  }

  const points: PricePoint[] = [...byDate.entries()]
    .map(([date, v]) => ({ date, price: v.price, retailer_id: v.retailer_id }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const prices = points.map((p) => p.price);
  const current = points[points.length - 1]?.price ?? null;
  const lowestPoint = points.reduce<PricePoint | null>(
    (acc, p) => (acc == null || p.price < acc.price ? p : acc),
    null,
  );
  const highest = prices.length ? Math.max(...prices) : null;
  const averagePrice = prices.length
    ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
    : null;

  return {
    points,
    current,
    lowest: lowestPoint?.price ?? null,
    lowestDate: lowestPoint?.date ?? null,
    highest,
    averagePrice,
  };
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
