/**
 * Server helpers for reading the current user's alert state. RLS means we
 * can use the standard auth client — no service role needed.
 */

import { createServerSupabase } from './supabase-server';

/**
 * Returns the set of product IDs the current user has bells on.
 * Returns an empty Set if not signed in. Cheap (one indexed query),
 * safe to call from any Server Component that needs the bell state.
 */
export async function getUserAlertedProductIds(): Promise<Set<string>> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from('user_alerts')
    .select('product_id')
    .eq('user_id', user.id);

  return new Set((data ?? []).map((r) => r.product_id));
}

export type AlertedProduct = {
  alert_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  brand_name: string;
  image_key: string | null;
  current_price: number;
  baseline_price: number | null;
  created_at: string;
};

/**
 * Returns every product the current user has belled, joined with the
 * current product data so the alerts page can render rich cards.
 */
export async function getUserAlerts(): Promise<AlertedProduct[]> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // First get the raw alerts rows (joined with products via FK)
  const { data } = await supabase
    .from('user_alerts')
    .select(`
      id,
      product_id,
      last_seen_price,
      created_at,
      products (
        id,
        name,
        brand_id,
        image_key,
        base_price
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!data) return [];

  // Brand names lookup (small list, single query)
  const { data: brands } = await supabase.from('brands').select('id, name');
  const brandMap = Object.fromEntries((brands ?? []).map((b: any) => [b.id, b.name]));

  return data.map((row: any) => ({
    alert_id: row.id,
    product_id: row.product_id,
    product_name: row.products?.name ?? 'Unknown product',
    product_slug: slugify(row.products?.name ?? ''),
    brand_name: brandMap[row.products?.brand_id] ?? '',
    image_key: row.products?.image_key ?? null,
    current_price: Number(row.products?.base_price ?? 0),
    baseline_price: row.last_seen_price != null ? Number(row.last_seen_price) : null,
    created_at: row.created_at,
  }));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
