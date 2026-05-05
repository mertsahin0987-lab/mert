import type { RetailerPrice } from '@/lib/data';

export function PriceList({ prices }: { prices: RetailerPrice[] }) {
  if (!prices.length) {
    return (
      <div className="text-center py-12 text-muted bg-cream rounded-md">
        No retailer prices yet. Check back soon — we update daily.
      </div>
    );
  }

  const sorted = [...prices].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];

  return (
    <div className="space-y-2">
      {sorted.map((p) => {
        const isCheapest = p.retailer_id === cheapest.retailer_id;
        return (
          <a
            key={p.retailer_id}
            href={p.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`group block bg-paper border ${
              isCheapest ? 'border-accent' : 'border-line'
            } rounded-md p-4 hover:border-ink transition-colors ${
              !p.url ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-semibold text-ink text-[15px]">{p.retailer_name}</span>
                  {isCheapest && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-white px-2 py-0.5 rounded">
                      Best price
                    </span>
                  )}
                  {!p.in_stock && (
                    <span className="text-[10px] font-medium text-dim uppercase tracking-wider">
                      Out of stock
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-ink">
                  £{p.price.toFixed(2)}
                </div>
              </div>
              {p.url && (
                <span className="text-sm font-semibold text-ink group-hover:text-accent group-hover:translate-x-1 transition-all">
                  Visit retailer →
                </span>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
