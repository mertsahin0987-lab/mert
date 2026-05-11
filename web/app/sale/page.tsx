import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getSaleProducts } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';

export const revalidate = 60;
export const metadata = {
  title: 'Sale — barber tool deals',
  description:
    'Every barber tool currently discounted across UK retailers. Compare deals on clippers, trimmers and shavers.',
};

export default async function SalePage() {
  const [products, alerted] = await Promise.all([
    getSaleProducts(),
    getUserAlertedProductIds(),
  ]);
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-red-600 mb-3">
          Live deals · Updated daily
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tightest leading-[1] text-ink">
          <span className="text-red-600">Sale.</span>
        </h1>
        <p className="text-base md:text-lg text-muted mt-4 max-w-xl leading-relaxed">
          Every barber tool currently discounted across our retailers — sorted by biggest saving.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="bg-cream rounded-lg p-12 text-center">
          <h2 className="text-2xl font-bold text-ink mb-2">No deals live right now.</h2>
          <p className="text-muted mb-6">
            Check back soon — we update daily, and most deals appear at month-end and during VAT-free events.
          </p>
          <Link
            href="/products"
            className="inline-block bg-ink text-paper px-5 py-2.5 text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            Browse the full catalogue →
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-dim mb-8">
            {products.length} {products.length === 1 ? 'product' : 'products'} on sale right now.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} tracking={alerted.has(p.id)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
