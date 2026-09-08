'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fullProductName } from '@/lib/product-name';

type Suggestion = {
  id: string;
  slug: string;
  name: string;
  brand_name: string;
  category: string;
  base_price: number;
  compare_at_price: number | null;
  image_key: string | null;
  image_url: string | null;
  in_stock: boolean;
};

// Client-side typeahead for the header. Debounces the input, fetches
// suggestions from /api/search-suggest, and renders a dropdown of matching
// products. Arrow keys move between rows; Enter navigates to the highlighted
// one (or submits the search page for the raw query if nothing is highlighted).
export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced fetch — cancels in-flight requests when the user keeps typing
  // so we don't get a stale response overwriting a fresh one on slow networks.
  // We wait for 2 chars before firing anything; single-letter results are
  // too noisy to be useful.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results || []);
        setHighlight(-1);
      } catch { /* aborted or transient failure — silently ignore */ }
    }, 140);
    return () => clearTimeout(t);
  }, [query]);

  // Ghost-text autocomplete — when the top match's brand or name starts
  // with what the user has typed, we show the remainder as a dim overlay
  // behind the input so users see what they'd end up with if they kept
  // typing. Prefers brand name (short, clean) over product name.
  const topMatch = results[0];
  let ghostCompletion = '';
  if (topMatch && query.length >= 2) {
    const qLower = query.toLowerCase();
    const brandLower = topMatch.brand_name.toLowerCase();
    const full = fullProductName(topMatch);
    const fullLower = full.toLowerCase();
    if (brandLower.startsWith(qLower) && brandLower !== qLower) {
      ghostCompletion = topMatch.brand_name.slice(query.length);
    } else if (fullLower.startsWith(qLower)) {
      ghostCompletion = full.slice(query.length, query.length + 40);
    }
  }

  // Close the dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const submit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (highlight >= 0 && results[highlight]) {
      router.push(`/products/${results[highlight].slug}`);
    } else if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    setOpen(false);
  }, [highlight, query, results, router]);

  const onKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [open, results.length]);

  return (
    <div className="relative flex-1 max-w-xs" ref={boxRef}>
      <form onSubmit={submit}>
        {/* Chrome trick: wrapper holds the background + border, input is
            transparent on top of it, ghost-text overlay sits underneath.
            The invisible span reserves the exact pixel width of what the
            user has typed so the completion aligns perfectly after their
            caret. Same font-size + padding on both so the alignment holds. */}
        <div className="relative bg-cream border border-line rounded-md w-full max-w-[240px] focus-within:border-ink transition-colors overflow-hidden">
          {ghostCompletion && (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center px-3 py-1.5 text-sm whitespace-pre pointer-events-none select-none overflow-hidden"
            >
              <span className="invisible flex-shrink-0">{query}</span>
              <span className="text-dim/60 truncate">{ghostCompletion}</span>
            </div>
          )}
          <input
            name="q"
            placeholder="Search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            autoComplete="off"
            className="relative w-full bg-transparent px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
      </form>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-paper border border-line rounded-md shadow-lg overflow-hidden z-50">
          <ul className="max-h-[420px] overflow-y-auto">
            {results.map((r, i) => {
              const onSale = r.compare_at_price != null && r.compare_at_price > r.base_price + 0.01;
              const highlighted = i === highlight;
              const img = r.image_url || (r.image_key ? `/products/${r.image_key}.png` : null);
              return (
                <li key={r.id}>
                  <Link
                    href={`/products/${r.slug}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-b-0 transition-colors ${highlighted ? 'bg-cream' : 'hover:bg-cream'}`}
                  >
                    <div className="w-12 h-12 flex-shrink-0 bg-cream rounded overflow-hidden flex items-center justify-center">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={r.name} className={`w-full h-full object-contain p-1 ${r.in_stock ? '' : 'grayscale opacity-60'}`} loading="lazy" />
                      ) : (
                        <span className="text-[9px] text-dim">No image</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-dim leading-tight">{r.brand_name}</div>
                      <div className="text-sm font-medium text-ink truncate">{r.name}</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className={`text-sm font-semibold ${onSale ? 'text-accent' : 'text-ink'}`}>£{r.base_price.toFixed(2)}</span>
                        {onSale && r.compare_at_price != null && (
                          <span className="text-xs text-dim line-through">£{r.compare_at_price.toFixed(2)}</span>
                        )}
                        {!r.in_stock && <span className="text-[10px] text-dim uppercase tracking-wider">Out of stock</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {query.trim() && (
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs font-semibold text-center text-accent hover:bg-cream border-t border-line"
            >
              See all results for "{query.trim()}" →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
