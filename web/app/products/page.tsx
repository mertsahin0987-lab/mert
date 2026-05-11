import { ProductCard } from '@/components/ProductCard';
import { FilterSidebar, FilterTopbar, FiltersProvider } from '@/components/Filters';
import { getAllProducts, getBrands, getCategories } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';
import { applyFilters, readFilters, facetCounts } from '@/lib/filters';

export const revalidate = 60;
export const metadata = { title: 'All products' };

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = readFilters(sp);

  const [products, brands, categories, alerted] = await Promise.all([
    getAllProducts(),
    getBrands(),
    getCategories(),
    getUserAlertedProductIds(),
  ]);

  const filtered = applyFilters(products, filters);
  const counts = facetCounts(products, filters);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Catalogue</div>
        <h1 className="text-5xl font-extrabold tracking-tightest mb-2">All products</h1>
        <p className="text-muted">{products.length} barber tools tracked across UK retailers</p>
      </div>

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
    </section>
  );
}
