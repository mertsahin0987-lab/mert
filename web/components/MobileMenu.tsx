'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Mobile-only nav drawer. The desktop nav lives inline in Header.tsx; on
 * mobile we collapse those links behind a hamburger so the cramped 375px
 * viewport can still fit the logo + search + auth button. Tap the hamburger
 * to open a full-screen overlay, tap any link or the close button to close.
 */
export function MobileMenu({
  isLoggedIn,
  isAdmin = false,
}: {
  isLoggedIn: boolean;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the user lands on a new page — without this,
  // the overlay stays up on top of the new content after navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open so the page underneath doesn't
  // jitter when the user scrolls inside the menu.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden -ml-1 p-2 text-ink"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-[100] bg-paper flex flex-col">
          <div className="h-16 px-6 flex items-center justify-between border-b border-line">
            <Link
              href="/"
              className="text-xl font-extrabold tracking-tightest text-ink"
              onClick={() => setOpen(false)}
            >
              Clipprr.
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="-mr-2 p-2 text-ink"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-6">
            <ul className="space-y-1 text-2xl font-bold">
              <MobileLink href="/categories/clippers">Clippers</MobileLink>
              <MobileLink href="/categories/trimmers">Trimmers</MobileLink>
              <MobileLink href="/categories/shavers">Shavers</MobileLink>
              <MobileLink href="/categories/sets">Sets</MobileLink>
              <MobileLink href="/sale" accent>Sale</MobileLink>
              <MobileLink href="/products">All products</MobileLink>
            </ul>

            {isAdmin && (
              <div className="mt-10 pt-6 border-t border-line">
                <div className="text-xs font-bold uppercase tracking-widest text-dim mb-4">Admin</div>
                <ul className="space-y-1 text-lg font-semibold">
                  <MobileLink href="/admin">Dashboard</MobileLink>
                </ul>
              </div>
            )}

            <div className="mt-10 pt-6 border-t border-line">
              <div className="text-xs font-bold uppercase tracking-widest text-dim mb-4">Account</div>
              <ul className="space-y-1 text-lg font-semibold">
                {isLoggedIn ? (
                  <>
                    <MobileLink href="/account">Your account</MobileLink>
                    <MobileLink href="/account/alerts">Your alerts</MobileLink>
                  </>
                ) : (
                  <>
                    <MobileLink href="/login">Sign in</MobileLink>
                    <MobileLink href="/signup">Create account</MobileLink>
                  </>
                )}
              </ul>
            </div>

            <div className="mt-10 pt-6 border-t border-line">
              <div className="text-xs font-bold uppercase tracking-widest text-dim mb-4">Clipprr</div>
              <ul className="space-y-1 text-base text-muted">
                <MobileLink href="/about" size="sm">About</MobileLink>
                <MobileLink href="/contact" size="sm">Contact</MobileLink>
                <MobileLink href="/privacy" size="sm">Privacy</MobileLink>
                <MobileLink href="/terms" size="sm">Terms</MobileLink>
              </ul>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function MobileLink({
  href,
  children,
  accent,
  size = 'lg',
}: {
  href: string;
  children: React.ReactNode;
  accent?: boolean;
  size?: 'lg' | 'sm';
}) {
  const padding = size === 'lg' ? 'py-2' : 'py-1.5';
  return (
    <li>
      <Link
        href={href}
        className={`block ${padding} ${
          accent ? 'text-red-600' : 'hover:text-accent'
        } transition-colors`}
      >
        {children}
      </Link>
    </li>
  );
}
