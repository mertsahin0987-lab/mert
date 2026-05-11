import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase-server';
import { getUserAlerts } from '@/lib/alerts';
import { removeAlert } from './actions';

export const metadata: Metadata = {
  title: 'Your alerts',
  description: 'Tools you’re tracking for price drops.',
};

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const alerts = await getUserAlerts();

  return (
    <section className="mx-auto max-w-4xl px-6 pt-16 pb-24">
      <Link
        href="/account"
        className="text-sm text-muted hover:text-ink inline-block mb-6"
      >
        ← Back to account
      </Link>

      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
        Price alerts
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-3">
        Tools you’re tracking
      </h1>
      <p className="text-muted mb-12 leading-relaxed max-w-xl">
        We’ll email you the moment any of these drops in price or comes back in stock at a UK retailer.
      </p>

      {alerts.length === 0 ? (
        <div className="bg-cream rounded-lg p-12 text-center">
          <h2 className="text-2xl font-bold text-ink mb-2">No alerts yet.</h2>
          <p className="text-muted mb-6 max-w-md mx-auto">
            Find a tool you want and tap the bell on its card or detail page to start tracking.
          </p>
          <Link
            href="/products"
            className="inline-block bg-ink text-paper px-5 py-2.5 text-sm font-semibold rounded-md hover:bg-accent transition-colors"
          >
            Browse the catalogue
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const dropped = a.baseline_price != null && a.current_price < a.baseline_price;
            return (
              <div
                key={a.alert_id}
                className="flex items-center gap-4 bg-paper border border-line rounded-md p-4 hover:border-ink transition-colors"
              >
                <Link href={`/products/${a.product_slug}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 flex-shrink-0 bg-cream rounded-md overflow-hidden flex items-center justify-center">
                    {a.image_key ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/products/${a.image_key}.png`}
                        alt={a.product_name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-xs text-dim">—</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-widest text-dim mb-0.5">
                      {a.brand_name}
                    </div>
                    <div className="font-medium text-ink leading-snug truncate">{a.product_name}</div>
                    <div className="text-sm mt-1">
                      <span className="font-semibold text-ink">£{a.current_price.toFixed(2)}</span>
                      {a.baseline_price != null && (
                        <span className="text-dim ml-2">
                          {dropped ? (
                            <span className="text-accent font-semibold">
                              ↓ £{(a.baseline_price - a.current_price).toFixed(2)} since you started tracking
                            </span>
                          ) : (
                            <>baseline £{a.baseline_price.toFixed(2)}</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                <form action={removeAlert.bind(null, a.alert_id)}>
                  <button
                    type="submit"
                    className="text-xs text-dim hover:text-accent uppercase tracking-widest font-semibold whitespace-nowrap"
                    aria-label="Remove alert"
                  >
                    Remove
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
