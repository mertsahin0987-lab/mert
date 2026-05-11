import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { FilterSidebar, FilterTopbar, FiltersProvider } from '@/components/Filters';
import { getCategories, getProductsByCategory, getBrands } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';
import { applyFilters, readFilters, facetCounts } from '@/lib/filters';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return {
    title: `${cap} — UK price comparison`,
    description: `Every ${name} we track. Live prices from major UK retailers.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ name }, sp] = await Promise.all([params, searchParams]);
  const filters = readFilters(sp);

  const [products, brands, allCats, alerted] = await Promise.all([
    getProductsByCategory(name),
    getBrands(),
    getCategories(),
    getUserAlertedProductIds(),
  ]);
  if (!products.length) notFound();

  const filtered = applyFilters(products, filters);
  const counts = facetCounts(products, filters);
  const cap = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Category</div>
        <h1 className="text-5xl font-extrabold tracking-tightest mb-2">{cap}</h1>
        <p className="text-muted">{products.length} products tracked</p>
      </div>

      <FiltersProvider>
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] gap-10">
          <FilterSidebar
            brands={brands}
            categories={allCats}
            brandCounts={counts.brand}
            categoryCounts={counts.category}
            priceCounts={counts.price}
            hideCategory
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
    </section>
  );
}
