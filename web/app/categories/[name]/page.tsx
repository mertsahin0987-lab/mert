import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { getCategories, getProductsByCategory } from '@/lib/data';

export const revalidate = 600;

export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map((c) => ({ name: c.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return {
    title: `${cap} — UK price comparison`,
    description: `Every ${name} we track. Live prices from major UK retailers.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const products = await getProductsByCategory(name);
  if (!products.length) notFound();
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Category</div>
        <h1 className="text-5xl font-extrabold tracking-tightest mb-2">{cap}</h1>
        <p className="text-muted">{products.length} products</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
