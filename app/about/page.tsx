import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "About MegaDeal" };

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
      <h2>How we pick deals</h2>
      <p>
        We work directly with local restaurants, spas, activity providers and
        travel operators to build offers that are genuinely worth featuring —
        real discounts off real prices, redeemable whenever you&apos;re ready.
      </p>
    </PageShell>
  );
}
