import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "About MegaDeal",
  description:
    "MegaDeal is a New Zealand-owned daily deals marketplace connecting Kiwis with real local businesses across food, beauty, activities, travel and fitness.",
};

export default function AboutPage() {
  return (
    <PageShell
      title="About MegaDeal"
      subtitle="Your local guide to restaurants, spas, activities and getaways worth leaving the house for."
    >
      <p>
        MegaDeal connects you with the best local businesses at prices that
        make it easy to say yes. Every deal on the site is picked to be worth
        the trip — no filler, no fine-print traps, no subscriptions.
      </p>
      <p>
        We buy a bit of your attention span for a great deal, and merchants
        get new customers through the door. It works because everyone wins:
        you get up to 70% off, and the business gets to show off what they do
        best to people who&apos;ve never tried them before.
      </p>

      <h2>Our mission</h2>
      <p>
        Trying somewhere new shouldn&apos;t feel like a gamble. We want
        booking a massage, a dinner out, or a weekend away to be as easy as
        scrolling a feed — see the deal, see the price, buy it, go enjoy it.
        Every listing on MegaDeal exists to make that first visit an easy
        decision, for you and for the business behind it.
      </p>

      <h2>How we pick deals</h2>
      <p>
        We work directly with local restaurants, spas, activity providers and
        travel operators to build offers that are genuinely worth featuring —
        real discounts off real prices, redeemable whenever you&apos;re ready.
        We don&apos;t inflate a &quot;was&quot; price just to make the
        &quot;now&quot; price look bigger, and we don&apos;t list a deal we
        wouldn&apos;t book ourselves.
      </p>

      <h2>What makes us different</h2>
      <ul>
        <li>Pay once — no subscriptions, no recurring charges</li>
        <li>Redeem on your own schedule within the deal&apos;s validity window</li>
        <li>Clear fine print on every deal, shown before you buy</li>
        <li>Every merchant is vetted before their deal goes live</li>
      </ul>

      <h2>Where we operate</h2>
      <p>
        MegaDeal started with deals across Auckland, Wellington, Christchurch
        and Queenstown, and we&apos;re adding new cities and new categories
        all the time. If there&apos;s a business you love that you&apos;d like
        to see on MegaDeal, let their owner know — or point them to our{" "}
        <a href="/merchants" className="text-brand-600 hover:underline">
          merchant page
        </a>
        .
      </p>

      <h2>Get in touch</h2>
      <p>
        Questions, feedback, or just want to say hi? Visit our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        — a real person reads every message.
      </p>
    </PageShell>
  );
}
