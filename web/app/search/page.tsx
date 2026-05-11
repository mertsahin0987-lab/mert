import { ProductCard } from '@/components/ProductCard';
import { FilterSidebar, FilterTopbar, FiltersProvider } from '@/components/Filters';
import { searchProducts, getBrands, getCategories } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';
import { applyFilters, readFilters, facetCounts } from '@/lib/filters';

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

      {!q ? (
        <p className="text-dim">Type to search across the catalogue.</p>
      ) : results.length === 0 ? (
        <p className="text-dim">No matches for &quot;{q}&quot;. Try a different brand or product name.</p>
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
