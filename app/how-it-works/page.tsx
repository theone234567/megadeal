import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How MegaDeal works: browse local deals for free and contact the business directly to redeem, or list your own deal and reach new customers.",
};

export default function HowItWorksPage() {
  return (
    <PageShell
      title="How it works"
      subtitle="MegaDeal is a free deals board, not a checkout — here's how it works."
    >
      <h2>For customers</h2>

      <h3>1. Find a deal</h3>
      <p>
        Browse by category — Food &amp; Drink, Beauty &amp; Spa, Things To
        Do, Travel &amp; Getaways, Health &amp; Fitness — or search for
        exactly what you&apos;re after. Every deal card shows the discount
        percentage, the price, and a countdown to when it ends, so you can
        tell at a glance whether it&apos;s worth a closer look.
      </p>

      <h3>2. Grab the deal</h3>
      <p>
        Open the deal page to see exactly what&apos;s on offer, the fine
        print, and who&apos;s behind it. Tap &quot;Get this deal&quot; to
        reveal the business&apos;s phone number, website and address.
        There&apos;s nothing to buy and nothing to pay on MegaDeal — we
        don&apos;t take a card number or process any payment.
      </p>

      <h3>3. Redeem with the business, directly</h3>
      <p>
        Contact or visit the business, mention the MegaDeal offer, and pay
        them directly at the discounted price. How and when you redeem is up
        to the business — some deals need a booking, others are walk-in. See
        our{" "}
        <a href="/redeem" className="text-brand-600 hover:underline">
          redemption guide
        </a>{" "}
        for the general process.
      </p>

      <h2>For businesses</h2>
      <p>
        MegaDeal is advertising, not a marketplace — you never hand us a cut
        of a sale, because we never process one. Instead, you list a deal for
        a fixed number of advertising credits (or a subscription), and every
        customer who redeems it pays you directly, in full. Head to our{" "}
        <a href="/merchants" className="text-brand-600 hover:underline">
          merchant page
        </a>{" "}
        to get started.
      </p>

      <h2>Questions or issues?</h2>
      <p>
        If a business can&apos;t honour a deal, or something on a listing
        looks wrong, let us know via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        and we&apos;ll follow up — we just can&apos;t issue a refund for
        something we never charged you for.
      </p>
    </PageShell>
  );
}
