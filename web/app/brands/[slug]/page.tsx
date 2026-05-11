import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { Filters } from '@/components/Filters';
import { getBrandBySlug, getBrands, getProductsByBrandId } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';
import { applyFilters, readFilters } from '@/lib/filters';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: 'Not found' };
  return {
    title: `${brand.name} clippers, trimmers & shavers`,
    description: `Every ${brand.name} barber tool we track, with live UK prices.`,
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const filters = readFilters(sp);

  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const [products, brands, alerted] = await Promise.all([
    getProductsByBrandId(brand.id),
    getBrands(),
    getUserAlertedProductIds(),
  ]);

  const filtered = applyFilters(products, filters);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Brand</div>
        <h1 className="text-5xl font-extrabold tracking-tightest mb-2">{brand.name}</h1>
        <p className="text-muted">{products.length} products tracked</p>
      </div>

      {/* Brand pages hide the brand filter (everything is the same brand) */}
      <Filters brands={brands} hideBrand resultCount={filtered.length} />

      {filtered.length === 0 ? (
        <p className="text-dim text-center py-16">No products match those filters.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {filtered.map((p) => <ProductCard key={p.id} product={p} tracking={alerted.has(p.id)} />)}
        </div>
      )}
    </section>
  );
}
