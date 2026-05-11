'use client';

/**
 * Catalogue filters. Two components:
 *   <FilterSidebar />  — left column with brand/category/price/sale checkboxes
 *   <FilterTopbar />   — row above the product grid with sort dropdown + count
 *
 * Splitting them lets pages compose a proper sidebar layout where the top
 * bar spans only the content column.
 *
 * Mobile: FilterTopbar shows a "Filters" button that toggles the sidebar
 * open inline (the sidebar collapses to hidden on mobile by default).
 *
 * URL params:
 *   ?brand=wahl,jrl  ?category=clippers,kits  ?price=100-200  ?sale=1  ?sort=price-asc
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition, createContext, useContext } from 'react';
import { PRICE_BUCKET_LABELS, SORT_LABELS } from '@/lib/filters';

type Brand = { name: string; slug: string };

// Shared open/close state between Topbar and Sidebar on mobile.
// Topbar toggles, Sidebar reads. Falls back to "always open" if no provider.
const MobileOpenContext = createContext<{ open: boolean; toggle: () => void } | null>(null);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileOpenContext.Provider value={{ open, toggle: () => setOpen((v) => !v) }}>
      {children}
    </MobileOpenContext.Provider>
  );
}

function useUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function write(next: URLSearchParams) {
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return { router, pathname, params, write };
}

// ─────────────────────────────────────────────────────────────────────────
// TOPBAR — sort + count + (mobile) Filters button
// ─────────────────────────────────────────────────────────────────────────
export function FilterTopbar({ resultCount }: { resultCount: number }) {
  const { pathname, params, router, write } = useUrl();
  const ctx = useContext(MobileOpenContext);
  const sort = params.get('sort') ?? '';

  const hasActive =
    (params.get('brand') ?? '') ||
    (params.get('category') ?? '') ||
    (params.get('price') ?? '') ||
    (params.get('sale') ?? '') ||
    (params.get('sort') ?? '');

  function setSort(value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set('sort', value);
    else next.delete('sort');
    write(next);
  }

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-line">
      {ctx && (
        <button
          type="button"
          onClick={ctx.toggle}
          className="md:hidden px-3 py-2 border border-line rounded-md text-sm font-semibold text-ink hover:border-ink"
        >
          Filters{hasActive ? ' •' : ''}
        </button>
      )}
      <span className="hidden md:inline text-sm text-muted">
        <span className="font-semibold text-ink">{resultCount}</span>{' '}
        {resultCount === 1 ? 'product' : 'products'}
      </span>
      <span className="md:hidden text-xs text-dim ml-3">{resultCount} {resultCount === 1 ? 'product' : 'products'}</span>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value || null)}
        className="bg-paper border border-line rounded-md px-3 py-2 text-sm text-ink hover:border-ink focus:outline-none focus:border-ink"
        aria-label="Sort"
      >
        <option value="">Sort by</option>
        {Object.entries(SORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SIDEBAR — checkboxes
// ─────────────────────────────────────────────────────────────────────────
export function FilterSidebar({
  brands,
  categories,
  brandCounts,
  categoryCounts,
  priceCounts,
  hideBrand = false,
  hideCategory = false,
  hideSale = false,
}: {
  brands: Brand[];
  categories: string[];
  brandCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  priceCounts: Record<string, number>;
  hideBrand?: boolean;
  hideCategory?: boolean;
  hideSale?: boolean;
}) {
  const { pathname, params, router, write } = useUrl();
  const ctx = useContext(MobileOpenContext);

  const selectedBrands = new Set((params.get('brand') ?? '').split(',').filter(Boolean));
  const selectedCats   = new Set((params.get('category') ?? '').split(',').filter(Boolean));
  const selectedPrice  = params.get('price') ?? '';
  const onSale         = params.get('sale') === '1';

  const hasActive = selectedBrands.size > 0 || selectedCats.size > 0 || selectedPrice || onSale;

  function toggleListParam(key: string, value: string) {
    const list = new Set((params.get(key) ?? '').split(',').filter(Boolean));
    list.has(value) ? list.delete(value) : list.add(value);
    const next = new URLSearchParams(params);
    if (list.size > 0) next.set(key, Array.from(list).join(','));
    else next.delete(key);
    write(next);
  }

  function setSingleParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    write(next);
  }

  function clearAll() {
    // Preserve sort param if set
    const sort = params.get('sort');
    const next = new URLSearchParams();
    if (sort) next.set('sort', sort);
    write(next);
  }

  // On mobile, sidebar is hidden unless explicitly opened. On desktop, always shown.
  const mobileVisible = ctx?.open;

  return (
    <aside className={`${mobileVisible ? 'block' : 'hidden'} md:block space-y-8`}>
      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs uppercase tracking-widest text-muted hover:text-accent font-semibold"
        >
          Clear all filters
        </button>
      )}

      {!hideSale && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onSale}
            onChange={() => setSingleParam('sale', onSale ? null : '1')}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-sm font-semibold text-ink">On sale only</span>
        </label>
      )}

      {!hideCategory && categories.length > 1 && (
        <Section title="Category">
          {categories.map((c) => {
            const key = c.toLowerCase();
            const n = categoryCounts[key] ?? 0;
            if (n === 0 && !selectedCats.has(key)) return null;
            return (
              <FilterCheckbox
                key={c}
                label={c}
                count={n}
                checked={selectedCats.has(key)}
                onChange={() => toggleListParam('category', key)}
              />
            );
          })}
        </Section>
      )}

      {!hideBrand && (
        <Section title="Brand">
          {brands.map((b) => {
            const n = brandCounts[b.slug] ?? 0;
            if (n === 0 && !selectedBrands.has(b.slug)) return null;
            return (
              <FilterCheckbox
                key={b.slug}
                label={b.name}
                count={n}
                checked={selectedBrands.has(b.slug)}
                onChange={() => toggleListParam('brand', b.slug)}
              />
            );
          })}
        </Section>
      )}

      <Section title="Price">
        {Object.entries(PRICE_BUCKET_LABELS).map(([k, label]) => {
          const n = priceCounts[k] ?? 0;
          if (n === 0 && selectedPrice !== k) return null;
          return (
            <FilterCheckbox
              key={k}
              label={label}
              count={n}
              checked={selectedPrice === k}
              onChange={() => setSingleParam('price', selectedPrice === k ? null : k)}
            />
          );
        })}
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-ink mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 accent-accent" />
      <span className="text-sm text-muted group-hover:text-ink flex-1">{label}</span>
      <span className="text-xs text-dim tabular-nums">{count}</span>
    </label>
  );
}
