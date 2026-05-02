/**
 * DataContext — single source of truth for products/brands in the app.
 *
 * Strategy:
 *   1. On mount, fetch live data from Supabase (products + brands + prices + colours).
 *   2. Join each row with its bundled local image (productImages / brandLogos
 *      from constants/generatedData.ts — these are static require() maps that
 *      Metro can resolve at build time).
 *   3. While loading, expose the offline-bundled data from generatedData.ts
 *      so the app renders instantly with real content. When the live fetch
 *      lands, swap in the fresh data.
 *   4. On any network error, keep using the bundled data — app stays usable.
 *
 * Result: the screens read products/brands from a hook instead of a static
 * import, but they don't have to deal with loading spinners or error states.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import {
  generatedProducts,
  generatedBrands,
  productImages,
  brandLogos,
} from '../constants/generatedData';
import type { Product, Brand, ColorVariant } from '../constants/MockData';

type DataState = {
  products: Product[];
  brands: Brand[];
  loading: boolean;       // true on first fetch only — false once we have ANY data
  refreshing: boolean;    // true while a background refresh is in flight
  error: string | null;
  refresh: () => Promise<void>;
};

const DataContext = createContext<DataState | null>(null);

// =========================================================================
// Supabase row shapes — mirror the SQL schema in supabase/init.sql
// =========================================================================

type DbBrand = { id: string; name: string; logo_key: string };

type DbProduct = {
  id: string;
  name: string;
  brand_id: string;
  category: string;
  image_key: string;
  base_price: number;
  description: string | null;
  is_new: boolean;
  trending: boolean;
  upcoming_release: boolean;
  release_date: string | null;
};

type DbPrice = {
  product_id: string;
  retailer_id: string;
  price: number;
  url: string | null;
  in_stock: boolean;
  retailers: { name: string } | null;
};

type DbColor = {
  product_id: string;
  name: string;
  hex: string;
  image_key: string | null;
  linked_product_id: string | null;
};

// =========================================================================
// Live → app shape mapper
// =========================================================================

function pickProductImage(key: string | null) {
  if (key && productImages[key]) return productImages[key];
  // Fall back to the first bundled image so RN doesn't crash on undefined source
  const first = Object.values(productImages)[0];
  return first;
}

function pickBrandLogo(key: string | null) {
  if (key && brandLogos[key]) return brandLogos[key];
  const first = Object.values(brandLogos)[0];
  return first;
}

async function fetchLiveData(): Promise<{ products: Product[]; brands: Brand[] }> {
  // Run all four queries in parallel — none depend on each other.
  const [brandsRes, productsRes, pricesRes, colorsRes] = await Promise.all([
    supabase.from('brands').select('id, name, logo_key').order('id'),
    supabase
      .from('products')
      .select(
        'id, name, brand_id, category, image_key, base_price, description, is_new, trending, upcoming_release, release_date'
      )
      .order('id'),
    supabase
      .from('prices')
      .select('product_id, retailer_id, price, url, in_stock, retailers(name)'),
    supabase
      .from('product_colors')
      .select('product_id, name, hex, image_key, linked_product_id'),
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (productsRes.error) throw productsRes.error;
  if (pricesRes.error) throw pricesRes.error;
  if (colorsRes.error) throw colorsRes.error;

  const dbBrands = (brandsRes.data ?? []) as DbBrand[];
  const dbProducts = (productsRes.data ?? []) as DbProduct[];
  const dbPrices = (pricesRes.data ?? []) as unknown as DbPrice[];
  const dbColors = (colorsRes.data ?? []) as DbColor[];

  // Map brand_id → brand name (the app's Product.brand field is the name)
  const brandNameById = new Map(dbBrands.map(b => [b.id, b.name]));

  // Group prices and colours by product_id
  const pricesByProduct = new Map<string, Product['stores']>();
  for (const p of dbPrices) {
    const list = pricesByProduct.get(p.product_id) ?? [];
    list.push({
      name: p.retailers?.name ?? p.retailer_id,
      url: p.url ?? '',
      inStock: p.in_stock,
      price: Number(p.price),
    });
    pricesByProduct.set(p.product_id, list);
  }

  const colorsByProduct = new Map<string, ColorVariant[]>();
  for (const c of dbColors) {
    const list = colorsByProduct.get(c.product_id) ?? [];
    list.push({
      name: c.name,
      hex: c.hex,
      ...(c.image_key ? { image: pickProductImage(c.image_key) } : {}),
      ...(c.linked_product_id ? { productId: c.linked_product_id } : {}),
    });
    colorsByProduct.set(c.product_id, list);
  }

  const brands: Brand[] = dbBrands.map(b => ({
    id: b.id,
    name: b.name,
    logo: pickBrandLogo(b.logo_key),
  }));

  const products: Product[] = dbProducts.map(p => ({
    id: p.id,
    name: p.name,
    brand: brandNameById.get(p.brand_id) ?? p.brand_id,
    category: p.category,
    image: pickProductImage(p.image_key),
    price: Number(p.base_price),
    description: p.description ?? '',
    isNew: p.is_new,
    trending: p.trending,
    upcomingRelease: p.upcoming_release,
    ...(p.release_date ? { releaseDate: p.release_date } : {}),
    stores: pricesByProduct.get(p.id) ?? [],
    colors: colorsByProduct.get(p.id) ?? [],
  }));

  return { products, brands };
}

// =========================================================================
// Provider
// =========================================================================

export function DataProvider({ children }: { children: ReactNode }) {
  // Seed with bundled data so the UI never flashes empty.
  const [products, setProducts] = useState<Product[]>(generatedProducts);
  const [brands, setBrands] = useState<Brand[]>(generatedBrands);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const live = await fetchLiveData();
      setProducts(live.products);
      setBrands(live.brands);
      setError(null);
    } catch (e: any) {
      // Keep the bundled data in place; surface the error for debugging.
      console.warn('[DataContext] live fetch failed, using bundled data:', e?.message ?? e);
      setError(e?.message ?? 'Failed to load live data');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <DataContext.Provider value={{ products, brands, loading, refreshing, error, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

// =========================================================================
// Hooks
// =========================================================================

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

export function useProducts() {
  return useData().products;
}

export function useBrands() {
  return useData().brands;
}
