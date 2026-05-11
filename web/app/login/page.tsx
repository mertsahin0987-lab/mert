import type { Metadata } from 'next';
import { AuthForm } from './AuthForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Clipprr account.',
};

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-6 pt-20 pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4 text-center">
        Welcome back
      </p>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tightest text-ink mb-10 text-center">
        Sign in to Clipprr
      </h1>
      <AuthForm mode="login" />
    </section>
  );
}
