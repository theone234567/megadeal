import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SampleDealCard from "@/components/SampleDealCard";
import MerchantSignupForm from "./MerchantSignupForm";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";

export const metadata: Metadata = {
  title: "List Your Deal — Advertise Your NZ Business",
  description:
    "Be one of the first businesses on MegaDeal. No lock-in contracts, zero commission, and a limited-time free advertising offer for new NZ businesses.",
  alternates: { canonical: `${SITE_URL}/businesses` },
};

const PERKS = [
  {
    emoji: "🤝",
    title: "Zero commission",
    text: "Every dollar a customer pays goes straight to you. MegaDeal doesn't touch the payment.",
  },
  {
    emoji: "💳",
    title: "Pay in credits, not a cut",
    text: "You pay MegaDeal in simple advertising credits or a subscription — never a percentage of sales.",
  },
  {
    emoji: "⚡",
    title: "Live in days, not weeks",
    text: "Submit your deal, we review it, and it's usually live within a couple of business days.",
  },
  {
    emoji: "🔓",
    title: "No lock-in contracts",
    text: "Pause, update or cancel your deal whenever suits your business — no minimum term.",
  },
];

const BUSINESS_TYPES = [
  { emoji: "🍽️", label: "Restaurants & cafes", hook: "Turn a quiet Tuesday into a full house" },
  { emoji: "💆", label: "Spas & beauty", hook: "Book out every treatment room, every week" },
  { emoji: "🏋️", label: "Gyms & fitness studios", hook: "Pack out your off-peak classes" },
  { emoji: "🧘", label: "Yoga & pilates", hook: "Fill every mat, not just the popular slots" },
  { emoji: "🚐", label: "Tours & activities", hook: "Sell the seats that would've gone empty" },
  { emoji: "🏨", label: "Getaways & stays", hook: "Fill your rooms on the nights that need it" },
];

const FAQS = [
  {
    q: "How much does it cost to list on MegaDeal?",
    a: "MegaDeal is advertising, not a marketplace — you pay in simple advertising credits or a subscription, never a percentage of your sales. New businesses can also get up to 3 months free advertising with code WELCOME3 at signup. Conditions apply.",
  },
  {
    q: "Do you take a commission on my sales?",
    a: "No. MegaDeal never touches the payment — customers pay you direct, and you keep every dollar.",
  },
  {
    q: "Do I need a physical storefront?",
    a: "MegaDeal works best for local businesses with some spare capacity to fill — an off-peak dinner slot, a treatment room between appointments, seats on a tour that isn't full. We're not currently set up for pure online/product retailers (see MegaShop for that) or adult entertainment businesses.",
  },
  {
    q: "How long until my deal goes live?",
    a: "Usually within a couple of business days after you apply. Once approved, log back into your business portal to build your first deal — price, photo, terms and duration.",
  },
  {
    q: "Is there a lock-in contract?",
    a: "No lock-in contracts. Pause, update or cancel your deal whenever suits your business — there's no minimum term.",
  },
  {
    q: "What does the WELCOME3 code do?",
    a: "Enter WELCOME3 in the referral/promo code field when you sign up to get up to 3 months free advertising as a new business. Conditions apply.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Create your account & apply",
    text: "Set up your login and tell us about your business — one form, a couple of minutes.",
  },
  {
    number: "2",
    title: "We review & set up your deal",
    text: "Once approved, log back in to build your first deal — price, photo, terms, duration.",
  },
  {
    number: "3",
    title: "Customers contact you directly",
    text: "Your deal goes live the moment we launch. Customers redeem it by booking or visiting you — you keep every dollar.",
  },
];

export default function MerchantsPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Local business advertising",
            name: `${SITE_NAME} business advertising`,
            description:
              "Zero-commission advertising for local New Zealand businesses — customers pay the business direct, and MegaDeal is paid in advertising credits or a subscription, never a cut of sales.",
            provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            areaServed: { "@type": "Country", name: "New Zealand" },
            audience: {
              "@type": "BusinessAudience",
              audienceType: "Local businesses (restaurants, spas, activities, tours, getaways)",
            },
            url: `${SITE_URL}/businesses`,
          }),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ember-500 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-ember-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Get up to 3 months free advertising for your business
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            MegaDeal is advertising, not a marketplace — zero commission.
            Sign up now, get your deal ready, and you&apos;re first in
            front of customers the moment we launch — paid in full,
            direct.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#signup"
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-card transition active:scale-95 hover:bg-brand-50"
            >
              🚀 Sign up your business
            </a>
            <a
              href="#preview"
              className="flex items-center gap-2 rounded-full border-2 border-white/70 px-6 py-3 text-sm font-bold text-white transition active:scale-95 hover:bg-white/10"
            >
              See a preview ↓
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-brand-50">
            <span>🎁 Up to 3 months free</span>
            <span>🤝 0% commission</span>
            <span>🔓 No lock-in</span>
          </div>
        </div>
      </section>

      {/* Free advertising offer CTA */}
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-2xl bg-ember-500 px-6 py-6 text-center shadow-card sm:flex-row sm:text-left">
          <div className="flex-1">
            <p className="text-lg font-extrabold text-white sm:text-xl">
              🎁 Get up to 3 months free advertising
            </p>
            <p className="mt-1 text-sm text-ember-50">
              Enter code <span className="font-bold">WELCOME3</span> when you sign up below.{" "}
              <span className="font-semibold">Conditions apply.</span>
            </p>
          </div>
          <a
            href="#signup"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-bold text-ember-600 shadow-card transition active:scale-95 hover:bg-ember-50"
          >
            Claim your free advertising →
          </a>
        </div>
      </section>

      {/* Preview mockup */}
      <section id="preview" className="scroll-mt-[140px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-600">
              A quick preview
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Here&apos;s what your listing could look like
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-500">
              This is a sample, not a real deal — but it&apos;s exactly the
              layout customers will see: your photo, your price, your
              business name, front and centre.
            </p>
          </div>

          <div className="mt-8">
            <SampleDealCard />
          </div>

          <p className="mx-auto mt-4 max-w-md text-center text-xs text-slate-500">
            Deal pages also auto-show your bio, hours, amenities, price
            range, social links and a &quot;Book now&quot; button if you
            have one — so customers get the full picture before they
            contact you.
          </p>
        </div>
      </section>

      {/* Perks */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Why businesses list with us
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {PERKS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
              >
                <span className="text-2xl">{p.emoji}</span>
                <h3 className="mt-2 font-bold text-slate-900">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            How it works
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.number}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
                  {s.number}
                </span>
                <h3 className="mt-3 font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fit + pricing */}
      <section className="bg-brand-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            Got a quiet Tuesday, an empty mat, or a room going spare?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-600">
            That&apos;s exactly who MegaDeal is built for. Any spare capacity
            you&apos;ve got — an off-peak table, a treatment room between
            appointments, seats on a tour that never quite fills — is
            someone else&apos;s perfect excuse to say yes. Put it in front of
            them.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_TYPES.map((t) => (
              <div
                key={t.label}
                className="rounded-2xl bg-white p-4 text-left shadow-sm"
              >
                <span className="text-lg">
                  {t.emoji} {t.label}
                </span>
                <p className="mt-1 text-sm text-slate-500">{t.hook}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-xl text-xs text-slate-600">
            We&apos;re not currently set up for pure online/product retailers
            (see{" "}
            <Link href="/megashop" className="underline hover:text-slate-800">
              MegaShop
            </Link>{" "}
            for that) or adult entertainment businesses.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
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
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      </section>

      {/* Signup */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Suspense fallback={null}>
            <MerchantSignupForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
