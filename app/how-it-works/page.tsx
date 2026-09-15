import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { safeJsonLd } from "@/lib/safeJsonLd";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How MegaDeal works: browse local deals for free and contact the business directly to redeem, or list your own deal and reach new customers.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
};

interface Step {
  number: string;
  title: string;
  text: ReactNode;
  // Plain-string version for JSON-LD (HowTo steps need a text value, not
  // JSX) — only needed where `text` isn't already a plain string.
  schemaText?: string;
}

const CUSTOMER_STEPS: Step[] = [
  {
    number: "1",
    title: "Find a deal",
    text: "Browse by category — Food & Drink, Beauty & Spa, Things To Do, Travel & Getaways, Health & Fitness — or search for exactly what you're after. Every deal card shows the discount percentage, the price, and a countdown to when it ends, so you can tell at a glance whether it's worth a closer look.",
  },
  {
    number: "2",
    title: "Grab the deal",
    text: `Open the deal page to see exactly what's on offer, the fine print, and who's behind it. Tap "Get this deal" to reveal the business's phone number, website and address — there's no voucher to buy and no checkout on MegaDeal. We don't take a card number or process any payment; you're just unlocking the business's contact details.`,
  },
  {
    number: "3",
    title: "Redeem with the business, directly",
    text: (
      <>
        Contact or visit the business, mention the MegaDeal offer, and pay
        them directly at the discounted price. How and when you redeem is
        up to the business — some deals need a booking, others are
        walk-in. See our{" "}
        <Link href="/redeem" className="font-semibold text-brand-600 hover:underline">
          redemption guide
        </Link>{" "}
        for the general process.
      </>
    ),
    schemaText:
      "Contact or visit the business, mention the MegaDeal offer, and pay them directly at the discounted price. How and when you redeem is up to the business — some deals need a booking, others are walk-in.",
  },
  {
    number: "4",
    title: "Get new deals by email (optional)",
    text: `Pop your email into the sign-up box (footer, or the corner prompt that appears as you browse) to get new local deals sent to your inbox. Straight after, check that inbox for an email from us and click the "Confirm my email" button in it — that one click is what actually switches your alerts on, so you don't get signed up to something you never asked for if someone else typed in your address by mistake. No account or password needed, and every email has an unsubscribe link if you change your mind.`,
  },
];

const BUSINESS_STEPS: Step[] = [
  {
    number: "1",
    title: "Create your account & apply",
    text: (
      <>
        Set up your login and tell us about your business on our{" "}
        <Link href="/list-your-business" className="font-semibold text-brand-600 hover:underline">
          business page
        </Link>{" "}
        — one form, a couple of minutes, and you&apos;re straight into
        your new business portal.
      </>
    ),
    schemaText:
      "Set up your login and tell us about your business on the business page — one form, a couple of minutes, and you're straight into your new business portal.",
  },
  {
    number: "2",
    title: "Verify your email",
    text: "We'll send you a short code straight to your inbox — pop it in so we know this email is really yours, and you're verified.",
  },
  {
    number: "3",
    title: "We review your application",
    text: "Our team checks new businesses before they go live — usually within a couple of business days.",
  },
  {
    number: "4",
    title: "Get notified and log in",
    text: "You'll get a welcome email the moment your account is approved. From there, log in to your business portal any time — you'll have a couple of free introductory deal credits waiting, and you can complete the rest of your profile whenever suits, if you haven't already.",
  },
  {
    number: "5",
    title: "Your deal goes live at launch",
    text: (
      <>
        Your deal stays queued and ready from the moment you submit it —
        it goes live for customers the moment MegaDeal officially
        launches, not before. We&apos;ll email you when that happens, and
        your business portal will reflect it too. Got a question in the
        meantime? Feel free to{" "}
        <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
          get in touch
        </Link>{" "}
        any time.
      </>
    ),
    schemaText:
      "Your deal stays queued and ready from the moment you submit it — it goes live for customers the moment MegaDeal officially launches, not before. You'll get an email when that happens.",
  },
  {
    number: "6",
    title: "Top up anytime",
    text: "Once your free credits run out, you can top up your account from your portal whenever you're ready to list another deal.",
  },
];

function stepSchemaText(step: Step): string {
  return step.schemaText ?? (typeof step.text === "string" ? step.text : step.title);
}

function howToJsonLd(name: string, description: string, steps: Step[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((s) => ({
      "@type": "HowToStep",
      position: Number(s.number),
      name: s.title,
      text: stepSchemaText(s),
    })),
  };
}

function StepGrid({ steps, cols }: { steps: Step[]; cols: string }) {
  return (
    <div className={`mt-8 grid grid-cols-1 gap-8 ${cols}`}>
      {steps.map((s) => (
        <div key={s.number}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
            {s.number}
          </span>
          <h3 className="font-display mt-3 font-bold text-slate-900">{s.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <main className={plusJakartaSans.className}>
      {/* Structured how-to data for both flows on this page — the direct
          target for "how does MegaDeal work" style questions to an AI
          answer engine, which can otherwise only pull from the prose. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            howToJsonLd(
              `How to redeem a deal on ${SITE_NAME}`,
              "How customers find and redeem a local deal on MegaDeal, free of charge.",
              CUSTOMER_STEPS
            )
          ),
        }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            howToJsonLd(
              `How to list a deal on ${SITE_NAME}`,
              "How a local business applies, gets approved, and lists a deal on MegaDeal.",
              BUSINESS_STEPS
            )
          ),
        }}
      />
      {/* Hero */}
      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className={`${fredoka.className} text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl`}>
            How it works
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            Free to browse for customers. Advertising, not a
            marketplace, for businesses. Here&apos;s exactly how each
            side works.
          </p>
        </div>
      </section>

      {/* For customers */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            For customers
          </h2>
          <StepGrid steps={CUSTOMER_STEPS} cols="sm:grid-cols-2" />
        </div>
      </section>

      {/* For businesses */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            For businesses
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            MegaDeal is advertising, not a marketplace — you never hand us
            a cut of a sale, because we never process one. Instead, you
            list a deal for a fixed number of advertising credits, and
            every customer who redeems it pays you directly, in full.
          </p>
          <StepGrid steps={BUSINESS_STEPS} cols="sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      </section>

      {/* Questions or issues? */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${fredoka.className} text-xl font-bold text-slate-900 sm:text-2xl`}>
            Questions or issues?
          </p>
          <p className="mt-2 text-base text-slate-600">
            If a business can&apos;t honour a deal, or something on a
            listing looks wrong, let us know via our{" "}
            <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
              contact page
            </Link>{" "}
            and we&apos;ll follow up — but unfortunately, we just
            can&apos;t issue a refund for something we never charged
            you for.
          </p>
        </div>
      </section>
    </main>
  );
}
