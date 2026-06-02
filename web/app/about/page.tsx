import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Clipprr',
  description:
    "Clipprr is a UK price comparison site for professional barber tools. We track live prices across every major UK retailer so you can find the best deal in one place.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
        About
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest text-ink mb-6">
        Honest prices for the tools you actually use.
      </h1>
      <p className="text-lg text-muted leading-relaxed mb-12">
        Clipprr is a UK price comparison site for professional barber tools — clippers,
        trimmers, shavers and the kit that goes with them. We track live prices across every
        major UK retailer in one place, so you don&apos;t have to open six tabs to find out
        who&apos;s cheapest today.
      </p>

      <div className="prose-clipprr space-y-10 text-muted leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Why Clipprr exists</h2>
          <p>
            Professional barber tools are an expensive purchase. The same clipper can sit on
            three different UK websites at three very different prices, and stock comes and
            goes without warning. If you&apos;re a barber buying for the shop — or kitting
            yourself out at home — that&apos;s wasted time and often wasted money.
          </p>
          <p>
            Clipprr started as a simple question: why isn&apos;t there a Trivago for clippers?
            The answer turned out to be that nobody had built one yet. So we did.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">How it works</h2>
          <p>
            Every day, automated scripts visit the product pages of every retailer we track —
            Chris &amp; Sons, Coolblades, Salons Direct, JRL UK, Amazon UK and a handful of
            others — and read the current price and stock status. Those numbers get stored in
            our database and rendered into the side-by-side comparisons you see on each
            product page.
          </p>
          <p>
            Prices update at least once a day. Some retailers we re-check more often when a
            product is trending. The &quot;From £&quot; figure on each product card is the
            cheapest <em>in-stock</em> price across all retailers we have for that SKU — out-of-stock
            listings are shown for reference but never as the headline.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">What we don&apos;t do</h2>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              We don&apos;t sell anything ourselves. Every purchase happens at the retailer
              you click through to. We never see your card details, address, or what you
              actually bought.
            </li>
            <li>
              We don&apos;t take a cut from you. The price you pay at the retailer is the
              same whether you arrived via Clipprr or typed their URL directly.
            </li>
            <li>
              We don&apos;t hide retailers we have no commercial relationship with. If we
              know a price is lower elsewhere, you&apos;ll see it — regardless of whether we
              earn anything from that click.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">How we make money</h2>
          <p>
            Some — not all — of the retailer links on Clipprr are affiliate links. When a
            user clicks through and buys, the retailer pays us a small commission. This costs
            you nothing extra and never influences which retailer shows as cheapest.
          </p>
          <p>
            Right now Amazon UK is our only confirmed affiliate partner. We&apos;re working
            on direct arrangements with the other retailers we cover. If a retailer link
            isn&apos;t earning us anything, you&apos;ll still see it ranked honestly by
            price — that&apos;s the whole point.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Who&apos;s behind it</h2>
          <p>
            Clipprr is built and run independently in the UK. No venture capital, no big team
            — one person paying attention to the catalogue and the scrapers. If something looks
            wrong, the email at the bottom of the page reaches the person who can fix it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink mb-3">Get in touch</h2>
          <p>
            Spotted a mistake on a product? Run a retailer we don&apos;t list and want to be
            included? Press enquiry? <Link href="/contact" className="text-ink underline">Drop
            us a line</Link> — we read every message.
          </p>
        </section>
      </div>
    </article>
  );
}
