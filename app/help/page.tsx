import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";

export const metadata: Metadata = {
  title: "Help Centre",
  alternates: { canonical: `${SITE_URL}/help` },
};

// Plain-text mirror of the JSX answers below, for FAQPage structured data —
// duplicated here rather than shared because the JSX versions include
// links (<a>) that don't reduce to clean structured-data text.
const FAQ_JSONLD = [
  { q: "Do I pay MegaDeal for a deal?", a: "No — MegaDeal never charges customers anything, and there's no voucher to buy. Deals are redeemed and paid for directly with the business, at the discounted price shown on the deal page." },
  { q: "Do I need an account to use MegaDeal?", a: "No — browsing and redeeming deals needs no sign-up or account at all. Only businesses need to create an account, to list and manage their own deals." },
  { q: "Is my payment information safe?", a: "There's nothing to keep safe — MegaDeal never asks for or stores your card details. You pay the business directly, however they normally take payment, the same as any other in-person or phone purchase." },
  { q: "How do I redeem a deal?", a: "Open the deal page and tap \"Get this deal\" to reveal the business's contact details and a short code. Get in touch or visit the business directly, quote that code, and pay them at the discounted price." },
  { q: "How long do I have to use a deal?", a: "Every deal shows its own validity window on the deal page. Once it expires, the business is under no obligation to honour the discounted price." },
  { q: "Can I redeem the same deal more than once?", a: "Deals are for genuine personal use — unless a listing says otherwise, that's one redemption per person. A business can decline to honour a deal it reasonably believes is being reused or resold." },
  { q: "How do I know a business is legitimate?", a: "Every business is reviewed by our team before their first deal goes live — we don't publish listings automatically." },
  { q: "Can I get a refund?", a: "Since MegaDeal never charges you, there's nothing for us to refund. Payment and any resulting dispute is between you and the business." },
  { q: "I'm a business — how do I list a deal?", a: "Head to our business page to find out how listing works — you advertise with credits or a subscription, and customers pay you directly when they redeem." },
];

export default function HelpPage() {
  return (
    <PageShell
      title="Help centre"
      subtitle="Answers to the questions we hear most often."
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_JSONLD.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          }),
        }}
      />

      <h2>Do I pay MegaDeal for a deal?</h2>
      <p>
        No — MegaDeal never charges customers anything, and there&apos;s no
        voucher to buy. Deals are redeemed and paid for directly with the
        business, at the discounted price shown on the deal page.
      </p>

      <h2>Do I need an account to use MegaDeal?</h2>
      <p>
        No — browsing and redeeming deals needs no sign-up or account at
        all. Only businesses need to create an account, to list and manage
        their own deals.
      </p>

      <h2>Is my payment information safe?</h2>
      <p>
        There&apos;s nothing to keep safe — MegaDeal never asks for or
        stores your card details. You pay the business directly, however
        they normally take payment, the same as any other in-person or
        phone purchase.
      </p>

      <h2>How do I redeem a deal?</h2>
      <p>
        Open the deal page and tap &quot;Get this deal&quot; to reveal the
        business&apos;s contact details and a short code (like{" "}
        <span className="font-mono font-semibold">MEGA-7K4XQ</span>). Get in
        touch or visit the business directly, quote that code so they know
        it&apos;s a MegaDeal offer, and pay them at the discounted price. See
        our{" "}
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

      <h2>Can I redeem the same deal more than once?</h2>
      <p>
        Deals are for genuine personal use — unless a listing says
        otherwise, that&apos;s one redemption per person. A business can
        decline to honour a deal it reasonably believes is being reused or
        resold. See our{" "}
        <a href="/terms" className="text-brand-600 hover:underline">
          terms
        </a>{" "}
        for the full fair-use policy.
      </p>

      <h2>How do I know a business is legitimate?</h2>
      <p>
        Every business is reviewed by our team before their first deal goes
        live — we don&apos;t publish listings automatically.
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
