import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import MerchantSignupForm from "./MerchantSignupForm";

export const metadata: Metadata = {
  title: "List Your Deal — Advertise Your NZ Business",
  description:
    "Reach thousands of local customers with a deal on MegaDeal. No lock-in contracts, zero commission, and a limited-time free advertising offer for new businesses.",
};

export default function MerchantsPage() {
  return (
    <PageShell
      title="List your deal"
      subtitle="Reach new customers in your city without any upfront ad spend."
    >
      <a
        href="#signup"
        className="inline-block rounded-full bg-ember-500 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-card transition hover:bg-ember-600"
      >
        Sign up your business ↓
      </a>

      <p>
        Restaurants, spas, activity providers and travel operators use
        MegaDeal to fill quiet periods and introduce themselves to customers
        who&apos;ve never visited before. MegaDeal is advertising, not a
        marketplace: you pay us with advertising credits or a subscription to
        get your deal in front of new customers — we never take a cut of what
        you charge them, because we never touch that payment at all.
      </p>

      <h2>Why merchants list with us</h2>
      <ul>
        <li>Zero commission — every dollar a customer pays goes to you, not us</li>
        <li>Pay with simple advertising credits or a subscription, not a cut of sales</li>
        <li>Full control over how many spots are available and when</li>
        <li>Deals go live fast — most listings are ready within a few days</li>
      </ul>

      <h2>How it works for you</h2>
      <p>
        You tell us what you&apos;d like to offer — a percentage off, a
        bundled experience, a set price — and we help shape it into a
        listing that converts. Once it&apos;s live, customers see it on
        MegaDeal and contact or visit you directly to redeem it, paying you
        in full at the discounted price — exactly like a regular booking or
        walk-in.
      </p>

      <h2>Who it&apos;s a good fit for</h2>
      <p>
        MegaDeal works best for businesses with some spare capacity to fill —
        an off-peak dinner slot, a treatment room between appointments, seats
        on a tour that isn&apos;t full. If that sounds like you, we&apos;d
        love to hear from you.
      </p>

      <MerchantSignupForm />
    </PageShell>
  );
}
