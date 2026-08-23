import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Redeem a Voucher" };

export default function RedeemPage() {
  return (
    <PageShell
      title="Redeem a voucher"
      subtitle="No app, no printing required — your confirmation email is all you need."
    >
      <p>
        After checkout, your order confirmation email is your voucher — no
        need to print anything unless the merchant specifically asks for it.
      </p>

      <h2>Steps to redeem</h2>
      <ul>
        <li>Check your email for the order confirmation right after purchase</li>
        <li>
          If the deal requires a booking, contact the merchant using the
          details in that email to arrange a time
        </li>
        <li>Show your confirmation email (digital or printed) when you arrive</li>
        <li>Enjoy your deal — redemption itself only takes a moment</li>
      </ul>

      <h2>Booking ahead</h2>
      <p>
        Some deals — like a specific spa treatment or a scheduled tour —
        need a booking in advance, especially around weekends and holidays.
        Where that&apos;s the case, it&apos;s noted on the deal page, so
        it&apos;s worth booking your slot as soon as you buy rather than
        waiting until the last few days of the validity window.
      </p>

      <h2>Partial redemption</h2>
      <p>
        If you bought more than one voucher, each is redeemed separately —
        you don&apos;t need to use them all in one visit unless the deal says
        otherwise.
      </p>

      <h2>Trouble redeeming?</h2>
      <p>
        Can&apos;t find your confirmation email, or the merchant isn&apos;t
        able to honour it? Reach out via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        with the email address you used at checkout and we&apos;ll help sort
        it out.
      </p>
    </PageShell>
  );
}
