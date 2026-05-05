import Link from 'next/link';
import type { Product } from '@/lib/data';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Square cream tile, no border, image floats inside */}
      <div className="relative aspect-square bg-cream overflow-hidden mb-4">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-contain p-6 group-hover:scale-[1.05] transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dim text-xs">No image</div>
        )}
      </div>

      {/* Brand · Name in a single line block */}
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim mb-1.5">
        {product.brand_name}
      </div>
      <h3 className="text-[15px] font-medium text-ink leading-snug mb-2 line-clamp-2">
        {product.name}
      </h3>
      <div className="text-[15px] font-semibold text-ink">
        £{product.base_price.toFixed(2)}
      </div>
    </Link>
  );
}
