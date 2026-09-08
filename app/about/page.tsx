import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { PercentIcon, ClockIcon, EyeIcon, CheckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "About MegaDeal",
  description:
    "MegaDeal is a New Zealand-owned advertising platform connecting Kiwis with real local businesses across food, beauty, activities, travel and fitness.",
  alternates: { canonical: `${SITE_URL}/about` },
};

const DIFFERENTIATORS = [
  {
    icon: PercentIcon,
    title: "Free for customers",
    text: "MegaDeal never takes payment from you — browsing and redeeming is always free.",
  },
  {
    icon: ClockIcon,
    title: "Redeem on your own schedule",
    text: "Grab a deal now, use it whenever suits within its validity window.",
  },
  {
    icon: EyeIcon,
    title: "Clear fine print",
    text: "Shown on every deal before you go — no surprises at the till.",
  },
  {
    icon: CheckIcon,
    title: "Every merchant is vetted",
    text: "Our team reviews a business before their first deal goes live.",
  },
];

export default function AboutPage() {
  return (
    <main className={plusJakartaSans.className}>
      {/* Hero */}
      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className={`${fredoka.className} text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl`}>
            About MegaDeal
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            Your local guide to restaurants, spas, activities and
            getaways worth leaving the house for.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4 text-slate-600">
          <p>
            MegaDeal connects you with the best local businesses at
            prices that make it easy to say yes. Every deal on the
            site is picked to be worth the trip — no filler, no
            fine-print traps, no subscriptions.
          </p>
          <p>
            We&apos;re free to browse and free to use — MegaDeal never
            charges customers anything. Merchants pay us to advertise,
            and every dollar you spend on a deal goes straight to the
            business, not to us.
          </p>
        </div>
      </section>

      {/* Mission + how we pick deals */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-10">
          <div>
            <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              Our mission
            </h2>
            <p className="mt-3 text-slate-600">
              Trying somewhere new shouldn&apos;t feel like a gamble.
              We want finding a massage, a dinner out, or a weekend
              away to be as easy as scrolling a feed — see the deal,
              contact the business, go enjoy it. Every listing on
              MegaDeal exists to make that first visit an easy
              decision, for you and for the business behind it.
            </p>
          </div>
          <div>
            <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              How we pick deals
            </h2>
            <p className="mt-3 text-slate-600">
              We work directly with local restaurants, spas, activity
              providers and travel operators to build offers that are
              genuinely worth featuring — real discounts off real
              prices, redeemable whenever you&apos;re ready. We
              don&apos;t inflate a &quot;was&quot; price just to make
              the &quot;now&quot; price look bigger, and we don&apos;t
              list a deal we wouldn&apos;t visit ourselves.
            </p>
          </div>
        </div>
      </section>

      {/* What makes us different */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            What makes us different
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <d.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{d.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{d.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where we operate */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Where we operate
          </h2>
          <p className="mt-3 text-slate-600">
            We&apos;re launching in Auckland first, with the rest of
            New Zealand following shortly after — Wellington,
            Christchurch and Queenstown are next on the list. If
            there&apos;s a business you love that you&apos;d like to
            see on MegaDeal, let their owner know — or point them to
            our{" "}
            <Link href="/list-your-business" className="font-semibold text-brand-600 hover:underline">
              business page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Get in touch */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${fredoka.className} text-xl font-bold text-slate-900 sm:text-2xl`}>
            Get in touch
          </p>
          <p className="mt-2 text-base text-slate-600">
            Questions, feedback, or just want to say hi? Visit our{" "}
            <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
              contact page
            </Link>{" "}
            — a real person reads every message.
          </p>
        </div>
      </section>
    </main>
  );
}
