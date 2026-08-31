import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Help Centre" };

export default function HelpPage() {
  return (
    <PageShell
      title="Help centre"
      subtitle="Answers to the questions we hear most often."
    >
      <h2>Do I pay MegaDeal for a deal?</h2>
      <p>
        No — MegaDeal never charges customers anything. Deals are redeemed
        and paid for directly with the business, at the discounted price
        shown on the deal page.
      </p>

      <h2>How do I redeem a deal?</h2>
      <p>
        Open the deal page, tap &quot;Get this deal&quot; to see the
        business&apos;s contact details, then get in touch or visit them
        directly — mention the MegaDeal offer when you do. See our{" "}
        <a href="/redeem" className="text-brand-600 hover:underline">
          redemption guide
        </a>{" "}
        for the full walkthrough.
      </p>

      <h2>How long do I have to use a deal?</h2>
      <p>
        Every deal shows its own validity window on the deal page. Once it
        expires, the business is under no obligation to honour the
        discounted price.
      </p>

      <h2>Can I get a refund?</h2>
      <p>
        Since MegaDeal never charges you, there&apos;s nothing for us to
        refund. See our{" "}
        <a href="/refund-policy" className="text-brand-600 hover:underline">
          refund policy
        </a>{" "}
        for how pricing and disputes work instead.
      </p>

      <h2>I&apos;m a business — how do I list a deal?</h2>
      <p>
        Head to our{" "}
        <a href="/businesses" className="text-brand-600 hover:underline">
          business page
        </a>{" "}
        to find out how listing works — you advertise with credits or a
        subscription, and customers pay you directly when they redeem.
      </p>

      <h2>Still stuck?</h2>
      <p>
        Reach us through the{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        and we&apos;ll sort it out.
      </p>
    </PageShell>
  );
}
