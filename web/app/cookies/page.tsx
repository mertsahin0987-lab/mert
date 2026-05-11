import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How and why Clipprr uses cookies.',
};

export default function CookiesPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
        Legal
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-2">
        Cookie Policy
      </h1>
      <p className="text-sm text-dim mb-12">Last updated: 11 May 2026</p>

      <div className="space-y-8 text-muted leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-ink mb-3">What are cookies?</h2>
          <p>
            Cookies are small text files that websites store on your device. They&apos;re used
            to remember preferences, measure traffic, and (on shopping sites) track referrals
            for affiliate programmes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Cookies we use</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-3 pr-4 font-semibold text-ink">Cookie</th>
                  <th className="text-left py-3 pr-4 font-semibold text-ink">Purpose</th>
                  <th className="text-left py-3 font-semibold text-ink">Lifespan</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-mono text-xs">__vercel_*</td>
                  <td className="py-3 pr-4">Essential — site hosting and routing</td>
                  <td className="py-3">Session</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-mono text-xs">consent</td>
                  <td className="py-3 pr-4">Remembers your cookie choice</td>
                  <td className="py-3">12 months</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-mono text-xs">_plausible_*</td>
                  <td className="py-3 pr-4">Anonymous analytics (if enabled — no personal data)</td>
                  <td className="py-3">N/A (cookieless)</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-mono text-xs">amzn-*</td>
                  <td className="py-3 pr-4">Amazon Associates referral tracking (set by Amazon when you click through)</td>
                  <td className="py-3">24 hours</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-xs">awc, sov</td>
                  <td className="py-3 pr-4">Awin / Skimlinks referral tracking (set by the network)</td>
                  <td className="py-3">30 - 90 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Managing cookies</h2>
          <p>
            You can control cookies through your browser settings. Most browsers let you
            block or delete cookies, or only accept first-party ones. Note that blocking
            essential cookies may break parts of the site.
          </p>
          <p className="mt-3">
            Helpful guides:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-ink underline">Manage cookies in Chrome</a></li>
            <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-ink underline">Manage cookies in Safari</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-ink underline">Manage cookies in Firefox</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Affiliate tracking</h2>
          <p>
            When you click a retailer link, that retailer and any affiliate network in the
            chain may set tracking cookies on their own domains so they know the click came
            from us. We don&apos;t control these cookies — see the retailer&apos;s own privacy
            and cookie policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Questions</h2>
          <p>
            Email{' '}
            <a href="mailto:info@clipprr.co.uk" className="text-ink underline">info@clipprr.co.uk</a>{' '}
            if anything here isn&apos;t clear.
          </p>
        </section>
      </div>
    </article>
  );
}
