import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase-server';
import { getUserAlerts } from '@/lib/alerts';
import { signOut } from '@/app/auth/actions';

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Manage your Clipprr account.',
};

// Don't cache — must always reflect the live session state
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const alerts = await getUserAlerts();

  const createdAt = new Date(user.created_at);
  const memberSince = createdAt.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
        Account
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-12">
        Your account
      </h1>

      {/* Profile info card */}
      <div className="bg-paper border border-line rounded-md p-8 mb-6">
        <div className="space-y-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-dim mb-2">
              Email
            </div>
            <div className="text-ink text-lg">{user.email}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-dim mb-2">
              Member since
            </div>
            <div className="text-ink text-lg">{memberSince}</div>
          </div>
        </div>
      </div>

      {/* Quick links — placeholders for now, will fill in as features land */}
      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        <Link
          href="/account/favourites"
          className="bg-paper border border-line rounded-md p-6 hover:border-ink transition-colors block"
        >
          <div className="text-xs font-semibold uppercase tracking-widest text-dim mb-2">
            Favourites
          </div>
          <div className="text-ink font-semibold text-lg">Saved tools</div>
          <div className="text-sm text-muted mt-1">Coming soon</div>
        </Link>
        <Link
          href="/account/alerts"
          className="bg-paper border border-line rounded-md p-6 hover:border-ink transition-colors block"
        >
          <div className="text-xs font-semibold uppercase tracking-widest text-dim mb-2">
            Alerts
          </div>
          <div className="text-ink font-semibold text-lg">Price alerts</div>
          <div className="text-sm text-muted mt-1">
            {alerts.length === 0
              ? 'You aren’t tracking any tools yet'
              : `Tracking ${alerts.length} ${alerts.length === 1 ? 'tool' : 'tools'}`}
          </div>
        </Link>
      </div>

      {/* Sign out — server action, no JS needed */}
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-muted hover:text-ink underline"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}
