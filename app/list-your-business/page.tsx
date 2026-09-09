import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SampleDealCard from "@/components/SampleDealCard";
import EmailSignupForm from "@/components/EmailSignupForm";
import StickyApplyBar from "@/components/StickyApplyBar";
import ConversionTracker from "@/components/ConversionTracker";
import MerchantSignupForm from "./MerchantSignupForm";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { getSignupStats } from "@/lib/publicStats";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { PercentIcon, ZapIcon, MapPinIcon } from "@/components/icons";

// Re-checked at most once a minute — the counts only need to be
// approximately live, and this avoids hitting Wix on every single request.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Free Advertising for Auckland Businesses — MegaDeal",
  description:
    "Auckland businesses: claim up to 3 months free advertising on MegaDeal. 0% commission, no lock-in, no credit card required.",
  alternates: { canonical: `${SITE_URL}/list-your-business` },
};

// The exact CTA used everywhere on this page — one wording, always
// scrolling to the signup form, so a visitor never has to work out which
// button is "the" button.
const CTA_LABEL = "CLAIM MY FREE LISTING →";

const WHY_JOIN_NOW = [
  {
    icon: "🎁",
    title: "Up to 3 months FREE",
    text: "Get started without paying an advertising fee during your introductory period.",
  },
  {
    icon: PercentIcon,
    title: "0% commission",
    text: "Customers deal directly with your business. MegaDeal does not take a percentage of your sales.",
  },
  {
    icon: MapPinIcon,
    title: "Reach local customers",
    text: "Get discovered by people searching for deals and things to do near them.",
  },
  {
    icon: ZapIcon,
    title: "Get in early",
    text: "Be among the first businesses featured when MegaDeal launches in Auckland.",
  },
];

const WHAT_YOU_GET = [
  {
    emoji: "📱",
    title: "A dedicated business listing",
    text: "Show your business name, photos, description, location, hours and links.",
  },
  {
    emoji: "🔥",
    title: "Deal listings",
    text: "Create genuine offers designed to give customers a reason to choose you.",
  },
  {
    emoji: "📍",
    title: "Local discovery",
    text: "Customers can find deals near them using MegaDeal's location features.",
  },
  {
    emoji: "⚡",
    title: "Flash Deals",
    text: "Have spare capacity today? Create a short-term offer to help fill it.",
  },
  {
    emoji: "🔗",
    title: "Direct customers",
    text: "Customers contact or book with your business directly.",
  },
  {
    emoji: "💰",
    title: "Keep your sales",
    text: "MegaDeal charges advertising fees/subscriptions — not a percentage of your sales.",
  },
];

const BUSINESS_TYPES = [
  { emoji: "🍽️", label: "Restaurants & Cafes", hook: "Turn a quiet Tuesday into a full house" },
  { emoji: "💆", label: "Beauty & Spas", hook: "Book out every treatment room, every week" },
  { emoji: "🏋️", label: "Gyms & Fitness", hook: "Pack out your off-peak classes" },
  { emoji: "🚐", label: "Tours & Activities", hook: "Sell the seats that would've gone empty" },
  { emoji: "🏨", label: "Getaways & Stays", hook: "Fill your rooms on the nights that need it" },
  { emoji: "🧹", label: "Home Services", hook: "Turn a slow booking week into a full one" },
];

const WHO_ITS_FOR = [
  "Restaurants", "Cafes", "Bars", "Beauty", "Spas", "Gyms", "Fitness", "Yoga",
  "Tours", "Activities", "Accommodation", "Entertainment", "Workshops", "Home Services",
];

const FAQS = [
  {
    q: "Is MegaDeal really free?",
    a: "New qualifying businesses can receive up to 3 months of free advertising during the launch period. Conditions apply.",
  },
  {
    q: "Does MegaDeal take commission?",
    a: "No. MegaDeal does not take a percentage of your sales. Customers deal directly with your business.",
  },
  {
    q: "What happens after my free period?",
    a: "You'll be able to choose whether you want to continue advertising. There is no lock-in contract.",
  },
  {
    q: "Do I need to offer a discount?",
    a: "MegaDeal is designed around genuine deals and offers. Your offer can be a discount, free extra, package, upgrade or another genuine customer benefit.",
  },
  {
    q: "When will MegaDeal launch?",
    a: "MegaDeal is launching in Auckland first. Founding businesses can join before launch and prepare their listings and deals in advance.",
  },
  {
    q: "How much will advertising cost after the free period?",
    a: "After your free period, MegaDeal is paid in simple advertising credits or a monthly subscription — never a percentage of your sales. Exact pricing is confirmed in your business portal before you're asked to pay anything, and you can cancel or pause at any time.",
  },
  {
    q: "Do customers pay MegaDeal?",
    a: "No. Customers deal directly with your business.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. There is no lock-in contract.",
  },
  {
    q: "Do I need a physical storefront?",
    a: "MegaDeal works best for local businesses with some spare capacity to fill — an off-peak dinner slot, a treatment room between appointments, seats on a tour that isn't full. We don't currently accept pure online/e-commerce stores or adult entertainment businesses.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Join",
    text: "Create your business account in minutes.",
  },
  {
    number: "2",
    title: "Create your deal",
    text: "Choose your offer, price, photo and terms.",
  },
  {
    number: "3",
    title: "Get discovered",
    text: "Customers find your business and contact or book with you directly.",
  },
];

// The live signup counter only starts appearing once there's a credible
// number of approved businesses — a count of 1 undercuts the trust it's
// meant to build more than showing nothing at all. This is a threshold,
// not a manual switch: it flips itself on automatically as real approvals
// cross it, no code change needed.
const MIN_APPROVED_BUSINESSES_TO_SHOW_STATS = 33;

function SectionCta({ section }: { section: string }) {
  return (
    <div className="mt-8 flex justify-center">
      <a
        href="#signup"
        data-cta-section={section}
        className="rounded-full bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95"
      >
        {CTA_LABEL}
      </a>
    </div>
  );
}

export default async function MerchantsPage() {
  const rawStats = await getSignupStats();
  const stats =
    rawStats && rawStats.merchantCount >= MIN_APPROVED_BUSINESSES_TO_SHOW_STATS ? rawStats : null;

  return (
    <main className={plusJakartaSans.className}>
      <StickyApplyBar />
      <ConversionTracker />
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
            url: `${SITE_URL}/list-your-business`,
          }),
        }}
      />

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-ember-500 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white shadow-card sm:text-base">
            🚀 Launching in Auckland — founding businesses now open
          </span>

          <h1 className={`${fredoka.className} mt-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl`}>
            Get your business in front of Auckland customers — for free.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            MegaDeal is launching in Auckland, and we&apos;re inviting our
            first group of local businesses to join. Get up to 3 months
            of advertising free, pay 0% commission on your sales, and
            reach customers looking for great local deals.
          </p>

          <div className="mt-8 flex justify-center">
            <a
              href="#signup"
              data-cta-section="hero"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-brand-700 shadow-card transition active:scale-95 hover:bg-brand-50"
            >
              {CTA_LABEL}
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-brand-50">
            <span>✓ Up to 3 months free</span>
            <span>✓ 0% commission</span>
            <span>✓ No lock-in</span>
            <span>✓ No credit card required</span>
          </div>
        </div>
      </section>

      {/* Why join now — the offer, right after the hero, before anything
          else asks for attention. */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Why join MegaDeal before launch?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            We&apos;re giving our first Auckland businesses a better deal
            because we want great local businesses on MegaDeal from day
            one.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 text-left sm:grid-cols-2">
            {WHY_JOIN_NOW.map((p) => (
              <div key={p.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl text-brand-700">
                  {typeof p.icon === "string" ? p.icon : <p.icon className="h-5 w-5" />}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
          <SectionCta section="why_join_now" />
        </div>
      </section>

      {/* Economics example — makes "0% commission" concrete instead of
          abstract, right before the signup form asks for the ask. */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            No commission eating into your sale.
          </h2>
          <div className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">
                Customer spends
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-4xl">$100</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">
                MegaDeal commission
              </p>
              <p className="mt-2 text-2xl font-extrabold text-brand-600 sm:text-4xl">$0</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">
                Your business
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-4xl">$100</p>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">
            MegaDeal is an advertising platform. We don&apos;t take a
            percentage of your sales.
          </p>
        </div>
      </section>

      {/* Signup — moved up so a ready visitor doesn't have to scroll
          through the whole page to apply. */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              Claim your free advertising
            </h2>
            <p className="mt-2 text-slate-600">
              Join the founding businesses launching with MegaDeal in
              Auckland.
            </p>
          </div>
          <div className="mt-8">
            <Suspense fallback={null}>
              <MerchantSignupForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Fit — for anyone who scrolled past the form to see if this is
          really built for them first. */}
      <section className="bg-brand-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Got empty tables, unused appointments or spare capacity?
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Turn empty capacity into paying customers. A quiet Tuesday
            night. An empty treatment room. A gym class with spare
            places. A tour with seats still available. A hotel room
            that would otherwise sit empty. MegaDeal gives you a simple
            way to turn that spare capacity into a reason for customers
            to choose you.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_TYPES.map((t) => (
              <div key={t.label} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                  {t.emoji}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{t.label}</p>
                  <p className="text-sm text-slate-500">{t.hook}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            What does my business actually get?
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 text-left sm:grid-cols-2">
            {WHAT_YOU_GET.map((p) => (
              <div key={p.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                  {p.emoji}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
          <SectionCta section="what_you_get" />
        </div>
      </section>

      {/* Preview mockup */}
      <section id="preview" className="scroll-mt-[140px] bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-600">
              A quick preview
            </span>
            <h2 className={`${fredoka.className} mt-2 text-2xl font-bold text-slate-900 sm:text-3xl`}>
              Here&apos;s what customers will see
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-500">
              Your business gets more than just a name on a directory.
              Customers can see your deal, photos, location, business
              information and booking/contact options — all in one
              place.
            </p>
          </div>

          <div className="mt-8">
            <SampleDealCard />
          </div>

          <p className="mx-auto mt-4 max-w-md text-center text-sm font-semibold text-brand-700">
            Imagine this with YOUR business here.
          </p>
          <SectionCta section="preview" />
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Built for local businesses with something to sell.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold text-slate-700">
            {WHO_ITS_FOR.join(" • ")}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            If you have spare capacity, a great offer, or want more
            local customers, MegaDeal is built for you.
          </p>
          <p className="mx-auto mt-4 max-w-md text-xs text-slate-500">
            We don&apos;t currently accept pure online/e-commerce stores
            or adult entertainment businesses.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
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
          <p className="mt-8 text-sm font-semibold text-slate-700">
            That&apos;s it. No complicated setup.
          </p>
        </div>
      </section>

      {/* Trust — honest about being new, framed as a reason to join now
          rather than a weakness to hide. */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Be part of MegaDeal from day one.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            MegaDeal is launching in Auckland, and we&apos;re
            deliberately starting with a small group of local
            businesses. Founding businesses get up to 3 months free
            advertising and the opportunity to help shape the platform
            before launch.
          </p>
          {stats && (stats.merchantCount > 0 || stats.waitlistCount > 0) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-2xl border border-brand-100 bg-brand-50 px-6 py-5">
              {stats.merchantCount > 0 && (
                <p className="text-base font-semibold text-brand-800">
                  🏪 <span className="font-extrabold">{stats.merchantCount.toLocaleString()}</span> Auckland businesses already signed up
                </p>
              )}
              {stats.waitlistCount > 0 && (
                <p className="text-base font-semibold text-brand-800">
                  📧 <span className="font-extrabold">{stats.waitlistCount.toLocaleString()}</span> locals waiting for launch day
                </p>
              )}
            </div>
          )}
          <p className="mx-auto mt-6 max-w-xl text-slate-600">
            We&apos;re not going to pretend we&apos;re already the
            biggest deal site in New Zealand. We&apos;re building it —
            and we&apos;d rather build it with local businesses than
            build it without them.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm italic text-slate-500">
            — Nick, Founder of MegaDeal
          </p>
        </div>
      </section>

      {/* Founding business offer — real urgency, no invented scarcity. */}
      <section className="bg-ember-500 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg font-extrabold text-white sm:text-xl">
            Founding business offer
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ember-50">
            The up-to-3-months-free offer is available to qualifying
            businesses joining during the launch period.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="#signup"
              data-cta-section="founding_offer"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-ember-600 shadow-card transition active:scale-95 hover:bg-ember-50"
            >
              {CTA_LABEL}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pt-16 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className={`${fredoka.className} text-center text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                data-faq-question={f.q}
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

      {/* Still not ready — a genuine last resort, kept secondary and
          ahead of the real closing CTA below rather than being the page's
          final beat. */}
      <section className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <p className="text-sm font-semibold text-slate-700">
            Still not ready to apply?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Leave your email and we&apos;ll let you know when we launch
            — no commitment.
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

      {/* Final CTA — the page's real ending. */}
      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-white sm:text-3xl`}>
            Ready to get more local customers?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-brand-50">
            Join the founding businesses on MegaDeal. Get up to 3 months
            free advertising.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-brand-100">
            0% commission. No lock-in. No credit card required.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href="#signup"
              data-cta-section="final_cta"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-brand-700 shadow-card transition active:scale-95 hover:bg-brand-50"
            >
              {CTA_LABEL}
            </a>
          </div>
          <p className="mt-6 text-sm text-brand-100">
            Questions?{" "}
            <Link href="/contact" className="font-semibold text-white underline hover:no-underline">
              Talk to Nick, Founder of MegaDeal.
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
