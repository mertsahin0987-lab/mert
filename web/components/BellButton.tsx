'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleAlert } from '@/app/account/alerts/actions';

/**
 * Sole-Supplier-style bell on a product card / detail page.
 *
 * Props:
 *   productId — which product this bell tracks
 *   initialTracking — server-rendered initial state (true = filled bell)
 *   variant — 'card' for small icon in top-right of cards, 'inline' for the
 *             larger button on product detail pages
 */
export function BellButton({
  productId,
  initialTracking,
  variant = 'card',
}: {
  productId: string;
  initialTracking: boolean;
  variant?: 'card' | 'inline';
}) {
  const [tracking, setTracking] = useState(initialTracking);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();   // prevent parent <Link> on cards from navigating
    e.stopPropagation();

    // Optimistic update — flip the icon immediately
    const previous = tracking;
    setTracking(!previous);

    startTransition(async () => {
      const result = await toggleAlert(productId);
      if (result && 'error' in result && result.error) {
        // Roll back if the server said no
        setTracking(previous);
      } else if (result && 'tracking' in result) {
        setTracking(result.tracking);
        router.refresh(); // keep server state in sync
      }
    });
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={tracking ? 'Stop tracking price' : 'Track price'}
        aria-pressed={tracking}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-sm border transition-colors ${
          tracking
            ? 'bg-accent text-white border-accent hover:bg-accent/90'
            : 'bg-paper text-ink border-line hover:border-ink'
        } disabled:opacity-60`}
      >
        <BellIcon filled={tracking} />
        {tracking ? 'Tracking' : 'Track price'}
      </button>
    );
  }

  // Card variant — icon-only, floats in top-right
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={tracking ? 'Stop tracking price' : 'Track price'}
      aria-pressed={tracking}
      className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
        tracking
          ? 'bg-accent text-white shadow-sm'
          : 'bg-paper/80 backdrop-blur-sm text-ink border border-line hover:bg-paper hover:border-ink'
      } disabled:opacity-60`}
    >
      <BellIcon filled={tracking} />
    </button>
  );
}

function BellIcon({ filled }: { filled: boolean }) {
  // Filled bell shows a clear "this is on" state; outline = off
  if (filled) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a7 7 0 0 0-7 7v3.586l-1.707 1.707A1 1 0 0 0 4 16h16a1 1 0 0 0 .707-1.707L19 12.586V9a7 7 0 0 0-7-7zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
