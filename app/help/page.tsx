import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Answers to the most common MegaDeal questions — how deals work, redeeming without a voucher, refunds, and listing a business.",
  alternates: { canonical: `${SITE_URL}/help` },
};

// Plain-text mirror of the JSX answers below, for FAQPage structured data —
// duplicated here rather than shared because the JSX versions include
// links (<a>) that don't reduce to clean structured-data text.
const FAQ_JSONLD = [
  { q: "Do I pay MegaDeal for a deal?", a: "No — MegaDeal never charges customers anything, and there's no voucher to buy. Deals are redeemed and paid for directly with the business, at the discounted price shown on the deal page." },
  { q: "Do I need an account to use MegaDeal?", a: "No — browsing and redeeming deals needs no signup or account at all. Only businesses need to create an account, to list and manage their own deals." },
  { q: "Is my payment information safe?", a: "There's nothing to keep safe — MegaDeal never asks for or stores your card details. You pay the business directly, however they normally take payment, the same as any other in-person or phone purchase." },
  { q: "How do I redeem a deal?", a: "Open the deal page and tap \"Get this deal\" to reveal the business's contact details and a short code. Get in touch or visit the business directly, quote that code, and pay them at the discounted price." },
  { q: "How long do I have to use a deal?", a: "Every deal shows its own validity window on the deal page. Once it expires, the business is under no obligation to honour the discounted price." },
  { q: "Can I redeem the same deal more than once?", a: "Deals are for genuine personal use — unless a listing says otherwise, that's one redemption per person. A business can decline to honour a deal it reasonably believes is being reused or resold." },
  { q: "How do I know a business is legitimate?", a: "Every business is reviewed by our team before their first deal goes live — we don't publish listings automatically." },
  { q: "Can I get a refund?", a: "Since MegaDeal never charges you, there's nothing for us to refund. Payment and any resulting dispute is between you and the business." },
  { q: "I'm a business — how do I list a deal?", a: "Head to our business page to find out how listing works — you advertise with credits or a subscription, and customers pay you directly when they redeem." },
];

interface Faq {
  q: string;
  a: ReactNode;
}

const FAQS: Faq[] = [
  {
    q: "Do I pay MegaDeal for a deal?",
    a: "No — MegaDeal never charges customers anything, and there's no voucher to buy. Deals are redeemed and paid for directly with the business, at the discounted price shown on the deal page.",
  },
  {
    q: "Do I need an account to use MegaDeal?",
    a: "No — browsing and redeeming deals needs no signup or account at all. Only businesses need to create an account, to list and manage their own deals.",
  },
  {
    q: "Is my payment information safe?",
    a: "There's nothing to keep safe — MegaDeal never asks for or stores your card details. You pay the business directly, however they normally take payment, the same as any other in-person or phone purchase.",
  },
  {
    q: "How do I redeem a deal?",
    a: (
      <>
        Open the deal page and tap &quot;Get this deal&quot; to reveal
        the business&apos;s contact details and a short code (like{" "}
        <span className="font-mono font-semibold">MEGA-7K4XQ</span>).
        Get in touch or visit the business directly, quote that code
        so they know it&apos;s a MegaDeal offer, and pay them at the
        discounted price. See our{" "}
        <Link href="/redeem" className="font-semibold text-brand-600 hover:underline">
          redemption guide
        </Link>{" "}
        for the full walkthrough.
      </>
    ),
  },
  {
    q: "How long do I have to use a deal?",
    a: "Every deal shows its own validity window on the deal page. Once it expires, the business is under no obligation to honour the discounted price.",
  },
  {
    q: "Can I redeem the same deal more than once?",
    a: (
      <>
        Deals are for genuine personal use — unless a listing says
        otherwise, that&apos;s one redemption per person. A business
        can decline to honour a deal it reasonably believes is being
        reused or resold. See our{" "}
        <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
          terms
        </Link>{" "}
        for the full fair-use policy.
      </>
    ),
  },
  {
    q: "How do I know a business is legitimate?",
    a: "Every business is reviewed by our team before their first deal goes live — we don't publish listings automatically.",
  },
  {
    q: "Can I get a refund?",
    a: (
      <>
        Since MegaDeal never charges you, there&apos;s nothing for us
        to refund. See our{" "}
        <Link href="/refund-policy" className="font-semibold text-brand-600 hover:underline">
          refund policy
        </Link>{" "}
        for how pricing and disputes work instead.
      </>
    ),
  },
  {
    q: "I'm a business — how do I list a deal?",
    a: (
      <>
        Head to our{" "}
        <Link href="/list-your-business" className="font-semibold text-brand-600 hover:underline">
          business page
        </Link>{" "}
        to find out how listing works — you advertise with credits or
        a subscription, and customers pay you directly when they
        redeem.
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <main className={plusJakartaSans.className}>
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

      {/* Hero */}
      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className={`${fredoka.className} text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl`}>
            Help centre
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            Answers to the questions we hear most often.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
              >
                <summary className="cursor-pointer list-none font-bold text-slate-900 marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="shrink-0 text-slate-500 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Still stuck? */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${fredoka.className} text-xl font-bold text-slate-900 sm:text-2xl`}>
            Still stuck?
          </p>
          <p className="mt-2 text-base text-slate-600">
            Reach us through the{" "}
            <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
              contact page
            </Link>{" "}
            and we&apos;ll sort it out.
          </p>
        </div>
      </section>
    </main>
  );
}
