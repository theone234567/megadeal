import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "How to Redeem a Deal",
  description:
    "How to redeem a MegaDeal deal — no voucher or order confirmation, just contact the business directly and quote your code.",
  alternates: { canonical: `${SITE_URL}/redeem` },
};

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
        <li>
          Mention the MegaDeal offer when you get in touch or arrive — most
          deal pages show a short code (like{" "}
          <span className="font-mono font-semibold">MEGA-7K4XQ</span>) you
          can quote so the business knows straight away
        </li>
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

      <h2>Availability &amp; fair use</h2>
      <p>
        Deals are offered directly by the business, subject to availability
        and while supplies last — where a deal has a quantity limit,
        it&apos;s first-in, first-served. Businesses use best endeavours to
        honour every deal within its validity window, but MegaDeal
        can&apos;t guarantee a specific deal will still be available when
        you get in touch. Deals are for genuine personal use — please
        don&apos;t resell or misuse them, and mention the deal honestly when
        you contact the business.
      </p>

      <h2>Trouble redeeming?</h2>
      <p>
        Can&apos;t reach the business, or they&apos;re not able to honour a
        current deal? Let us know via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        and we&apos;ll follow up with the business on your behalf — but as
        MegaDeal is just the advertiser and never a party to the booking or
        payment, any dispute over the deal itself is ultimately between you
        and the business. See our{" "}
        <a href="/terms" className="text-brand-600 hover:underline">
          terms
        </a>{" "}
        for more.
      </p>
    </PageShell>
  );
}
