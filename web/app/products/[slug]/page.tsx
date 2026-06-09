import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PriceList } from '@/components/PriceList';
import { ProductCard } from '@/components/ProductCard';
import { BellButton } from '@/components/BellButton';
import {
  getAllProducts,
  getProductBySlug,
  getProductPrices,
  getProductsByBrandId,
  getColourSiblings,
  slugify,
} from '@/lib/data';
import { getUserAlertedProductIds } from '@/lib/alerts';
import { exVat } from '@/lib/vat';
import { getProductImages } from '@/lib/product-images';
import { ProductGallery } from '@/components/ProductGallery';
import { ColourVariants } from '@/components/ColourVariants';

export const revalidate = 60;

export async function generateStaticParams() {
  const all = await getAllProducts();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Not found' };

  const siteUrl = 'https://clipprr.co.uk';
  const url = `${siteUrl}/products/${product.slug}`;
  const title = `${product.brand_name} ${product.name} — UK price comparison`;
  const description = `Live prices for the ${product.brand_name} ${product.name} across every major UK retailer. Compare and find the cheapest deal today.`;

  // og:image — preview when the product is shared on WhatsApp, Twitter, etc.
  // Falls back to the site's default share image when this product has none.
  const heroImage = product.image_url
    ? product.image_url
    : product.image_key
      ? `${siteUrl}/products/${product.image_key}.png`
      : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Clipprr',
      images: heroImage ? [{ url: heroImage, width: 1000, height: 1000, alt: product.name }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [prices, sameBrand, alerted, colourSiblings] = await Promise.all([
    getProductPrices(product.id),
    getProductsByBrandId(product.brand_id),
    getUserAlertedProductIds(),
    getColourSiblings(product.id),
  ]);
  const related = sameBrand.filter((p) => p.id !== product.id).slice(0, 4);
  const isTracking = alerted.has(product.id);
  // Prefer cheapest in-stock retailer — out-of-stock prices aren't buyable, so
  // showing them as "From £X" misleads the customer (e.g. Coolblades £250 OOS
  // beating JRL in-stock £300). Fall back to any price only if nothing's in stock.
  const inStockPrices = prices.filter((p) => p.in_stock).map((p) => p.price);
  const allPrices = prices.map((p) => p.price);
  const cheapest =
    inStockPrices.length > 0
      ? Math.min(...inStockPrices)
      : allPrices.length > 0
        ? Math.min(...allPrices)
        : product.base_price;

  // Schema.org JSON-LD — tells Google "this is a Product with these offers"
  // so it can show the price/stock in search results and qualify for the
  // product carousel. One Offer per retailer; AggregateOffer summarises the
  // full range. Skipped entirely when we have no prices (no use lying about
  // availability when we don't know).
  const siteUrl = 'https://clipprr.co.uk';
  const productImages =
    product.image_url
      ? [product.image_url]
      : getProductImages(product.image_key).map((p) => `${siteUrl}${p}`);

  const productSchema = prices.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.brand_name} ${product.name}`,
    description: product.description ?? `Live UK prices for the ${product.brand_name} ${product.name} across every major retailer.`,
    image: productImages.length > 0 ? productImages : undefined,
    brand: { '@type': 'Brand', name: product.brand_name },
    category: product.category,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'GBP',
      lowPrice: Math.min(...allPrices).toFixed(2),
      highPrice: Math.max(...allPrices).toFixed(2),
      offerCount: prices.length,
      availability: inStockPrices.length > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      offers: prices.map((p) => ({
        '@type': 'Offer',
        seller: { '@type': 'Organization', name: p.retailer_name },
        price: p.price.toFixed(2),
        priceCurrency: 'GBP',
        url: p.url ?? undefined,
        availability: p.in_stock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      })),
    },
  } : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.brand_name,
        item: `${siteUrl}/brands/${slugify(product.brand_name)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${siteUrl}/products/${product.slug}`,
      },
    ],
  };

  return (
    <article>
      {/* Schema.org structured data — Google reads this for rich product results */}
      {productSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-dim mb-6 flex gap-2 items-center">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span>/</span>
          <Link href={`/brands/${slugify(product.brand_name)}`} className="hover:text-ink">{product.brand_name}</Link>
          <span>/</span>
          <span className="text-ink truncate max-w-md">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 min-w-0">
          {/* Image gallery — multi-angle, arrows + thumbnails */}
          <ProductGallery
            images={product.image_url ? [product.image_url] : getProductImages(product.image_key)}
            alt={product.name}
            oos={!product.in_stock}
          />

          {/* Info + price comparison */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
              {product.brand_name} · {product.category}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              {product.name}
            </h1>
            {product.upcoming_release ? (
              <div className="mb-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-full text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Coming soon · set a bell to be notified
              </div>
            ) : prices.length > 0 && (
              <div className="mb-4">
                <div className="text-2xl font-bold text-ink">
                  From <span className="text-accent">£{cheapest.toFixed(2)}</span>
                </div>
                <div className="text-sm text-dim mt-1">£{exVat(cheapest).toFixed(2)} ex VAT</div>
              </div>
            )}

            <div className="mb-6">
              <BellButton
                productId={product.id}
                initialTracking={isTracking}
                variant="inline"
              />
            </div>

            {product.description && (
              <p className="text-muted mb-8 leading-relaxed">{product.description}</p>
            )}

            <div className="mb-3 text-xs font-bold text-ink uppercase tracking-widest">
              Where to buy
            </div>
            <PriceList prices={prices} productId={product.id} />
          </div>
        </div>

        {/* Colour variants — siblings of this product in other colours,
            links visibly so the visitor can swap colour without using search */}
        <ColourVariants siblings={colourSiblings} />

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-24">
            <div className="mb-8">
              <h2 className="text-3xl font-bold">More from {product.brand_name}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
              {related.map((p) => <ProductCard key={p.id} product={p} tracking={alerted.has(p.id)} />)}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
