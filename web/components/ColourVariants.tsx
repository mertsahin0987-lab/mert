import Link from 'next/link';
import type { ColourSibling } from '@/lib/data';
import { getProductImages } from '@/lib/product-images';

/**
 * Horizontal row of colour-variant siblings shown on a product page. Each
 * sibling links to its own product page — we follow the Sole Supplier
 * pattern of keeping colourways as separate listings rather than rolling
 * them into one product with a swatch picker. Lets each colour have its
 * own retailer list + price + share URL.
 */
export function ColourVariants({ siblings }: { siblings: ColourSibling[] }) {
  if (siblings.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 text-xs font-bold uppercase tracking-widest text-ink">
        Also in other colours
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0">
        {siblings.map((s) => {
          const images = s.image_url
            ? [s.image_url]
            : getProductImages(s.image_key);
          const heroImage = images[0] ?? null;
          return (
            <Link
              key={s.product_id}
              href={`/products/${s.product_slug}`}
              className="group flex-shrink-0 w-40 bg-paper border border-line rounded-md p-3 hover:border-ink transition-colors"
            >
              <div className="relative aspect-square overflow-hidden mb-3 bg-cream/30 rounded-sm">
                {heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroImage}
                    alt={s.product_name}
                    className={`w-full h-full object-contain p-1 group-hover:scale-[1.04] transition-transform duration-500 ${
                      s.in_stock ? '' : 'grayscale opacity-60'
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-dim">
                    No image
                  </div>
                )}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-dim mb-1">
                {s.colour}
              </div>
              <div className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">
                £{s.current_price.toFixed(2)}
              </div>
              {!s.in_stock && (
                <div className="text-[10px] text-dim mt-0.5 uppercase tracking-wider">
                  Out of stock
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
