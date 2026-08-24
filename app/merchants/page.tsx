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
        who&apos;ve never visited before. You set the offer and the
        redemption terms — we handle the marketing, payments and customer
        support.
      </p>

      <h2>Why merchants list with us</h2>
      <ul>
        <li>No upfront cost — you only pay a share of each deal sold</li>
        <li>Full control over how many vouchers are available and when</li>
        <li>New customer data and repeat-visit insights after each campaign</li>
        <li>Deals go live fast — most listings are ready within a few days</li>
      </ul>

      <h2>How it works for you</h2>
      <p>
        You tell us what you&apos;d like to offer — a percentage off, a
        bundled experience, a set voucher amount — and we help shape it into
        a listing that converts. Once it&apos;s live, customers buy directly
        through MegaDeal, and you redeem vouchers exactly as you would a
        regular booking or walk-in.
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
