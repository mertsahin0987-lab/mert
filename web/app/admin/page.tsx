import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdminEmail, adminSupabase } from '@/lib/admin';

// Never cache the admin dashboard — the whole point is real-time visibility.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Single-page admin dashboard. Gated to the email allowlist in lib/admin.ts.
 * Anyone else gets a 404 — the route deliberately doesn't reveal it exists.
 *
 * Shows:
 *   - Signups (total + latest 10)
 *   - Retailer clicks (7-day total + top products)
 *   - Bell alerts (total + most-tracked products)
 *   - News article count
 */
export default async function AdminPage() {
  // Gate 1: must be signed in
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Gate 2: email must be on the allowlist
  if (!user || !isAdminEmail(user.email)) notFound();

  // From here we use the service-role client to read auth.users and the
  // protected click/alert tables that anon can't see.
  let admin;
  try {
    admin = adminSupabase();
  } catch {
    return (
      <ErrorShell
        title="Service role not configured"
        body="SUPABASE_SERVICE_ROLE_KEY must be set as a Vercel environment variable before the admin dashboard can load real data."
      />
    );
  }

  // Fetch everything in parallel
  const [
    usersRes,
    clicksRes,
    clicksAllTimeRes,
    alertsRes,
    articlesCountRes,
    productsRes,
    retailersRes,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 100 }),
    admin
      .from('product_clicks')
      .select('product_id, retailer_id, clicked_at, ip_hash')
      .gte('clicked_at', new Date(Date.now() - 7 * 86400_000).toISOString())
      .order('clicked_at', { ascending: false }),
    admin.from('product_clicks').select('id', { count: 'exact', head: true }),
    admin.from('user_alerts').select('product_id, user_id, created_at'),
    admin.from('news_articles').select('id', { count: 'exact', head: true }),
    admin.from('products').select('id, name'),
    admin.from('retailers').select('id, name'),
  ]);

  const users = usersRes.data?.users ?? [];
  const clicks7d = clicksRes.data ?? [];
  const clicksAllTime = clicksAllTimeRes.count ?? 0;
  const alerts = alertsRes.data ?? [];
  const articleCount = articlesCountRes.count ?? 0;
  const productMap = new Map<string, string>(
    (productsRes.data ?? []).map((p: any) => [String(p.id), p.name]),
  );
  const retailerMap = new Map<string, string>(
    (retailersRes.data ?? []).map((r: any) => [r.id, r.name]),
  );

  // Click aggregates: top products + top retailers (last 7 days)
  const productClickCount = new Map<string, number>();
  const retailerClickCount = new Map<string, number>();
  const uniqueClickers = new Set<string>();
  for (const c of clicks7d) {
    productClickCount.set(c.product_id, (productClickCount.get(c.product_id) ?? 0) + 1);
    retailerClickCount.set(c.retailer_id, (retailerClickCount.get(c.retailer_id) ?? 0) + 1);
    if (c.ip_hash) uniqueClickers.add(c.ip_hash);
  }

  // Bell alert aggregates: most-tracked products
  const productAlertCount = new Map<string, number>();
  for (const a of alerts) {
    productAlertCount.set(a.product_id, (productAlertCount.get(a.product_id) ?? 0) + 1);
  }
  const uniqueAlerters = new Set(alerts.map((a) => a.user_id)).size;

  const topProductsByClicks = [...productClickCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topRetailersByClicks = [...retailerClickCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topProductsByBells = [...productAlertCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <article className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-2">
          Admin
        </p>
        <h1 className="text-3xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-dim mt-1">
          Signed in as <span className="text-ink">{user.email}</span>
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <Stat label="Signups" value={users.length.toString()} />
        <Stat
          label="Clicks · 7d"
          value={clicks7d.length.toString()}
          sub={`${uniqueClickers.size} unique`}
          accent
        />
        <Stat
          label="Bell alerts"
          value={alerts.length.toString()}
          sub={`${uniqueAlerters} users`}
        />
        <Stat
          label="News articles"
          value={articleCount.toString()}
          sub="from scraped feeds"
        />
        <Stat label="Clicks · all time" value={clicksAllTime.toString()} />
      </div>

      {/* Signups */}
      <Section title={`Recent signups (${users.length})`}>
        {users.length === 0 ? (
          <Empty>No users have signed up yet.</Empty>
        ) : (
          <Table
            head={['Email', 'Provider', 'Joined', 'Last seen']}
            rows={[...users]
              .sort((a, b) =>
                String(b.created_at).localeCompare(String(a.created_at)),
              )
              .slice(0, 10)
              .map((u: any) => [
                u.email ?? '—',
                u.app_metadata?.provider ?? 'email',
                fmtDate(u.created_at),
                fmtDate(u.last_sign_in_at),
              ])}
          />
        )}
      </Section>

      {/* Top products by click (last 7 days) */}
      <Section title="Top products by clicks · last 7 days">
        {topProductsByClicks.length === 0 ? (
          <Empty>No retailer clicks logged in the last 7 days.</Empty>
        ) : (
          <Table
            head={['Product', 'Clicks']}
            rows={topProductsByClicks.map(([pid, n]) => [
              productMap.get(pid) ?? `#${pid}`,
              n.toString(),
            ])}
          />
        )}
      </Section>

      {/* Top retailers (last 7 days) */}
      <Section title="Retailer click share · last 7 days">
        {topRetailersByClicks.length === 0 ? (
          <Empty>No retailer clicks logged in the last 7 days.</Empty>
        ) : (
          <Table
            head={['Retailer', 'Clicks']}
            rows={topRetailersByClicks.map(([rid, n]) => [
              retailerMap.get(rid) ?? rid,
              n.toString(),
            ])}
          />
        )}
      </Section>

      {/* Most-tracked products */}
      <Section title="Most-tracked products · bell alerts">
        {topProductsByBells.length === 0 ? (
          <Empty>No one has set a bell alert yet.</Empty>
        ) : (
          <Table
            head={['Product', 'Bells set']}
            rows={topProductsByBells.map(([pid, n]) => [
              productMap.get(pid) ?? `#${pid}`,
              n.toString(),
            ])}
          />
        )}
      </Section>

      <p className="text-xs text-dim mt-12">
        This page is restricted to{' '}
        <code className="text-ink">{user.email}</code> and never indexed by
        search engines. Sign out to drop access.
      </p>
    </article>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Small dumb presentational helpers

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-paper border border-line rounded-md p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-dim mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-ink'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-dim mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-bold uppercase tracking-widest text-ink mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-dim bg-cream/40 border border-line rounded-md p-6 text-center">
      {children}
    </div>
  );
}

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="bg-paper border border-line rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-cream/40 border-b border-line">
          <tr>
            {head.map((h) => (
              <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-dim px-4 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? '' : 'bg-cream/20'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-ink truncate max-w-[280px]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorShell({ title, body }: { title: string; body: string }) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-ink mb-3">{title}</h1>
      <p className="text-muted">{body}</p>
    </article>
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
