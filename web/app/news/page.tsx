import Link from 'next/link';
import type { Metadata } from 'next';
import { getNewsItems, type NewsEvent } from '@/lib/data';

const SITE_URL = 'https://clipprr.co.uk';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'News — every barber tool drop, price cut and restock',
  description:
    'Live feed of price drops, restocks and new barber tool releases across every UK retailer we track.',
  alternates: { canonical: `${SITE_URL}/news` },
  openGraph: {
    title: 'Clipprr news — drops, price cuts and restocks',
    description:
      'Live feed of barber tool releases, restocks and price drops.',
    url: `${SITE_URL}/news`,
    siteName: 'Clipprr',
    type: 'website',
  },
};

/**
 * The "newspaper" of Clipprr. Single chronological list of everything that's
 * happened across the catalogue: price drops, restocks, new products. The
 * intent is the daily-return reason Sole Supplier built its app around — but
 * we don't have an editorial team writing posts, the scraper writes them
 * for us by virtue of price_history existing.
 */
export default async function NewsPage() {
  const events = await getNewsItems(14, 60);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-12">
        <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">
          Live feed
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest mb-4">
          News.
        </h1>
        <p className="text-muted leading-relaxed max-w-xl">
          Every price drop, restock and new release across the catalogue —
          updated as the scraper sees them. The last 14 days, newest first.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 text-dim">
          <p className="text-lg">Nothing new in the last 14 days.</p>
          <p className="text-sm mt-2">
            Come back tomorrow — the daily scrape might surface something.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {events.map((e, i) => (
            <li key={`${e.type}-${i}`}>
              <NewsRow event={e} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NewsRow({ event }: { event: NewsEvent }) {
  if (event.type === 'article') {
    return (
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="block bg-paper border border-line rounded-md p-5 hover:border-ink transition-colors group"
      >
        <div className="flex items-center gap-3 mb-2">
          <Tag tone="article">Article</Tag>
          <RelativeTime iso={event.when} />
          <span className="text-xs text-dim">· {event.source}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-ink group-hover:text-accent transition-colors mb-1.5 leading-snug">
              {event.title}
            </h2>
            {event.excerpt && (
              <p className="text-sm text-muted leading-relaxed line-clamp-2">{event.excerpt}</p>
            )}
            <div className="text-xs text-dim mt-2">Read on {event.source} ↗</div>
          </div>
          {event.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image_url}
              alt=""
              className="hidden sm:block w-24 h-24 object-cover rounded-sm flex-shrink-0"
              loading="lazy"
            />
          )}
        </div>
      </a>
    );
  }

  const href = `/products/${event.product_slug}`;

  if (event.type === 'price-drop') {
    const pct = Math.round((event.savings / event.oldPrice) * 100);
    return (
      <Link
        href={href}
        className="block bg-paper border border-line rounded-md p-5 hover:border-ink transition-colors group"
      >
        <div className="flex items-center gap-3 mb-2">
          <Tag tone="good">Price drop</Tag>
          <RelativeTime iso={event.when} />
        </div>
        <h2 className="text-lg font-bold text-ink group-hover:text-accent transition-colors mb-1">
          {displayName(event)}
        </h2>
        <p className="text-sm text-muted">
          <span className="text-accent font-bold">£{event.newPrice.toFixed(2)}</span>{' '}
          at {event.retailer_name} —{' '}
          <span className="line-through text-dim">£{event.oldPrice.toFixed(2)}</span>{' '}
          ({pct}% off, save £{event.savings.toFixed(2)})
        </p>
      </Link>
    );
  }

  if (event.type === 'restock') {
    return (
      <Link
        href={href}
        className="block bg-paper border border-line rounded-md p-5 hover:border-ink transition-colors group"
      >
        <div className="flex items-center gap-3 mb-2">
          <Tag tone="info">Restocked</Tag>
          <RelativeTime iso={event.when} />
        </div>
        <h2 className="text-lg font-bold text-ink group-hover:text-accent transition-colors mb-1">
          {displayName(event)}
        </h2>
        <p className="text-sm text-muted">
          Back in stock at {event.retailer_name} for{' '}
          <span className="font-semibold text-ink">£{event.price.toFixed(2)}</span>.
        </p>
      </Link>
    );
  }

  // new-product
  return (
    <Link
      href={href}
      className="block bg-paper border border-line rounded-md p-5 hover:border-ink transition-colors group"
    >
      <div className="flex items-center gap-3 mb-2">
        <Tag tone="neutral">Now tracking</Tag>
        <RelativeTime iso={event.when} />
      </div>
      <h2 className="text-lg font-bold text-ink group-hover:text-accent transition-colors mb-1">
        {event.brand_name} {event.product_name}
      </h2>
      <p className="text-sm text-muted">
        Just added to Clipprr. Open the product page to see live prices.
      </p>
    </Link>
  );
}

function Tag({
  tone,
  children,
}: {
  tone: 'good' | 'info' | 'neutral' | 'article';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'good'
      ? 'bg-accent text-white'
      : tone === 'info'
        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
        : tone === 'article'
          ? 'bg-ink text-paper'
          : 'bg-cream text-ink border border-line';
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${cls}`}
    >
      {children}
    </span>
  );
}

/**
 * The product.name field is inconsistent — some are bare ("Magic Clip
 * Cordless"), some include the brand ("Wahl Super Taper X Cordless Clipper").
 * Without this guard, "Wahl Wahl Super Taper X" duplicates on display.
 */
function displayName(event: { brand_name: string; product_name: string }): string {
  const brand = event.brand_name.toLowerCase();
  const name = event.product_name.toLowerCase();
  if (name.startsWith(brand)) return event.product_name;
  return `${event.brand_name} ${event.product_name}`;
}

function RelativeTime({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const label =
    hours < 1
      ? 'just now'
      : hours < 24
        ? `${hours}h ago`
        : `${Math.floor(hours / 24)}d ago`;
  return <span className="text-xs text-dim">{label}</span>;
}
