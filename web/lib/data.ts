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
// Colour variants — finds sibling products of the same model in other
// colours / finishes (Black, Gold, Matte Black, etc.). We keep each colour
// as its own product (matches the Sole Supplier / StockX pattern for SKU
// colourways) and surface the relationship on the product page so visitors
// can hop between siblings.
// ---------------------------------------------------------------------------

const VARIANT_COLOURS = [
  // Multi-word first so 'Rose Gold' doesn't get mistaken for 'Rose' + 'Gold'
  'Rose Gold', 'Matte Black', 'Pearl White', 'Dark Teal',
  'Black', 'White', 'Gold', 'Silver', 'Red', 'Blue', 'Green', 'Yellow',
  'Pink', 'Orange', 'Purple', 'Chrome', 'Bronze', 'Camo', 'Burgundy',
  'Rainbow',
];

/**
 * Pulls a colour token out of the product name if there is one. Looks for the
 * colour at the end as either `(Colour)`, `- Colour`, or just trailing
 * `Colour`.
 */
function detectColour(name: string): string | null {
  for (const c of VARIANT_COLOURS) {
    const cEsc = c.replace(/\+/g, '\\+');
    const re = new RegExp(`(?:\\(|\\s|-\\s*|–\\s*)${cEsc}\\b\\s*\\)?\\s*$`, 'i');
    if (re.test(name)) return c;
  }
  return null;
}

/**
 * Strips the colour (and trailing parentheses) off a product name to give a
 * shared "base" key that groups colour siblings together.
 */
function variantBaseName(name: string): string {
  let n = name.replace(/\s*\([^)]+\)\s*$/, '');
  for (const c of VARIANT_COLOURS) {
    const cEsc = c.replace(/\+/g, '\\+');
    n = n.replace(new RegExp(`\\b${cEsc}\\b`, 'i'), '');
  }
  return n
    .replace(/\s+-\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export type ColourSibling = {
  product_id: string;
  product_slug: string;
  product_name: string;
  colour: string;
  image_key: string | null;
  image_url: string | null;
  current_price: number;
  in_stock: boolean;
};

/**
 * Returns sibling products in other colours for the given product, sorted
 * by current price ascending so the cheapest colour appears first. Empty
 * array if the product has no detectable colour or no siblings.
 */
export async function getColourSiblings(productId: string): Promise<ColourSibling[]> {
  const all = await getAllProducts();
  const self = all.find((p) => p.id === productId);
  if (!self) return [];
  const colour = detectColour(self.name);
  if (!colour) return [];
  const base = variantBaseName(self.name);

  return all
    .filter((p) => {
      if (p.id === productId) return false;
      if (p.brand_id !== self.brand_id) return false;
      const otherColour = detectColour(p.name);
      if (!otherColour) return false;
      return variantBaseName(p.name) === base;
    })
    .map((p) => ({
      product_id: p.id,
      product_slug: p.slug,
      product_name: p.name,
      colour: detectColour(p.name) ?? '',
      image_key: p.image_key,
      image_url: p.image_url,
      current_price: p.base_price,
      in_stock: p.in_stock,
    }))
    .sort((a, b) => a.current_price - b.current_price);
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

// ---------------------------------------------------------------------------
// News feed — auto-generated from price_history. Surfaces three kinds of
// events the user actually cares about: price drops, restocks, and brand-new
// products in the catalogue. Sole Supplier's sticky daily-return loop is
// built on top of exactly this kind of feed; the difference is we don't
// need an editorial team because the scraper already collects the data.
// ---------------------------------------------------------------------------

export type NewsEvent =
  | {
      type: 'price-drop';
      product_id: string;
      product_slug: string;
      product_name: string;
      brand_name: string;
      retailer_id: string;
      retailer_name: string;
      oldPrice: number;
      newPrice: number;
      savings: number;
      when: string;
    }
  | {
      type: 'restock';
      product_id: string;
      product_slug: string;
      product_name: string;
      brand_name: string;
      retailer_id: string;
      retailer_name: string;
      price: number;
      when: string;
    }
  | {
      type: 'new-product';
      product_id: string;
      product_slug: string;
      product_name: string;
      brand_name: string;
      when: string;
    }
  | {
      type: 'article';
      title: string;
      url: string;                // outbound link to the original source
      source: string;             // e.g. "Barber Beauty Supply UK"
      excerpt: string | null;
      image_url: string | null;
      when: string;
    };

/**
 * Builds the chronological news feed by replaying the last N days of price
 * history. Returns events sorted newest first.
 *
 * A price drop counts when the new price is at least 5% AND at least £3 lower
 * than the previous snapshot — tighter thresholds would surface scraper jitter
 * (£0.50 round-trip changes happen constantly on Amazon marketplace).
 *
 * A restock is the moment in_stock flips from false to true. We only emit one
 * restock per (product, retailer) per scan, even if it flapped multiple times.
 */
export async function getNewsItems(days: number = 14, limit: number = 30): Promise<NewsEvent[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [historyRes, productsRes, retailersRes] = await Promise.all([
    supabase
      .from('price_history')
      .select('product_id, retailer_id, price, in_stock, seen_at')
      .gte('seen_at', since)
      .order('seen_at', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, brand_id, created_at')
      .gte('created_at', since),
    supabase.from('retailers').select('id, name'),
  ]);

  const brandMap = await getBrandNameMap();
  const retailerMap = new Map<string, string>(
    (retailersRes.data ?? []).map((r: any) => [r.id, r.name]),
  );
  const productsById = new Map<string, any>();
  // Fetch all products once for name + brand lookup
  const allProducts = await getAllProducts();
  for (const p of allProducts) productsById.set(p.id, p);

  const events: NewsEvent[] = [];

  // Group history by (product, retailer) and walk chronologically
  const groups = new Map<string, any[]>();
  for (const row of historyRes.data ?? []) {
    const key = `${row.product_id}|${row.retailer_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  for (const [key, rows] of groups) {
    const [productId, retailerId] = key.split('|');
    const product = productsById.get(productId);
    if (!product) continue; // product deleted since the snapshot
    const retailerName = retailerMap.get(retailerId) ?? retailerId;

    let prev: any = null;
    let restockEmitted = false;
    let dropEmitted = false;
    for (const row of rows) {
      if (prev) {
        // Restock: previously OOS, now in stock. One per scan window.
        if (!prev.in_stock && row.in_stock && !restockEmitted) {
          events.push({
            type: 'restock',
            product_id: product.id,
            product_slug: product.slug,
            product_name: product.name,
            brand_name: product.brand_name,
            retailer_id: retailerId,
            retailer_name: retailerName,
            price: Number(row.price),
            when: row.seen_at,
          });
          restockEmitted = true;
        }

        // Price drop: meaningful only when in stock now (an OOS price is fake).
        // Need >= 5% AND >= £3 to dodge scraper jitter.
        if (row.in_stock && row.price < prev.price && !dropEmitted) {
          const savings = Number(prev.price) - Number(row.price);
          const pct = savings / Number(prev.price);
          if (pct >= 0.05 && savings >= 3) {
            events.push({
              type: 'price-drop',
              product_id: product.id,
              product_slug: product.slug,
              product_name: product.name,
              brand_name: product.brand_name,
              retailer_id: retailerId,
              retailer_name: retailerName,
              oldPrice: Number(prev.price),
              newPrice: Number(row.price),
              savings,
              when: row.seen_at,
            });
            dropEmitted = true;
          }
        }
      }
      prev = row;
    }
  }

  // New products added in the window
  for (const p of productsRes.data ?? []) {
    const product = productsById.get(p.id);
    if (!product) continue;
    events.push({
      type: 'new-product',
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      brand_name: product.brand_name,
      when: p.created_at,
    });
  }

  // Editorial articles scraped from third-party barber blogs. Same window
  // as the data-events so the feed stays coherent. Falls back to nothing
  // if the table doesn't exist yet (migration 005 not applied).
  try {
    const { data: articles } = await supabase
      .from('news_articles')
      .select('title, url, source, excerpt, image_url, published_at')
      .gte('published_at', since)
      .order('published_at', { ascending: false });
    for (const a of articles ?? []) {
      events.push({
        type: 'article',
        title: a.title,
        url: a.url,
        source: a.source,
        excerpt: a.excerpt,
        image_url: a.image_url,
        when: a.published_at,
      });
    }
  } catch {
    // table missing — no articles in feed yet
  }

  // Newest first, capped at limit
  return events
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, limit);
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
