import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SampleDealCard from "@/components/SampleDealCard";
import EmailSignupForm from "@/components/EmailSignupForm";
import StickyApplyBar from "@/components/StickyApplyBar";
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
      <StickyApplyBar />
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
      <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ember-500 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-ember-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            🚧 Not live yet — launching soon in NZ
          </span>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Get up to 3 months free advertising for your business
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            MegaDeal is a new NZ deal platform that works differently:
            fairer, because we never take a commission — it&apos;s
            advertising only, so every dollar your customers pay goes
            straight to you. We&apos;re putting the finishing touches on
            launch, so sign up now and be first in front of customers
            the moment we go live.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-brand-100">
            Perfect for 🍽️ restaurants, 💆 spas, 🏋️ gyms, 🧘 yoga
            studios, 🚐 tours &amp; 🏨 getaways
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
            <span>💳 No credit card required</span>
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

      {/* Fit — moved up from below "How it works" so a visitor confirms
          "this is built for me" while first forming an impression, using
          concrete per-type hooks rather than the compact hero one-liner
          alone, before urgency/preview/perks copy competes for attention. */}
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

      {/* Why join pre-launch — reframes "not live yet" as the advantage it
          actually is, rather than leaving it as a bare fact discovered
          later in the Steps/FAQ sections. */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            We&apos;re in the final stretch before launch — here&apos;s why that&apos;s good news for you
          </h2>
          <p className="mt-2 text-slate-600">
            Being early isn&apos;t a downside here — it&apos;s the whole
            advantage. Sign up now and you&apos;re shaping your listing
            before a single customer sees it, not competing for attention
            with hundreds of other deals already live.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
              🥇 First pick of your category
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
              📣 Priority placement at launch
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
              🎁 The best offer we&apos;ll ever run
            </span>
          </div>
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

      {/* A note from the founder — the page's only real trust signal that
          isn't a claim MegaDeal makes about itself. Placed right before the
          ask, since a personal note lands hardest at the point of
          hesitation, not buried earlier where it competes with feature
          copy. */}
      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
            <span className="text-3xl">✍️</span>
            <p className="mt-3 text-lg leading-relaxed text-slate-700">
              Hi, I&apos;m Nicholas. I started MegaDeal because I kept
              seeing the same thing all over the place — brilliant local
              businesses with a quiet Tuesday table, an empty mat, or a
              treatment room sitting idle, right next to people who
              would&apos;ve loved to fill it, if they&apos;d only known it
              was there.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              This isn&apos;t a big corporate marketplace taking a cut of
              your sales — it&apos;s a small, NZ-run project trying to
              close that gap honestly. Zero commission isn&apos;t a
              launch gimmick; it&apos;s the whole point.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              We&apos;re not live yet, so I can&apos;t point you to a
              hundred happy businesses already on here — you&apos;d be one
              of the first. I read every application myself, and I&apos;d
              genuinely love to hear from you if you&apos;ve got questions
              before you commit to anything.
            </p>
            <p className="mt-5 font-semibold text-slate-900">
              — Nicholas, Founder of MegaDeal
            </p>
            <p className="mt-3 text-sm text-slate-500">
              P.S. If something on this page doesn&apos;t make sense or
              you&apos;re just not sure yet,{" "}
              <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
                get in touch
              </Link>{" "}
              — a real reply, not a bot.
            </p>
          </div>
        </div>
      </section>

      {/* Signup */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Suspense fallback={null}>
            <MerchantSignupForm />
          </Suspense>
        </div>
      </section>

      {/* Not ready yet — a genuine last resort for anyone who's read this far
          and still isn't ready to commit, not an exit offered right before
          the ask (that used to sit directly above the form itself). */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <p className="text-sm font-semibold text-slate-700">
            Still not ready to apply?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Leave your email and we&apos;ll let you know when we launch — no
            commitment.
          </p>
          <div className="mt-3">
            <EmailSignupForm
              audience="merchant"
              source="businesses-not-ready"
              buttonLabel="Notify me"
              accent="brand"
              surface="plain"
              center
            />
          </div>
        </div>
      </section>
    </main>
  );
}
