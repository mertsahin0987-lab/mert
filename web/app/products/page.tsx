import { ProductCard } from '@/components/ProductCard';
import { getAllProducts } from '@/lib/data';

export const revalidate = 600;
export const metadata = { title: 'All products' };

export default async function AllProductsPage() {
  const products = await getAllProducts();
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Catalogue</div>
        <h1 className="text-5xl font-extrabold tracking-tightest mb-2">All products</h1>
        <p className="text-muted">{products.length} barber tools tracked across UK retailers</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
