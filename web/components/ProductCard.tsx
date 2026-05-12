import Link from 'next/link';
import type { Product } from '@/lib/data';
import { BellButton } from './BellButton';
import { exVat } from '@/lib/vat';

export function ProductCard({
  product,
  tracking = false,
}: {
  product: Product;
  /** Pass-through: is the current user belling this product? Defaults to false. */
  tracking?: boolean;
}) {
  // Sale detection — if we have a higher "compare_at_price", this product is on sale
  const onSale = product.compare_at_price != null && product.compare_at_price > product.base_price;
  const discountPct = onSale
    ? Math.round((1 - product.base_price / (product.compare_at_price as number)) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Floating image — no tile, no border, just blends into the page bg */}
      <div className="relative aspect-square overflow-hidden mb-4">
        <BellButton productId={product.id} initialTracking={tracking} variant="card" />
        {(product.image_url || product.image_key) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url ?? `/products/${product.image_key}.png`}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-contain p-2 group-hover:scale-[1.04] transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dim text-xs">No image</div>
        )}
        {onSale && (
          <span className="absolute top-2 left-2 bg-accent text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            -{discountPct}%
          </span>
        )}
      </div>

      <div className="text-[11px] uppercase tracking-[0.18em] text-dim mb-1.5">
        {product.brand_name}
      </div>
      <h3 className="text-[15px] font-medium text-ink leading-snug mb-2 line-clamp-2">
        {product.name}
      </h3>

      {onSale ? (
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-accent">£{product.base_price.toFixed(2)}</span>
          <span className="text-[13px] text-dim line-through">£{(product.compare_at_price as number).toFixed(2)}</span>
        </div>
      ) : (
        <div className="text-[15px] font-semibold text-ink">£{product.base_price.toFixed(2)}</div>
      )}
      <div className="text-[11px] text-dim mt-0.5">£{exVat(product.base_price).toFixed(2)} ex VAT</div>
    </Link>
  );
}
