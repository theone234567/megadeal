import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Help Centre",
  description:
    "Answers to the most common MegaDeal questions — how deals work, redeeming without a voucher, refunds, and listing a business.",
  path: "/help",
});

// Plain-text mirror of the JSX answers below, for FAQPage structured data —
// duplicated here rather than shared because the JSX versions include
// links (<a>) that don't reduce to clean structured-data text.
const FAQ_JSONLD = [
  { q: "Do I pay MegaDeal for a deal?", a: "No — MegaDeal never charges customers anything, and there's no voucher to buy. Deals are redeemed and paid for directly with the business, at the discounted price shown on the deal page." },
  { q: "Do I need an account to use MegaDeal?", a: "No — browsing and redeeming deals needs no signup or account at all. Only businesses need to create an account, to list and manage their own deals." },
  { q: "Is my payment information safe?", a: "There's nothing to keep safe — MegaDeal never asks for or stores your card details. You pay the business directly, however they normally take payment, the same as any other in-person or phone purchase." },
  { q: "How do I redeem a deal?", a: "Open the deal page: the deal code and the business's contact details are under \"Get this deal\". Copy the code, get in touch or visit the business directly, quote that code, and pay them at the discounted price." },
  { q: "Do I need to book before using a deal?", a: "It depends on the deal. Each deal page says whether booking is required, recommended or not needed, along with the business's contact details. If booking is required, book ahead and quote your deal code when you do." },
  { q: "How long do I have to use a deal?", a: "Every deal shows its own validity window on the deal page. Once it expires, the business is under no obligation to honour the discounted price." },
  { q: "Can I redeem the same deal more than once?", a: "Deals are for genuine personal use — unless a listing says otherwise, that's one redemption per person. A business can decline to honour a deal it reasonably believes is being reused or resold." },
  { q: "How do I know a business is legitimate?", a: "Every business is reviewed by our team before their first deal goes live — we don't publish listings automatically." },
  { q: "What if a business won't honour a deal?", a: "First check the deal hasn't expired and that you've met its conditions, such as booking ahead. If a business still won't honour a current deal, use the \"Deal not honoured? Tell us\" link on the deal page, or our contact page, and our team will look into it." },
  { q: "Can I get a refund?", a: "Since MegaDeal never charges you, there's nothing for us to refund. Payment and any resulting dispute is between you and the business." },
  { q: "Is Groupon still in New Zealand?", a: "No. Groupon closed its New Zealand business in 2020, and MegaDeal isn't connected with it. MegaDeal is a New Zealand-owned local deals site, starting in Auckland. It works differently: there's no voucher to buy. You get a free deal code, contact the business, and pay them directly at the deal price." },
  { q: "I'm a business — how do I list a deal?", a: "Head to our business page to find out how listing works — you advertise with pay-as-you-go credits, and customers pay you directly when they redeem." },
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
        Open the deal page: the deal code (like{" "}
        <span className="font-mono font-semibold">MEGA-7K4XQ</span>) and the
        business&apos;s contact details are under &quot;Get this deal&quot;.
        Copy the code, get in touch or visit the business directly, quote it
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
    q: "Do I need to book before using a deal?",
    a: "It depends on the deal. Each deal page says whether booking is required, recommended or not needed, along with the business's contact details. If booking is required, book ahead and quote your deal code when you do.",
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
    q: "What if a business won't honour a deal?",
    a: (
      <>
        First check the deal hasn&apos;t expired and that you&apos;ve met its
        conditions, such as booking ahead. If a business still won&apos;t
        honour a current deal, use the &quot;Deal not honoured? Tell us&quot;
        link on the deal page, or our{" "}
        <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
          contact page
        </Link>
        , and our team will look into it.
      </>
    ),
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
    // Groupon left New Zealand in 2020 and people still search for it;
    // a plain answer is useful to them and to search. Facts only: no
    // claim of any link with Groupon.
    q: "Is Groupon still in New Zealand?",
    a: "No. Groupon closed its New Zealand business in 2020, and MegaDeal isn't connected with it. MegaDeal is a New Zealand-owned local deals site, starting in Auckland. It works differently: there's no voucher to buy. You get a free deal code, contact the business, and pay them directly at the deal price.",
  },
  {
    q: "I'm a business — how do I list a deal?",
    a: (
      <>
        Head to our{" "}
        <Link href="/list-your-business" className="font-semibold text-brand-600 hover:underline">
          business page
        </Link>{" "}
        to find out how listing works — you advertise with
        pay-as-you-go credits, and customers pay you directly when they
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
      <section aria-labelledby="help-faq-heading" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 id="help-faq-heading" className={`${fredoka.className} mb-6 text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Questions about using MegaDeal
          </h2>
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
          <h2 className={`${fredoka.className} text-xl font-bold text-slate-900 sm:text-2xl`}>
            Still stuck?
          </h2>
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
