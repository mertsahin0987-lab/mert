import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Clipprr',
  description:
    "Get in touch with Clipprr — corrections, retailer partnerships, press, takedown requests. We read every email.",
};

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
        Contact
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-6">
        Talk to us.
      </h1>
      <p className="text-lg text-muted leading-relaxed mb-12">
        Clipprr is run by one person in the UK. The fastest way to reach a human is by email
        — we read every message and reply within a couple of working days.
      </p>

      <div className="prose-clipprr space-y-10 text-muted leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Email us</h2>
          <p className="mb-4">
            <a
              href="mailto:info@clipprr.co.uk"
              className="inline-block text-xl font-semibold text-ink underline"
            >
              info@clipprr.co.uk
            </a>
          </p>
          <p>
            That mailbox is monitored Monday to Friday, UK hours. We typically reply within
            two working days; usually faster.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">What we&apos;re happy to hear</h2>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Corrections.</strong> A price that&apos;s clearly wrong, a link that
              opens the wrong product, an image that doesn&apos;t match — please tell us.
              Include the product name or URL.
            </li>
            <li>
              <strong>Missing products.</strong> A clipper or trimmer you&apos;d like to see
              listed. Bonus points for a retailer URL.
            </li>
            <li>
              <strong>Retailer partnerships.</strong> If you work for a UK barber supplies
              retailer and want to be added (or want to discuss affiliate arrangements),
              we&apos;d love to talk.
            </li>
            <li>
              <strong>Brand enquiries.</strong> Manufacturers wanting to update product info,
              flag a new release, or discuss feature placement.
            </li>
            <li>
              <strong>Press.</strong> Journalists, podcasters, YouTubers — happy to help.
            </li>
            <li>
              <strong>Takedown requests.</strong> Trademark holders or rights owners can
              email us with details. See the <a href="/terms" className="text-ink underline">Terms of Use</a> for
              the formal procedure.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">What helps us reply faster</h2>
          <p>
            One email per topic, the product URL or name where relevant, and a clear ask.
            Screenshots are great for &quot;the price looks wrong&quot; reports — they show
            us what you saw.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">What we can&apos;t help with</h2>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Orders or returns.</strong> Clipprr doesn&apos;t sell products. If you
              bought something via a retailer link, contact the retailer&apos;s customer
              service — they have your order details.
            </li>
            <li>
              <strong>Product advice.</strong> We don&apos;t recommend specific tools; we
              just show the prices.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Where we are</h2>
          <p>
            Clipprr is run in the UK. We don&apos;t have a public office address — small
            operation, postal mail goes nowhere fast. Email is the place.
          </p>
        </section>
      </div>
    </article>
  );
}
