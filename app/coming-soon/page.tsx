import type { Metadata } from "next";
import Link from "next/link";
import SocialLinks from "@/components/SocialLinks";
import EmailSignupForm from "@/components/EmailSignupForm";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "MegaDeal is coming soon — NZ's new home for local deals",
  description:
    "MegaDeal is a proudly Kiwi-owned deals platform launching soon. Customers browse and save, businesses advertise and keep every dollar — no commission, ever.",
  alternates: { canonical: `${SITE_URL}/coming-soon` },
};

const CUSTOMER_PERKS = [
  { emoji: "🍽️", text: "Half-price dinners, spa days and weekend adventures" },
  { emoji: "💸", text: "You pay the business direct. No middleman, no markup." },
  { emoji: "🆕", text: "Fresh deals added all the time — always something new to try" },
  { emoji: "🧡", text: "Every deal you grab supports a local Kiwi business" },
];

const MERCHANT_PERKS = [
  { emoji: "📣", text: "Pure advertising — we get you seen, that's it" },
  { emoji: "🤝", text: "Zero commission. What you charge is what you keep" },
  { emoji: "🇳🇿", text: "Proudly a Kiwi business" },
  { emoji: "⚡", text: "Quick to set up — pause, resume or update your deal anytime" },
  { emoji: "🔓", text: "No lock-in contracts. Advertise on your terms" },
];

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ember-500 px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-ember-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            The best local deals in Aotearoa,
            <br className="hidden sm:block" /> landing very soon.{" "}
            <span className="inline-block animate-[elephant-idle-ear_3.2s_ease-in-out_infinite]">
              😊
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            We&apos;re building the fun, fair way to discover unreal local deals — and
            help Kiwi businesses get in front of new customers without giving away a
            cut of every sale. Be first through the door.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-brand-100">
            🚀 Launching in Auckland first, with the rest of NZ following shortly after.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#customers"
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-card transition hover:bg-brand-50"
            >
              <span className="text-2xl">🎉</span> I&apos;m after deals
            </a>
            <a
              href="#merchants"
              className="flex items-center gap-2 rounded-full border-2 border-white/70 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <span className="text-2xl">🚀</span> I run a business
            </a>
          </div>

          <div className="mt-10 flex justify-center">
            <SocialLinks variant="light" />
          </div>
        </div>
      </section>

      {/* Customers */}
      <section id="customers" className="scroll-mt-8 px-4 py-16 sm:px-6 lg:px-8">
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

          <div className="rounded-3xl border border-slate-100 bg-brand-50 p-8 shadow-card">
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
            <p className="mt-8 text-sm font-semibold text-slate-500">
              Curious now? You can already{" "}
              <Link href="/" className="text-brand-600 underline hover:text-brand-700">
                peek at the beta site
              </Link>
              .
            </p>

            <div className="mt-6 border-t border-brand-100 pt-6">
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

      {/* Merchants */}
      <section
        id="merchants"
        className="scroll-mt-8 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div className="order-2 rounded-3xl bg-gradient-to-br from-ember-500 to-brand-600 p-8 text-white shadow-card lg:order-1">
            <h3 className="text-xl font-extrabold">Advertise, don&apos;t give away margin</h3>
            <p className="mt-2 text-sm text-ember-50">
              Tell us where to send launch details and merchant sign-up perks —
              early advertisers get priority placement when we go live.
            </p>
            <div className="relative mt-5">
              <EmailSignupForm
                audience="merchant"
                buttonLabel="Notify me"
                accent="brand"
              />
            </div>
            <Link
              href="/businesses"
              className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ember-600 shadow-card transition hover:bg-ember-50"
            >
              List your business now →
            </Link>
            <p className="mt-3 text-sm font-bold text-white">
              🎁 Sign up now for up to 6 months free advertising — use code{" "}
              <span className="rounded-full bg-white/20 px-2 py-0.5 tracking-wide">
                MEGA3
              </span>{" "}
              at sign-up
            </p>

            <div className="mt-6 border-t border-white/20 pt-6">
              <p className="text-sm text-ember-50">
                Help us spread the word 📣 — the bigger our following, the
                more eyes on your business from day one. Give us a follow!
              </p>
              <div className="mt-3 flex">
                <SocialLinks variant="light" />
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="text-xs font-bold uppercase tracking-wide text-ember-600">
              For businesses
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Advertise your business. Keep every dollar.
            </h2>
            <p className="mt-3 text-slate-600">
              MegaDeal isn&apos;t a marketplace that skims a cut of your sales —
              it&apos;s advertising, plain and simple. You put your offer in front
              of thousands of local customers, they pay you direct, and you keep
              100% of it. That&apos;s the whole model.
            </p>
            <ul className="mt-6 space-y-3">
              {MERCHANT_PERKS.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-slate-700">
                  <span className="text-xl">{p.emoji}</span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
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
          <Link href="/" className="hover:text-brand-600">
            Beta site
          </Link>
        </div>
      </section>
    </main>
  );
}
