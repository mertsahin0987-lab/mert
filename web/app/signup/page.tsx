import type { Metadata } from 'next';
import { SignInChooser } from '../login/SignInChooser';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a free Clipprr account to save tools and get price alerts.',
};

export default function SignupPage() {
  // Defaults to the email-signup view since the user clicked "signup",
  // but they can still flip to social or login from here.
  return (
    <section className="mx-auto max-w-lg px-6 pt-16 pb-24">
      <SignInChooser defaultMode="email-signup" />
    </section>
  );
}
