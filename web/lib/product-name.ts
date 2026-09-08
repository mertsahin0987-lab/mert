/**
 * Pure product-name helpers, safe to import from client components.
 *
 * Kept out of `./data.ts` on purpose: data.ts transitively imports the
 * service-role Supabase client (server-only), which means any client
 * component importing from it fails the Next.js build.
 */

/**
 * Full display name for a product — "<Brand> <Name>", but skips the brand
 * prefix when the name already carries it (~200/225 of the catalogue).
 * Case-insensitive because the DB has "BaByliss PRO" (brand) but names like
 * "BaByliss Pro Lo-Pro FX Compact …".
 */
export function fullProductName(product: { name: string; brand_name: string }): string {
  const name = product.name;
  const brand = product.brand_name;
  return name.toLowerCase().startsWith(brand.toLowerCase() + ' ') ? name : `${brand} ${name}`;
}
