import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Redeem a Voucher" };

export default function RedeemPage() {
  return (
    <PageShell title="Redeem a voucher">
      <p>
        After checkout, your order confirmation email is your voucher — no
        need to print anything unless the merchant asks for it.
      </p>
      <h2>Steps to redeem</h2>
      <ul>
        <li>Check your email for the order confirmation</li>
        <li>Contact the merchant to arrange a time, if a booking is required</li>
        <li>Show your confirmation email (digital or printed) when you arrive</li>
        <li>Enjoy your deal before its expiry date</li>
      </ul>
      <p>
        Can&apos;t find your confirmation email? Reach out via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        with the email address you used at checkout.
      </p>
    </PageShell>
  );
}
