import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { pageMetadata } from "@/lib/pageMetadata";
import { BUSINESS_COST, HELP_FAQ_TEXT, REFERRAL_ANSWER } from "@/lib/helpFaq";
import OpenHashedDetails from "@/components/OpenHashedDetails";

export const metadata: Metadata = pageMetadata({
  title: "Help Centre: Deals, Codes & Redeeming",
  description:
    "Answers to the most common MegaDeal questions — how deals work, redeeming without a voucher, refunds, and listing a business.",
  path: "/help",
});

interface Faq {
  q: string;
  a: ReactNode;
  /** An anchor other pages link to (/help#id). */
  id?: string;
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
        Open the deal page and copy the deal code (like{" "}
        <span className="font-mono font-semibold">MEGA-7K4XQ</span>). &quot;Contact business&quot; has the
        business&apos;s phone, email, website and directions. Get in touch or visit the business directly, quote it
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
    id: "deal-checks",
    q: "What do \"Business verified\" and \"Checked\" mean on a deal?",
    a: "Every deal page says who stands behind it. \"Business verified\" means the business has its own MegaDeal account and our team approved the deal. \"Listed by MegaDeal\" means our team approved it but the business hasn't set up its account yet. \"Checked\" is when our team last approved the deal, or when the business last confirmed it's still running as listed; \"Updated\" is when anything on the deal last changed. Deal end dates are real: we never show a fake countdown.",
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
    q: "How do I stop MegaDeal emails?",
    a: (
      <>
        Every MegaDeal email that isn&apos;t about your account has an Unsubscribe link at the
        bottom: one click and those emails stop. Businesses can also choose which MegaDeal emails
        they get under &quot;Emails from MegaDeal&quot; in the{" "}
        <Link href="/portal" prefetch={false} className="font-semibold text-brand-600 hover:underline">
          business portal
        </Link>
        . Emails about your account and your deals, like sign-in codes and approvals, always come.
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
        to find out how listing works — {BUSINESS_COST}
      </>
    ),
  },
  {
    q: "I'm a business — how do referral credits work?",
    a: (
      <>
        {REFERRAL_ANSWER} See section 9 of our{" "}
        <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
          terms
        </Link>
        .
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <main className={plusJakartaSans.className}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: HELP_FAQ_TEXT.map(({ q, a }) => ({
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
          <OpenHashedDetails />
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                id={f.id}
                className="scroll-mt-24 group rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
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
