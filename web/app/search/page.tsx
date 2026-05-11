import { ProductCard } from '@/components/ProductCard';
import { Filters } from '@/components/Filters';
import { searchProducts, getBrands } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';
import { applyFilters, readFilters } from '@/lib/filters';

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

  const [results, brands, alerted] = await Promise.all([
    q ? searchProducts(q) : Promise.resolve([]),
    getBrands(),
    getUserAlertedProductIds(),
  ]);

  const filtered = applyFilters(results, filters);

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
      {q ? (
        <>
          {results.length > 0 && <Filters brands={brands} resultCount={filtered.length} />}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {filtered.map((p) => <ProductCard key={p.id} product={p} tracking={alerted.has(p.id)} />)}
            </div>
          ) : (
            <p className="text-dim">No matches. Try a different brand or product name.</p>
          )}
        </>
      ) : (
        <p className="text-dim">Type to search across the catalogue.</p>
      )}
    </section>
  );
}
