import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { getBrandBySlug, getBrands, getProductsByBrandId } from '@/lib/data';

export const revalidate = 60;

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: 'Not found' };
  return {
    title: `${brand.name} clippers, trimmers & shavers`,
    description: `Every ${brand.name} barber tool we track, with live UK prices.`,
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();
  const products = await getProductsByBrandId(brand.id);
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Brand</div>
        <h1 className="text-5xl font-extrabold tracking-tightest mb-2">{brand.name}</h1>
        <p className="text-muted">{products.length} products tracked</p>
      </div>
      {products.length === 0 ? (
        <p className="text-dim">No products tracked for this brand yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
