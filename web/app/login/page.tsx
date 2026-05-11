import type { Metadata } from 'next';
import { SignInChooser } from './SignInChooser';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Clipprr account.',
};

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-lg px-6 pt-16 pb-24">
      <SignInChooser defaultMode="choose" />
    </section>
  );
}
