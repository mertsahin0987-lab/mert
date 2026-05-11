import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase-server';

export async function Header() {
  // Server-side auth check — shows "Account" if logged in, "Sign in" otherwise
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-line">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-8">
        <Link href="/" className="text-xl font-extrabold tracking-tightest text-ink">
          Clipprr.
        </Link>

        {/* Primary nav — Sale gets bright red so it pops */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
          <Link href="/categories/clippers" className="hover:text-ink transition-colors">Clippers</Link>
          <Link href="/categories/trimmers" className="hover:text-ink transition-colors">Trimmers</Link>
          <Link href="/categories/kits" className="hover:text-ink transition-colors">Kits</Link>
          <Link
            href="/sale"
            className="text-red-600 font-bold hover:text-red-700 transition-colors"
          >
            Sale
          </Link>
          <Link href="/products" className="hover:text-ink transition-colors">Catalogue</Link>
        </nav>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <form action="/search" className="flex items-center gap-2 max-w-xs">
            <input
              name="q"
              placeholder="Search"
              className="bg-cream border border-line rounded-md px-3 py-1.5 text-sm w-full max-w-[200px] focus:outline-none focus:border-ink transition-colors"
            />
          </form>

          {user ? (
            <>
              <Link
                href="/account/alerts"
                className="text-ink hover:text-accent transition-colors"
                aria-label="Your alerts"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </Link>
              <Link
                href="/account"
                className="text-sm font-semibold text-ink hover:text-accent transition-colors whitespace-nowrap"
                aria-label="Your account"
              >
                Account
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-ink hover:text-accent transition-colors whitespace-nowrap"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
