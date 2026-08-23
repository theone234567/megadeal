import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Help Centre" };

export default function HelpPage() {
  return (
    <PageShell
      title="Help centre"
      subtitle="Answers to the questions we hear most often."
    >
      <h2>Where&apos;s my voucher?</h2>
      <p>
        Your order confirmation email is your voucher — check your inbox
        (and spam folder) right after checkout. It includes your order
        reference, what you bought, and how long you have to redeem it.
      </p>

      <h2>How do I redeem a deal?</h2>
      <p>
        Contact the merchant directly using the details in your confirmation
        email to arrange a booking if one&apos;s needed, then present your
        voucher when you visit. See our{" "}
        <a href="/redeem" className="text-brand-600 hover:underline">
          redemption guide
        </a>{" "}
        for the full walkthrough.
      </p>

      <h2>How long do I have to use a deal?</h2>
      <p>
        Every deal shows its own validity window on the deal page and in
        your confirmation email. You can redeem anytime within that window —
        there&apos;s no need to use it right away.
      </p>

      <h2>Can I change the quantity after buying?</h2>
      <p>
        Once an order is placed it can&apos;t be edited, but you can buy an
        additional voucher separately, or contact us if you need to adjust
        an order before it&apos;s been redeemed.
      </p>

      <h2>Can I get a refund?</h2>
      <p>
        Most deals can be refunded before redemption — see our{" "}
        <a href="/refund-policy" className="text-brand-600 hover:underline">
          refund policy
        </a>{" "}
        for the details.
      </p>

      <h2>I&apos;m a business — how do I list a deal?</h2>
      <p>
        Head to our{" "}
        <a href="/merchants" className="text-brand-600 hover:underline">
          merchant page
        </a>{" "}
        to find out how listing works and get in touch.
      </p>

      <h2>Still stuck?</h2>
      <p>
        Reach us through the{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        with your order details and we&apos;ll sort it out.
      </p>
    </PageShell>
  );
}
