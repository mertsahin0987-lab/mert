import Link from 'next/link';

export const metadata = {
  title: 'Not found',
  description: 'The page you were looking for doesn\'t exist.',
};

/**
 * Branded 404 page. Replaces Next.js's generic black-and-white default. We
 * land here when a product slug doesn't match anything in the catalogue
 * (deleted product, mistyped URL, dead inbound link from an old social post).
 *
 * The job here is to give the user somewhere to go next — links straight
 * back into the catalogue, the search box, and the headline categories.
 * Same visual language as the legal pages so the layout doesn't feel like
 * it belongs to a different app.
 */
export default function NotFound() {
  return (
    <article className="mx-auto max-w-2xl px-6 pt-20 pb-24 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
        404
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-6">
        We can&apos;t find that page.
      </h1>
      <p className="text-lg text-muted leading-relaxed mb-10">
        The product or page you were looking for has moved, sold out, or
        never existed in the first place. Try one of these instead:
      </p>

      <div className="flex flex-wrap gap-2 justify-center mb-12">
        {[
          ['Clippers', '/categories/clippers'],
          ['Trimmers', '/categories/trimmers'],
          ['Shavers', '/categories/shavers'],
          ['Sets', '/categories/sets'],
          ['Sale', '/sale'],
          ['All products', '/products'],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-semibold text-ink border border-line rounded-full px-4 py-1.5 hover:border-ink hover:bg-ink hover:text-paper transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>

      <Link
        href="/"
        className="inline-block bg-ink text-paper text-sm font-semibold px-6 py-3 rounded-md hover:bg-accent transition-colors"
      >
        Back to home →
      </Link>
    </article>
  );
}
