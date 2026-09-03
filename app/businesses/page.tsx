import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SampleDealCard from "@/components/SampleDealCard";
import MerchantSignupForm from "./MerchantSignupForm";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "List Your Deal — Advertise Your NZ Business",
  description:
    "Reach thousands of local customers with a deal on MegaDeal. No lock-in contracts, zero commission, and a limited-time free advertising offer for new businesses.",
  alternates: { canonical: `${SITE_URL}/businesses` },
};

const PERKS = [
  {
    emoji: "🤝",
    title: "Zero commission, ever",
    text: "Every dollar a customer pays goes straight to you. MegaDeal never touches the payment.",
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
    text: "Pause, update or retire your deal whenever suits your business — no minimum term.",
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
    text: "Your deal goes live to thousands of locals. They redeem it by booking or visiting you — you keep every dollar.",
  },
];

export default function MerchantsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ember-500 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-ember-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Get your business in front of thousands of local customers
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            MegaDeal is advertising, not a marketplace — zero commission,
            ever. You set the offer, we bring the customers, and you get
            paid in full, direct.
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
            <span>🤝 0% commission</span>
            <span>🔓 No lock-in</span>
            <span>⚡ Live in days</span>
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
              Limited-time offer for new businesses that sign up now.{" "}
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
      <section id="preview" className="scroll-mt-36 px-4 py-16 sm:px-6 lg:px-8">
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

          <p className="mx-auto mt-4 max-w-md text-center text-xs text-slate-400">
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
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            Who it&apos;s a good fit for
          </h2>
          <p className="mt-2 text-slate-600">
            MegaDeal works best for businesses with some spare capacity to
            fill — an off-peak dinner slot, a treatment room between
            appointments, seats on a tour that isn&apos;t full. If that
            sounds like you, we&apos;d love to hear from you.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            New businesses can get up to 3 months free advertising — ask when
            you apply.{" "}
            <span className="text-slate-400">Conditions apply.</span>
          </p>
        </div>
      </section>

      {/* Signup */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Suspense fallback={null}>
            <MerchantSignupForm />
          </Suspense>
          <p className="mt-4 text-center text-xs text-slate-400">
            Already applied?{" "}
            <Link href="/portal" className="font-semibold text-brand-600 hover:underline">
              Sign in to your business portal
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
