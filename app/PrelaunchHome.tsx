import Link from "next/link";
import type { Deal } from "@/lib/types";
import { safeJsonLd } from "@/lib/safeJsonLd";
import EmailSignupForm from "@/components/EmailSignupForm";
import { DEMO_DEALS } from "@/lib/demoDeals";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import PrelaunchHero from "@/components/PrelaunchHero";
import SearchAwareHero from "@/components/SearchAwareHero";
import DealRail from "@/components/DealRail";
import { ArrowRightIcon, CalendarIcon, PercentIcon, ZapIcon } from "@/components/icons";
import HomeDeals from "./HomeDeals";

/**
 * The public homepage before launch (lib/siteConfig.ts PRELAUNCH_HOME), in
 * this order: the dark prelaunch bar, the hero, the example deals, the
 * shopper email sign-up, then the categories and filters for the real
 * deals right above them, "How MegaDeal works" with its FAQ, then the
 * business band (the footer's own email sign-up is left out here, as this
 * page has one higher up). The example deals are fixed data,
 * labelled EXAMPLE, each opening an example deal page; they're kept apart
 * from the real deals, so they're never searched, counted or listed as
 * offers anywhere. Search hides the hero and the example deals, as it
 * hides the hero after launch.
 */
export default function PrelaunchHome({
  deals,
  testDeals = [],
  initialSearch,
  dealsLive = false,
}: {
  deals: Deal[];
  /** Test businesses' live deals: shown first among the examples, so the
   *  owner can see how a real deal looks (lib/fetchDealServer.ts). */
  testDeals?: Deal[];
  initialSearch: string;
  /** Real deals are live before launch (lib/siteConfig.ts DEALS_OPEN). */
  dealsLive?: boolean;
}) {
  return (
    <main className="bg-hp-page">
      <SearchAwareHero initialSearch={initialSearch}>
        <PrelaunchHero />
        <div className="mx-auto max-w-[1200px] px-4 pt-7 sm:px-6 lg:px-8 lg:pt-9">
          <DealRail
            id="example-deals"
            title="Example deals"
            description="Examples showing how MegaDeal will look at launch. These are not live offers and cannot be redeemed."
            deals={[...testDeals, ...DEMO_DEALS]}
            variant="demo"
          />
          <DealAlerts />
        </div>
      </SearchAwareHero>
      <div className="mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <HomeDeals initialDeals={deals} initialSearch={initialSearch} prelaunch dealsLive={dealsLive} />
      </div>
      <HowItWorks />
      <BusinessBand />
    </main>
  );
}

/**
 * Shoppers' one action before launch, near the top: launch deals by email
 * (the hero's "Get launch deals by email" link lands here). The same
 * signup as the footer's, which is left out on this page.
 */
function DealAlerts() {
  return (
    <section
      id="deal-alerts"
      aria-labelledby="deal-alerts-heading"
      className="mt-6 flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-hp-line bg-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
    >
      <div className="lg:max-w-md">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-hp-purple">Shopping for deals?</p>
        <h2 id="deal-alerts-heading" className="mt-1 font-display text-xl font-bold leading-tight text-hp-ink sm:text-2xl">
          Get Auckland&apos;s launch deals by email
        </h2>
        <p className="mt-1.5 text-sm text-hp-muted">
          We&apos;ll email you when MegaDeal launches, then send the best new local deals.
        </p>
      </div>
      <div className="w-full lg:max-w-[500px]">
        <EmailSignupForm audience="customer" source="home" buttonLabel="Notify me" surface="plain" />
      </div>
    </section>
  );
}

/** "How MegaDeal works" for shoppers, and the questions people ask. Plain
 *  text answers, also given to search engines and AI tools as FAQPage
 *  data. Every answer restates what the site says elsewhere (/help,
 *  /how-it-works, the business page): no new promises. */
const FAQS = [
  {
    q: "How does MegaDeal work?",
    a: "Browse deals from local Auckland businesses, open one and copy its deal code. Then contact the business to book or visit, quote the code and pay them at the deal price. There's no voucher to buy and MegaDeal never charges customers.",
  },
  {
    q: "Is MegaDeal free to use?",
    a: "Yes. Browsing and using deals is free and needs no account. You pay the business directly, at the price shown on the deal.",
  },
  {
    q: "When does MegaDeal launch?",
    a: "MegaDeal is launching in Auckland first, and local businesses are adding their deals now. Leave your email and we'll let you know when MegaDeal launches.",
  },
  {
    q: "How can my business join?",
    a: `Sign up free on our business page. Before launch, advertising is free (1 Everyday Deal and 1 Flash Deal at a time), and eligible businesses get up to ${PRELAUNCH_PROMO.months} months free from launch. There's no commission: customers pay you directly. Conditions apply.`,
  },
  {
    q: "Is MegaDeal like Groupon?",
    a: "Not quite. Groupon closed its New Zealand business in 2020, and MegaDeal isn't connected with it. MegaDeal is a New Zealand-owned local deals site, and there's no voucher to buy: you get a free deal code, contact the business and pay them directly at the deal price.",
  },
];

const STEPS = [
  { title: "Find a deal", text: "Browse local deals from Auckland businesses. No account needed." },
  { title: "Get the code", text: "Open the deal and copy its code. It's free: there's no voucher to buy." },
  { title: "Contact the business", text: "Book or visit, quote the code and pay the business at the deal price." },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }),
        }}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div>
          <h2 id="how-heading" className="font-display text-[1.625rem] font-bold leading-tight text-hp-ink sm:text-[1.875rem]">
            How MegaDeal works
          </h2>
          <p className="mt-1.5 text-[0.9375rem] text-hp-muted">No vouchers, no fees for customers.</p>
          <ol className="mt-5 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hp-lavender font-display text-sm font-bold text-hp-purple"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-hp-ink">{s.title}</h3>
                  <p className="text-sm text-hp-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-hp-ink">Questions</h2>
          <div className="mt-3 divide-y divide-hp-line rounded-2xl border border-hp-line bg-white">
            {FAQS.map((f) => (
              <details key={f.q} name="home-faq" className="group px-4 sm:px-5">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[0.9375rem] font-semibold text-hp-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="shrink-0 text-lg leading-none text-hp-muted transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-hp-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The business offer, once, after the deals: a full-width purple band.
 * One row (heading left, action right), then the three things a business
 * gets as an icon list with one-line titles, then the conditions link.
 * A real <h2> and <ul> with plain words ("Auckland businesses",
 * "advertise free", "0% commission") so search engines and AI tools read
 * the offer, and descriptive link text.
 */
function BusinessBand() {
  const points = [
    {
      Icon: ZapIcon,
      title: "Free while we prelaunch",
      text: "Run 1 Everyday Deal and 1 Flash Deal at a time. No credits used before launch.",
    },
    {
      Icon: CalendarIcon,
      title: `Up to ${PRELAUNCH_PROMO.months} months free*`,
      text: `${PRELAUNCH_PROMO.credits} credits once approved, used from launch: an Everyday Deal uses 30, a Flash Deal 3.`,
    },
    {
      Icon: PercentIcon,
      title: "0% commission",
      text: "Customers contact you by phone, booking link or email, and pay you directly.",
    },
  ];
  return (
    <section aria-labelledby="business-band-heading" className="mt-10 bg-hp-purple text-white lg:mt-12">
      <div className="mx-auto max-w-[1200px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/85">For Auckland businesses · No credit card, no lock-in</p>
            <h2 id="business-band-heading" className="mt-1 font-display text-[1.5rem] font-bold leading-tight sm:text-[1.75rem] lg:text-[2rem]">
              {/* A sentence a line where it can't fit on one, never "Be / there". */}
              <span className="block xl:inline">Advertise free.</span> <span className="block xl:inline">Be there on launch day.</span>
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/list-your-business"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-6 text-[0.9375rem] font-bold text-hp-purple transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple"
            >
              Claim my free advertising
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/portal" prefetch={false} className="hidden text-sm font-semibold text-white/90 underline underline-offset-2 hover:text-white sm:inline">
              Business sign in
            </Link>
          </div>
        </div>

        <ul className="mt-5 grid gap-4 border-t border-white/20 pt-5 md:grid-cols-3 md:gap-6">
          {points.map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold leading-snug lg:text-[1.0625rem]">{title}</h3>
                <p className="mt-0.5 text-sm leading-snug text-white/85">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/75">
          {/* On a phone "Business sign in" sits here, not alone under the button. */}
          <Link href="/portal" prefetch={false} className="text-sm font-semibold text-white/90 underline underline-offset-2 hover:text-white sm:hidden">
            Business sign in
          </Link>
          <Link href="/terms" prefetch={false} className="underline underline-offset-2 hover:text-white">
            *Conditions apply. Offers may change at any time.
          </Link>
        </p>
      </div>
    </section>
  );
}
