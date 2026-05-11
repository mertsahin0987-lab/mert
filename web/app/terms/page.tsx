import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The terms governing your use of Clipprr.',
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
        Legal
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-2">
        Terms of Use
      </h1>
      <p className="text-sm text-dim mb-12">Last updated: 11 May 2026</p>

      <div className="space-y-8 text-muted leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-ink mb-3">About these terms</h2>
          <p>
            By using clipprr.co.uk (the &quot;Site&quot;) you agree to these terms. If you don&apos;t
            agree, please stop using the Site. Clipprr is operated as a sole trader in
            England &amp; Wales. Contact:{' '}
            <a href="mailto:info@clipprr.co.uk" className="text-ink underline">info@clipprr.co.uk</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">What Clipprr is</h2>
          <p>
            Clipprr is a price comparison service for professional barber tools. We aggregate
            prices from third-party UK retailers and provide affiliate links to those
            retailers. We do not sell, ship or fulfil any products ourselves.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Price and stock accuracy</h2>
          <p className="font-medium text-ink mb-3">
            ⚠️ Prices on this site are indicative only. Always check the current price
            on the retailer&apos;s own site before buying.
          </p>
          <p>
            We pull prices from retailers automatically, typically once a day. Between updates,
            retailers may change their prices, run flash sales, or sell out. We make no
            warranty that any price shown here matches the price at the retailer at the moment
            you click through. The only price that matters is the one shown by the retailer at
            checkout.
          </p>
          <p className="mt-3">
            Stock status is updated on the same schedule and may not reflect real-time
            availability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Affiliate links</h2>
          <p>
            Many of the retailer links on this Site are affiliate links. If you click one and
            then make a purchase, we may earn a commission. This never increases the price you
            pay. We try to show every retailer we know of for each product, regardless of
            whether we earn commission from them — but you should assume any retailer link is
            potentially an affiliate link.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Your purchase is with the retailer</h2>
          <p>
            When you click a retailer link and complete a purchase, you are entering into a
            contract with that retailer, not with Clipprr. Any issues with the order — wrong
            product, late delivery, faulty goods, refunds, warranty — are between you and the
            retailer. We will help where we can but we have no role in the transaction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Scrape, copy or republish content from the Site without permission</li>
            <li>Attempt to gain unauthorised access to our systems or database</li>
            <li>Use the Site to harass anyone or send unsolicited messages</li>
            <li>Interfere with the Site&apos;s normal operation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Intellectual property</h2>
          <p>
            The Clipprr name, logo, design and code are our property. We claim no rights in any
            third-party content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Trademarks &amp; brand names</h2>
          <p>
            All product names, brand names, logos and trademarks shown on the Site are the
            property of their respective owners. Their appearance here is for the limited
            purpose of identifying products in our price-comparison listings (nominative fair
            use). Clipprr is not affiliated with, endorsed by, sponsored by, or otherwise
            connected to any of the brands or retailers shown unless explicitly stated.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Product images</h2>
          <p>
            Product images displayed on the Site are sourced from manufacturers and retailers
            and shown for the sole purpose of identifying the products to which our price
            listings refer. If you are the rights holder for any image or content shown and
            would like it removed or attributed differently, please contact us — see &quot;Takedown
            requests&quot; below — and we&apos;ll respond promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Takedown requests</h2>
          <p>
            If you believe content on this Site infringes your intellectual-property rights,
            email{' '}
            <a href="mailto:info@clipprr.co.uk" className="text-ink underline">info@clipprr.co.uk</a>
            {' '}with:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>The specific URL(s) on Clipprr where the content appears</li>
            <li>Identification of the work or trademark you claim is infringed</li>
            <li>Your contact details and a statement that you&apos;re authorised to act on the rights holder&apos;s behalf</li>
          </ul>
          <p className="mt-3">
            We aim to action valid takedown requests within 3 working days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Limitation of liability</h2>
          <p>
            We provide this Site &quot;as is&quot;. To the maximum extent permitted by law, we
            are not liable for any loss arising from:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Price or stock information being out of date or inaccurate</li>
            <li>Decisions you make based on information shown on the Site</li>
            <li>Any third-party retailer or their products</li>
            <li>The Site being temporarily unavailable</li>
          </ul>
          <p className="mt-3">
            Nothing in these terms excludes liability for fraud or any liability that cannot
            be excluded under English law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Changes</h2>
          <p>
            We may update these terms occasionally. Material changes will be flagged at the
            top of the page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Governing law</h2>
          <p>
            These terms are governed by the laws of England and Wales. Any dispute will be
            handled by the courts of England and Wales.
          </p>
        </section>
      </div>
    </article>
  );
}
