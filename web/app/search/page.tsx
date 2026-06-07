import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { FilterSidebar, FilterTopbar, FiltersProvider } from '@/components/Filters';
import { searchProducts, getBrands, getCategories, slugify } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';
import { applyFilters, readFilters, facetCounts } from '@/lib/filters';

// Curated suggestions shown in the search empty state. Picking the brands +
// categories most people actually search for, so users who don't know what
// to type have a one-tap shortcut to something interesting.
const SUGGESTED_BRANDS = ['Wahl', 'BaByliss PRO', 'JRL', 'StyleCraft', 'Gamma+', 'Andis'];
const SUGGESTED_CATEGORIES = ['Clippers', 'Trimmers', 'Shavers', 'Sets'];

export const revalidate = 60;
export const metadata = { title: 'Search' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const filters = readFilters(sp);

  const [results, brands, categories, alerted] = await Promise.all([
    q ? searchProducts(q) : Promise.resolve([]),
    getBrands(),
    getCategories(),
    getUserAlertedProductIds(),
  ]);

  const filtered = applyFilters(results, filters);
  const counts = facetCounts(results, filters);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Search</div>
        <form action="/search">
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search clippers, trimmers, brands..."
            className="w-full bg-cream border border-line rounded-md px-6 py-4 text-lg focus:outline-none focus:border-ink"
          />
        </form>
      </div>

      {!q || results.length === 0 ? (
        <EmptyState
          message={
            results.length === 0 && q
              ? `No matches for "${q}". Try a different brand or product name.`
              : 'Type a brand or product, or jump straight to one of these:'
          }
        />
      ) : (
        <FiltersProvider>
          <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] gap-10">
            <FilterSidebar
              brands={brands}
              categories={categories}
              brandCounts={counts.brand}
              categoryCounts={counts.category}
              priceCounts={counts.price}
            />
            <div>
              <FilterTopbar resultCount={filtered.length} />
              {filtered.length === 0 ? (
                <p className="text-dim text-center py-16">No products match those filters.</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
                  {filtered.map((p) => <ProductCard key={p.id} product={p} tracking={alerted.has(p.id)} />)}
                </div>
              )}
            </div>
          </div>
        </FiltersProvider>
      )}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4">
      <p className="text-dim mb-8">{message}</p>

      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-dim mb-3">Popular brands</div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_BRANDS.map((b) => (
            <Link
              key={b}
              href={`/brands/${slugify(b)}`}
              className="text-sm font-semibold text-ink border border-line rounded-full px-4 py-1.5 hover:border-ink hover:bg-ink hover:text-paper transition-colors"
            >
              {b}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-dim mb-3">Browse by type</div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/categories/${c.toLowerCase()}`}
              className="text-sm font-semibold text-ink border border-line rounded-full px-4 py-1.5 hover:border-ink hover:bg-ink hover:text-paper transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
