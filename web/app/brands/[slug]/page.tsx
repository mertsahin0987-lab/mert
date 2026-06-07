import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { FilterSidebar, FilterTopbar, FiltersProvider } from '@/components/Filters';
import { getBrandBySlug, getBrands, getCategories, getProductsByBrandId } from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';
import { applyFilters, readFilters, facetCounts } from '@/lib/filters';

const SITE_URL = 'https://clipprr.co.uk';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: 'Not found' };
  const title = `${brand.name} clippers, trimmers & shavers — UK price comparison`;
  const description = `Every ${brand.name} barber tool we track, with live UK prices across major retailers.`;
  const url = `${SITE_URL}/brands/${brand.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Clipprr', type: 'website' },
    twitter: { card: 'summary', title, description },
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

  const [products, brands, categories, alerted] = await Promise.all([
    getProductsByBrandId(brand.id),
    getBrands(),
    getCategories(),
    getUserAlertedProductIds(),
  ]);

  const filtered = applyFilters(products, filters);
  const counts = facetCounts(products, filters);

  // Stats strip — gives the page a reason to exist beyond "filtered list."
  // Cheapest item, most expensive, and how many are on sale right now.
  const inStock = products.filter((p) => p.in_stock);
  const cheapest = inStock.length > 0
    ? Math.min(...inStock.map((p) => p.base_price))
    : products.length > 0
      ? Math.min(...products.map((p) => p.base_price))
      : null;
  const onSaleCount = products.filter(
    (p) => p.compare_at_price != null && p.compare_at_price > p.base_price,
  ).length;
  const categoriesPresent = [...new Set(products.map((p) => p.category))];

  // Schema.org Brand + ItemList — Google reads this for richer brand snippets
  const brandSchema = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    name: brand.name,
    url: `${SITE_URL}/brands/${brand.slug}`,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: brand.name,
        item: `${SITE_URL}/brands/${brand.slug}`,
      },
    ],
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brandSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Brand</div>
        <h1 className="text-5xl font-extrabold tracking-tightest mb-3">{brand.name}</h1>
        <p className="text-muted max-w-2xl">
          Every {brand.name} tool we track across UK barber supply retailers,
          with live prices updated daily.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 pb-12 border-b border-line">
        <Stat label="Products" value={products.length.toString()} />
        {cheapest != null && (
          <Stat label="Starting from" value={`£${cheapest.toFixed(2)}`} accent />
        )}
        <Stat
          label="On sale"
          value={onSaleCount > 0 ? `${onSaleCount} item${onSaleCount === 1 ? '' : 's'}` : '—'}
        />
        <Stat
          label="Categories"
          value={categoriesPresent.length > 0 ? categoriesPresent.join(' · ') : '—'}
        />
      </div>

      <FiltersProvider>
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] gap-10">
          <FilterSidebar
            brands={brands}
            categories={categories}
            brandCounts={counts.brand}
            categoryCounts={counts.category}
            priceCounts={counts.price}
            hideBrand
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-dim mb-1">
        {label}
      </div>
      <div
        className={`text-xl md:text-2xl font-bold ${
          accent ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
