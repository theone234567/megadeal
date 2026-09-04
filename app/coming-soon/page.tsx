import type { Metadata } from "next";
import Link from "next/link";
import SocialLinks from "@/components/SocialLinks";
import EmailSignupForm from "@/components/EmailSignupForm";
import { SITE_URL, SITE_NAME, SITE_LAUNCHED } from "@/lib/siteConfig";

const TITLE = "MegaDeal is Coming Soon — NZ Local Deals & Free Business Advertising";
const DESCRIPTION =
  "MegaDeal is a proudly Kiwi-owned deals platform launching soon in New Zealand. Customers save up to 70% direct from local businesses; businesses advertise commission-free and keep every dollar. Sign up now for launch-week perks.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/coming-soon` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/coming-soon`,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const CUSTOMER_PERKS = [
  { emoji: "🍽️", text: "Half-price dinners, spa days and weekend adventures" },
  { emoji: "💸", text: "You pay the business direct. No middleman, no markup." },
  { emoji: "🆕", text: "Fresh deals added all the time — always something new to try" },
  { emoji: "🧡", text: "Every deal you grab supports a local Kiwi business" },
];

const BUSINESS_TYPES = [
  "🍽️ Restaurants & cafes",
  "💆 Spas & beauty",
  "🏋️ Gyms & fitness studios",
  "🧘 Yoga & pilates",
  "🚐 Tours & activities",
  "🏨 Getaways & stays",
];

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ember-500 px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-ember-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-100 sm:text-sm">
            Landing very soon
          </p>
          <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Up to 70% off restaurants, spas, activities &amp; getaways near you{" "}
            <span className="inline-block animate-[elephant-idle-ear_3.2s_ease-in-out_infinite]">
              😊
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            We&apos;re building the fun, fair way to discover real local deals — and
            help Kiwi businesses get in front of new customers without giving away a
            cut of every sale. Be first through the door.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-brand-100">
            🚀 Launching in Auckland first, with the rest of NZ following shortly after.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs font-semibold text-brand-50 sm:text-sm">
            <span>🎟️ No vouchers to buy</span>
            <span>📞 Deal with the business direct</span>
            <span>💸 Never a MegaDeal fee</span>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#merchants"
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-card transition active:scale-95 hover:bg-brand-50"
            >
              <span className="text-2xl">🚀</span> I run a business
            </a>
            <a
              href="#customers"
              className="flex items-center gap-2 rounded-full border-2 border-white/70 px-6 py-3 text-sm font-bold text-white transition active:scale-95 hover:bg-white/10"
            >
              <span className="text-2xl">🎉</span> I&apos;m after deals
            </a>
          </div>

          <div className="mt-10 flex justify-center">
            <SocialLinks variant="light" />
          </div>
        </div>
      </section>

      {/* Merchants */}
      <section id="merchants" className="scroll-mt-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wide text-ember-600">
              For businesses
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Advertise your business. Keep every dollar.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              MegaDeal isn&apos;t a marketplace that skims a cut of your sales —
              it&apos;s advertising, plain and simple. You put your offer in front
              of local customers, they pay you direct, and you keep 100% of it.
              That&apos;s the whole model.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {BUSINESS_TYPES.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="mx-auto mt-3 max-w-xl text-xs text-slate-500">
              We&apos;re not currently set up for pure online/product
              retailers (see{" "}
              <Link href="/megashop" className="underline hover:text-slate-700">
                MegaShop
              </Link>{" "}
              for that) or adult entertainment businesses.
            </p>
          </div>

          {/* Signup CTA */}
          <div className="mt-10 rounded-3xl bg-gradient-to-br from-ember-500 to-brand-600 p-8 text-white shadow-card sm:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-2xl font-extrabold">
                🎁 Founding businesses get up to 3 months free advertising
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-ember-50">
                Be one of the first businesses live on MegaDeal and get priority
                placement when we launch — use code{" "}
                <span className="rounded-full bg-white/20 px-2 py-0.5 tracking-wide">
                  MEGA3
                </span>{" "}
                at sign-up. Conditions apply.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/businesses"
                  className="rounded-full bg-white px-6 py-3 text-sm font-bold text-ember-600 shadow-card transition active:scale-95 hover:bg-ember-50"
                >
                  See how it works &amp; apply →
                </Link>
              </div>
              <div className="mx-auto mt-8 max-w-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-ember-100">
                  Not ready yet? Get notified at launch instead
                </p>
                <div className="relative mt-3">
                  <EmailSignupForm audience="merchant" buttonLabel="Notify me" accent="brand" />
                </div>
              </div>
              <div className="mt-8 border-t border-white/20 pt-6">
                <p className="text-sm text-ember-50">
                  Help us spread the word 📣 — the bigger our following, the
                  more eyes on your business from day one.
                </p>
                <div className="mt-3 flex justify-center">
                  <SocialLinks variant="light" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it'll work for customers */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-start gap-2 sm:items-center">
                <span className="text-lg leading-none">🔍</span>
                <p className="text-xs text-slate-600 sm:text-sm">
                  <span className="font-bold text-slate-800">1. Browse</span>{" "}
                  <span className="text-slate-500">— real local deals, up to 70% off</span>
                </p>
              </div>
              <div className="flex items-start gap-2 sm:items-center">
                <span className="text-lg leading-none">🎟️</span>
                <p className="text-xs text-slate-600 sm:text-sm">
                  <span className="font-bold text-slate-800">2. Get the code</span>{" "}
                  <span className="text-slate-500">— contact details + a code, no voucher to buy</span>
                </p>
              </div>
              <div className="flex items-start gap-2 sm:items-center">
                <span className="text-lg leading-none">📞</span>
                <p className="text-xs text-slate-600 sm:text-sm">
                  <span className="font-bold text-slate-800">3. Contact &amp; redeem</span>{" "}
                  <span className="text-slate-500">— quote the code, pay the business direct</span>
                </p>
              </div>
            </div>
            <Link
              href="/how-it-works"
              className="shrink-0 text-xs font-semibold text-brand-600 hover:underline sm:text-sm"
            >
              How it works →
            </Link>
          </div>
        </div>
      </section>

      {/* Customers */}
      <section id="customers" className="scroll-mt-8 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-brand-600">
              For deal-hunters
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Kiwi deals. No gimmicks.
            </h2>
            <p className="mt-3 text-slate-600">
              MegaDeal is where you&apos;ll find half-price nights out, weekend
              getaways and treat-yourself moments from businesses in your own
              backyard. We&apos;re just the messenger — you always pay the business
              direct, so every dollar goes where it should.
            </p>
            <ul className="mt-6 space-y-3">
              {CUSTOMER_PERKS.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-slate-700">
                  <span className="text-xl">{p.emoji}</span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-card">
            <h3 className="text-xl font-extrabold text-slate-900">
              Get first dibs when we launch
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Join the list and we&apos;ll email you the moment the doors open —
              plus a few launch-week surprises.
            </p>
            <div className="relative mt-5">
              <EmailSignupForm
                audience="customer"
                buttonLabel="Notify me"
                accent="brand"
              />
            </div>
            {SITE_LAUNCHED && (
              <p className="mt-8 text-sm font-semibold text-slate-500">
                Curious now? You can already{" "}
                <Link href="/" className="text-brand-600 underline hover:text-brand-700">
                  peek at the beta site
                </Link>
                .
              </p>
            )}

            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-sm text-slate-600">
                We&apos;d love your support 🧡 — give us a follow. More of us
                here means better, bigger deals for everyone.
              </p>
              <div className="mt-3 flex">
                <SocialLinks />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closer */}
      <section className="px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="flex justify-center gap-6 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-brand-600">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-brand-600">
            Privacy
          </Link>
          {SITE_LAUNCHED && (
            <Link href="/" className="hover:text-brand-600">
              Beta site
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
