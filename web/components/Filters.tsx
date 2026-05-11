'use client';

/**
 * Catalogue filter bar — sits above any product grid.
 * Reads + writes to URL search params so filters are bookmarkable
 * and surviving a refresh.
 *
 * Set `hideBrand` on brand pages (where every product is the same brand
 * anyway) and `hideSale` on the /sale page (everything's on sale already).
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { PRICE_BUCKET_LABELS, SORT_LABELS } from '@/lib/filters';

type Brand = { name: string; slug: string };

export function Filters({
  brands,
  hideBrand = false,
  hideSale = false,
  resultCount,
}: {
  brands: Brand[];
  hideBrand?: boolean;
  hideSale?: boolean;
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const current = {
    brand:        params.get('brand') ?? '',
    priceBucket:  params.get('price') ?? '',
    onSale:       params.get('sale') === '1',
    sort:         params.get('sort') ?? '',
  };

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value && value !== '') next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const hasActive = current.brand || current.priceBucket || current.onSale || current.sort;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-line">
      {!hideBrand && (
        <select
          value={current.brand}
          onChange={(e) => update('brand', e.target.value || null)}
          className="bg-paper border border-line rounded-md px-3 py-2 text-sm text-ink hover:border-ink focus:outline-none focus:border-ink"
          aria-label="Filter by brand"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>{b.name}</option>
          ))}
        </select>
      )}

      <select
        value={current.priceBucket}
        onChange={(e) => update('price', e.target.value || null)}
        className="bg-paper border border-line rounded-md px-3 py-2 text-sm text-ink hover:border-ink focus:outline-none focus:border-ink"
        aria-label="Filter by price"
      >
        <option value="">Any price</option>
        {Object.entries(PRICE_BUCKET_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {!hideSale && (
        <button
          type="button"
          onClick={() => update('sale', current.onSale ? null : '1')}
          aria-pressed={current.onSale}
          className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors border ${
            current.onSale
              ? 'bg-accent text-white border-accent'
              : 'bg-paper text-ink border-line hover:border-ink'
          }`}
        >
          On sale
        </button>
      )}

      <select
        value={current.sort}
        onChange={(e) => update('sort', e.target.value || null)}
        className="bg-paper border border-line rounded-md px-3 py-2 text-sm text-ink hover:border-ink focus:outline-none focus:border-ink ml-auto"
        aria-label="Sort products"
      >
        <option value="">Sort by</option>
        {Object.entries(SORT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {hasActive && (
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="text-xs uppercase tracking-widest text-muted hover:text-ink"
        >
          Clear filters
        </button>
      )}

      <span className="basis-full md:basis-auto text-xs text-dim md:ml-2">
        {resultCount} {resultCount === 1 ? 'product' : 'products'}
      </span>
    </div>
  );
}
