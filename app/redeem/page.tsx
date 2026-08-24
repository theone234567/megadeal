import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "How to Redeem a Deal" };

export default function RedeemPage() {
  return (
    <PageShell
      title="How to redeem a deal"
      subtitle="No voucher, no order confirmation — just contact the business directly."
    >
      <p>
        MegaDeal doesn&apos;t sell vouchers or process payment for any deal.
        Every deal on the site is redeemed directly with the business that
        listed it, at the discounted price shown on the deal page.
      </p>

      <h2>Steps to redeem</h2>
      <ul>
        <li>Open the deal page and tap &quot;Get this deal&quot;</li>
        <li>
          Call, message, or visit the business using the contact details
          shown — some deals need a booking ahead of time, others are
          walk-in, so check the deal&apos;s fine print
        </li>
        <li>Mention the MegaDeal offer when you get in touch or arrive</li>
        <li>Pay the business directly at the discounted price and enjoy</li>
      </ul>

      <h2>Booking ahead</h2>
      <p>
        Some deals — like a specific spa treatment or a scheduled tour —
        need a booking in advance, especially around weekends and holidays.
        Where that&apos;s the case, it&apos;s noted on the deal page, so
        it&apos;s worth getting in early rather than waiting until the last
        few days of the validity window.
      </p>

      <h2>Trouble redeeming?</h2>
      <p>
        Can&apos;t reach the business, or they&apos;re not able to honour a
        current deal? Let us know via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        — we&apos;ll follow up with the business on your behalf.
      </p>
    </PageShell>
  );
}
