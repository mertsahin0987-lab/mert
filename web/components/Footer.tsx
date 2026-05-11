import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-line mt-32 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <Link href="/" className="text-xl font-extrabold tracking-tightest text-ink block mb-3">
              Clipprr.
            </Link>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              UK price comparison for professional barber tools. Live retailer prices, side by side.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-dim mb-4">Browse</div>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/products" className="hover:text-ink">All products</Link></li>
              <li><Link href="/categories/clippers" className="hover:text-ink">Clippers</Link></li>
              <li><Link href="/categories/trimmers" className="hover:text-ink">Trimmers</Link></li>
              <li><Link href="/categories/shavers" className="hover:text-ink">Shavers</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-dim mb-4">Clipprr</div>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="mailto:info@clipprr.co.uk" className="hover:text-ink">info@clipprr.co.uk</a></li>
              <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-ink">Terms</Link></li>
              <li><Link href="/cookies" className="hover:text-ink">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line mt-12 pt-6 text-xs text-dim flex flex-wrap justify-between gap-4">
          <span>© 2026 Clipprr · Made in the UK</span>
          <span className="max-w-md text-right">
            We earn a small commission on some retailer clicks. Never changes the price you pay.
          </span>
        </div>
        <div className="mt-4 text-[11px] text-dim leading-relaxed max-w-3xl">
          Prices are indicative — always confirm at the retailer&apos;s checkout. Product images
          and brand names are property of their respective owners and are shown for the purpose
          of product identification. Clipprr is not affiliated with or endorsed by any brand or
          retailer listed.
        </div>
      </div>
    </footer>
  );
}
