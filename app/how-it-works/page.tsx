import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How MegaDeal works for customers and businesses: browse and buy a local deal in minutes, or list your own deal and reach new customers.",
};

export default function HowItWorksPage() {
  return (
    <PageShell
      title="How it works"
      subtitle="Three steps between you and a great local deal."
    >
      <h2>1. Find a deal</h2>
      <p>
        Browse by category — Food &amp; Drink, Beauty &amp; Spa, Things To
        Do, Travel &amp; Getaways, Health &amp; Fitness — or search for
        exactly what you&apos;re after. Every deal card shows the discount
        percentage, the price, and a countdown to when it ends, so you can
        tell at a glance whether it&apos;s worth a closer look.
      </p>

      <h2>2. Check the fine print, then buy</h2>
      <p>
        Each deal page lays out exactly what you&apos;re getting: what&apos;s
        included, any booking requirements, and how long you have to redeem
        it. Pick a quantity, add it to your cart, and check out securely — no
        subscription, no recurring charge, just a one-off payment for the
        deal you chose.
      </p>

      <h2>3. Redeem with the merchant</h2>
      <p>
        Your order confirmation email is your voucher. Use it to book a time
        with the merchant if one&apos;s needed, then show it when you arrive.
        You can redeem anytime within the deal&apos;s validity window — no
        need to use it the same week you bought it. Full steps are on our{" "}
        <a href="/redeem" className="text-brand-600 hover:underline">
          redemption guide
        </a>
        .
      </p>

      <h2>What if something goes wrong?</h2>
      <p>
        If a deal isn&apos;t what you expected, or you need to cancel before
        redeeming, check our{" "}
        <a href="/refund-policy" className="text-brand-600 hover:underline">
          refund policy
        </a>{" "}
        or reach out via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        — we&apos;re happy to help sort it out.
      </p>
    </PageShell>
  );
}
