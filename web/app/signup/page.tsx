import type { Metadata } from 'next';
import { AuthForm } from '../login/AuthForm';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a free Clipprr account to save tools and get price alerts.',
};

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-md px-6 pt-20 pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4 text-center">
        Join Clipprr
      </p>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tightest text-ink mb-3 text-center">
        Create your account
      </h1>
      <p className="text-sm text-muted text-center mb-10 leading-relaxed">
        Save your favourite tools, get notified when prices drop, and<br />
        track new releases.
      </p>
      <AuthForm mode="signup" />
    </section>
  );
}
