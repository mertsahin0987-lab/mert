'use client';

/**
 * Image gallery for the product detail page.
 *
 * - Main image up top, click left/right arrows or use keyboard ←/→ to cycle
 * - Thumbnail strip below for direct selection
 * - Falls back to a single image if only one is available
 * - Respects out-of-stock styling (greyscale + opacity)
 */

import { useState, useCallback, useEffect } from 'react';

export function ProductGallery({
  images,
  alt,
  oos = false,
}: {
  images: string[];
  alt: string;
  oos?: boolean;
}) {
  const [active, setActive] = useState(0);

  const next = useCallback(() => setActive((i) => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setActive((i) => (i - 1 + images.length) % images.length), [images.length]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  if (images.length === 0) {
    return (
      <div className="aspect-square flex items-center justify-center text-dim">No image</div>
    );
  }

  const dimming = oos ? 'grayscale opacity-60' : '';

  return (
    <div>
      {/* MAIN IMAGE */}
      <div className="relative aspect-square overflow-hidden group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active]}
          alt={`${alt} — view ${active + 1}`}
          className={`w-full h-full object-contain ${dimming}`}
        />

        {/* OOS pill on main image (parent passes oos prop) */}
        {oos && (
          <div className="absolute top-3 left-3 bg-ink/85 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded backdrop-blur-sm">
            Out of stock
          </div>
        )}

        {/* Counter top-right */}
        {images.length > 1 && (
          <div className="absolute top-3 right-3 bg-ink/85 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            {active + 1} / {images.length}
          </div>
        )}

        {/* Prev / next buttons — only shown on hover when there's more than one */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-paper/90 backdrop-blur-sm border border-line text-ink flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-paper transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-paper/90 backdrop-blur-sm border border-line text-ink flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-paper transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* THUMBNAILS — only shown when more than one image */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === active}
              className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden border-2 transition-colors ${
                i === active ? 'border-ink' : 'border-transparent hover:border-line'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className={`w-full h-full object-contain bg-cream ${oos ? 'grayscale' : ''}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
