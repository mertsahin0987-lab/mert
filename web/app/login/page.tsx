import type { Metadata } from 'next';
import { SignInChooser } from './SignInChooser';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Clipprr account.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // Honour ?next=/path so middleware can bounce protected-route visitors
  // here and we send them back where they came from after signing in.
  // Strict whitelist — must start with '/' but not '//' (would otherwise
  // be a protocol-relative URL pointing at another origin).
  const rawNext = typeof sp.next === 'string' ? sp.next : null;
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : null;

  return (
    <section className="mx-auto max-w-lg px-6 pt-16 pb-24">
      <SignInChooser defaultMode="choose" next={next} />
    </section>
  );
}
