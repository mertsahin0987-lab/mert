import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-line">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-8">
        {/* Wordmark — bold sans, no italic, no decorations */}
        <Link href="/" className="text-xl font-extrabold tracking-tightest text-ink">
          Clipprr.
        </Link>

        {/* Minimal nav — three links, no dropdowns */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <Link href="/products" className="hover:text-ink transition-colors">Catalogue</Link>
          <Link href="/categories/clippers" className="hover:text-ink transition-colors">Clippers</Link>
          <Link href="/categories/trimmers" className="hover:text-ink transition-colors">Trimmers</Link>
        </nav>

        {/* Search — collapsed to icon-led, no big input */}
        <form action="/search" className="flex items-center gap-2 flex-1 max-w-xs justify-end">
          <input
            name="q"
            placeholder="Search"
            className="bg-cream border border-line rounded-md px-3 py-1.5 text-sm w-full max-w-[200px] focus:outline-none focus:border-ink transition-colors"
          />
        </form>
      </div>
    </header>
  );
}
