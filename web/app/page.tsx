import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getAllProducts, getBrands } from '@/lib/data';

export const revalidate = 600;

export default async function HomePage() {
  const [products, brands] = await Promise.all([getAllProducts(), getBrands()]);
  const trending = products.filter((p) => p.trending).slice(0, 8);
  const newReleases = products.filter((p) => p.is_new).slice(0, 4);
  const featured = products.slice(0, 8);

  return (
    <>
      {/* HERO — compact so trending shows above the fold */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-12 md:pt-14 md:pb-14">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
          UK · Price comparison · Updated daily
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tightest leading-[1] text-ink max-w-3xl">
          Every barber tool.{' '}
          <span className="text-dim">One price you can trust.</span>
        </h1>
        <p className="text-base md:text-lg text-muted max-w-xl mt-5 leading-relaxed">
          Live prices for clippers, trimmers and shavers across every major UK retailer.
        </p>
        <div className="flex gap-3 flex-wrap mt-7">
          <Link
            href="/products"
            className="bg-ink text-paper px-5 py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
          >
            Browse {products.length} products →
          </Link>
          <Link
            href="#trending"
            className="text-ink px-5 py-2.5 text-sm font-semibold underline underline-offset-4 hover:text-accent transition-colors"
          >
            What's trending
          </Link>
        </div>
      </section>

      {/* TRENDING — minimal section heading */}
      {trending.length > 0 && (
        <Section
          id="trending"
          eyebrow="What barbers are buying"
          title="Trending"
          link={{ label: 'View all', href: '/products' }}
        >
          <ProductGrid products={trending} />
        </Section>
      )}

      {/* NEW RELEASES on cream — visual rhythm */}
      {newReleases.length > 0 && (
        <section className="bg-cream py-24 mt-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex justify-between items-end mb-12">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">
                  Fresh in
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink">New releases</h2>
              </div>
              <Link href="/products" className="text-sm font-semibold text-ink hover:text-accent">View all →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
              {newReleases.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* BRANDS — typographic list, not card grid */}
      <Section eyebrow="Track every name" title="Brands">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/brands/${b.slug}`}
              className="block py-4 border-t border-line text-lg font-semibold text-ink hover:text-accent transition-colors"
            >
              {b.name} <span className="text-dim text-xs ml-1">→</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* CATALOGUE PREVIEW */}
      <Section
        eyebrow="From the catalogue"
        title="The whole list"
        link={{ label: `See all ${products.length} →`, href: '/products' }}
      >
        <ProductGrid products={featured} />
      </Section>

      {/* CLOSING STATEMENT — minimal, no graphics */}
      <section className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-5">
          Built by a barber, for barbers.
        </h2>
        <p className="text-muted text-lg leading-relaxed">
          The app launches on iOS &amp; Android soon — with push alerts on price drops, restocks
          and VAT-free events. Sign up for early access at{' '}
          <a href="mailto:info@clipprr.co.uk" className="text-ink underline underline-offset-4 hover:text-accent">
            info@clipprr.co.uk
          </a>.
        </p>
      </section>
    </>
  );
}

function Section({
  id, eyebrow, title, link, children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  link?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="flex justify-between items-end mb-8">
        <div>
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-2">
              {eyebrow}
            </div>
          )}
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tightest text-ink">{title}</h2>
        </div>
        {link && (
          <Link href={link.href} className="text-sm font-semibold text-ink hover:text-accent">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ProductGrid({ products }: { products: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-extrabold tracking-tightest text-ink">{n}</div>
      <div className="text-sm text-muted mt-1">{l}</div>
    </div>
  );
}
