import { ProductCard } from '@/components/ProductCard';
import { searchProducts } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';

export const revalidate = 60;
export const metadata = { title: 'Search' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const [results, alerted] = await Promise.all([
    q ? searchProducts(q) : Promise.resolve([]),
    getUserAlertedProductIds(),
  ]);
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
          <p className="text-muted mb-8">{results.length} results for &quot;{q}&quot;</p>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {results.map((p) => <ProductCard key={p.id} product={p} tracking={alerted.has(p.id)} />)}
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
