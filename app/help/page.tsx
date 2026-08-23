import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Help Centre" };

export default function HelpPage() {
  return (
    <PageShell title="Help centre">
      <h2>Where&apos;s my voucher?</h2>
      <p>
        Your order confirmation email is your voucher — check your inbox
        (and spam folder) right after checkout.
      </p>
      <h2>How do I redeem a deal?</h2>
      <p>
        Contact the merchant directly using the details in your confirmation
        email to arrange a booking, then present your voucher when you visit.
        See our{" "}
        <a href="/redeem" className="text-brand-600 hover:underline">
          redemption guide
        </a>{" "}
        for details.
      </p>
      <h2>Can I get a refund?</h2>
      <p>
        Most deals can be refunded before redemption — see our{" "}
        <a href="/refund-policy" className="text-brand-600 hover:underline">
          refund policy
        </a>
        .
      </p>
      <h2>Still stuck?</h2>
      <p>
        Reach us through the{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        and we&apos;ll help you out.
      </p>
    </PageShell>
  );
}
