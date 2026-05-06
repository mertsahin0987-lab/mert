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
  image_url: string | null;
  base_price: number;
  compare_at_price: number | null;  // RRP / pre-sale price; if > base_price, it's on sale
  description: string | null;
  is_new: boolean;
  trending: boolean;
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

function toProduct(p: any, brandName: string): Product {
  return {
    id: p.id,
    name: p.name,
    slug: slugify(p.name),
    brand_name: brandName,
    brand_id: p.brand_id,
    category: p.category,
    image_url: p.image_url,
    base_price: Number(p.base_price),
    compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    description: p.description,
    is_new: p.is_new,
    trending: p.trending,
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
  const [productsRes, brandMap] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, brand_id, category, image_url, base_price, compare_at_price, description, is_new, trending')
      .order('id'),
    getBrandNameMap(),
  ]);
  return (productsRes.data ?? []).map((p: any) =>
    toProduct(p, brandMap.get(p.brand_id) ?? p.brand_id)
  );
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
