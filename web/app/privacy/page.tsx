import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Clipprr collects, uses and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
        Legal
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-dim mb-12">Last updated: 11 May 2026</p>

      <div className="prose-clipprr space-y-8 text-muted leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Who we are</h2>
          <p>
            Clipprr (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website{' '}
            <a href="https://clipprr.co.uk" className="text-ink underline">clipprr.co.uk</a>{' '}
            — a UK price comparison service for professional barber tools. We are the data
            controller for the personal information described in this policy. If you have
            questions, contact us at{' '}
            <a href="mailto:info@clipprr.co.uk" className="text-ink underline">info@clipprr.co.uk</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">What we collect</h2>
          <p>We aim to collect as little personal data as possible. Specifically:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Usage data</strong> — anonymous information about pages you visit, your
              approximate location (country only), device type and referrer. Used to improve
              the site.
            </li>
            <li>
              <strong>Cookies</strong> — small files stored on your device. See our{' '}
              <a href="/cookies" className="text-ink underline">Cookie Policy</a> for the full list.
            </li>
            <li>
              <strong>Contact form data</strong> — if you email us, we receive your email
              address and the message contents. Used only to reply.
            </li>
            <li>
              <strong>Affiliate clicks</strong> — when you click a retailer link, that retailer
              and the affiliate network (e.g. Amazon Associates, Awin, Skimlinks) may set
              cookies to track that the click came from us. We never see your purchase details.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">What we do NOT collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your name, address or phone number (unless you email it to us)</li>
            <li>Payment information — we never process payments on this site</li>
            <li>Your full IP address (truncated for analytics)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Legal basis for processing</h2>
          <p>
            Under UK GDPR we rely on:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><strong>Legitimate interests</strong> — to run, analyse and improve the site</li>
            <li><strong>Consent</strong> — for non-essential cookies (you can opt out at any time)</li>
            <li><strong>Contract</strong> — to fulfil any user accounts in future</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Who we share data with</h2>
          <p>We only share data with:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><strong>Vercel</strong> — hosting provider (US, with UK GDPR safeguards)</li>
            <li><strong>Supabase</strong> — database provider (EU region)</li>
            <li><strong>Affiliate networks</strong> — Amazon Associates, Awin, Skimlinks (for tracking referral clicks only)</li>
          </ul>
          <p className="mt-3">
            We do not sell your data to anyone, ever.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">How long we keep data</h2>
          <p>
            Analytics data is kept for up to 12 months. Emails you send us are kept while we
            need them to answer you, then deleted. Cookies expire based on each cookie&apos;s
            lifespan (see Cookie Policy).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Your rights</h2>
          <p>Under UK GDPR you have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data (&quot;right to be forgotten&quot;)</li>
            <li>Object to or restrict processing</li>
            <li>Data portability — receive a copy of your data</li>
            <li>Lodge a complaint with the{' '}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-ink underline">
                ICO
              </a>
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email{' '}
            <a href="mailto:info@clipprr.co.uk" className="text-ink underline">info@clipprr.co.uk</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be flagged at
            the top of this page.
          </p>
        </section>
      </div>
    </article>
  );
}
