import Link from "next/link";
import type { Deal } from "@/lib/types";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { DEMO_DEALS } from "@/lib/demoDeals";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import PrelaunchHero from "@/components/PrelaunchHero";
import SearchAwareHero from "@/components/SearchAwareHero";
import DealRail from "@/components/DealRail";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import HomeDeals from "./HomeDeals";

/**
 * The public homepage before launch (lib/siteConfig.ts PRELAUNCH_HOME), in
 * this order: the dark prelaunch bar, the hero, the example deals, then the
 * categories and filters for the real deals right above them, "How
 * MegaDeal works" with its FAQ, then the business card. The shoppers'
 * email sign-up is the footer's (#deal-alerts). The example deals are fixed data,
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
        <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <DealRail
            id="example-deals"
            title="Example deals"
            description="Examples showing how MegaDeal will look at launch. These are not live offers and cannot be redeemed."
            deals={[...testDeals, ...DEMO_DEALS]}
            variant="demo"
          />
        </div>
      </SearchAwareHero>
      <div className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
        <HomeDeals initialDeals={deals} initialSearch={initialSearch} prelaunch dealsLive={dealsLive} />
      </div>
      <HowItWorks />
      <LocalDealsIntro />
      <BusinessBand />
    </main>
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
          <h2 id="how-heading" className="font-display text-[1.5rem] font-bold leading-tight text-hp-ink lg:text-[1.75rem]">
            How MegaDeal works
          </h2>
          <p className="mt-1 text-sm text-hp-muted sm:text-[0.9375rem]">No vouchers, no fees for customers.</p>
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
          <h2 className="font-display text-lg font-bold text-hp-ink">Questions</h2>
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
 * What MegaDeal is, in plain words a search engine or an AI tool can quote:
 * the city, the kinds of deal, the places, how it works and that it's free.
 * Before this the page said little a shopper would search for (SEO audit
 * of 19 Oct 2026).
 */
function LocalDealsIntro() {
  return (
    <section aria-labelledby="local-deals-heading" className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
      <div className="max-w-3xl">
        <h2 id="local-deals-heading" className="font-display text-[1.5rem] font-bold leading-tight text-hp-ink lg:text-[1.75rem]">
          Local deals across Auckland
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-hp-muted sm:text-[0.9375rem]">
          <p>
            MegaDeal is a new deals site for Auckland, made for finding good-value offers from local businesses near you:
            restaurant and café deals, spa and beauty treatments, things to do, getaways, fitness classes, and home and car
            services. From the CBD and Ponsonby to Takapuna, Newmarket, Mt Eden, Parnell, Devonport, Henderson, Botany and
            Manukau.
          </p>
          <p>
            It&apos;s free for shoppers and there are no vouchers to buy. Pick a deal, get its code, then book or visit the
            business and quote the code. You pay the business at the deal price, so your money goes straight to them. Flash
            Deals run for a few hours and Everyday Deals for up to a month, and Near me shows what&apos;s close by.{" "}
            <Link href="/how-it-works" className="font-semibold text-hp-purple underline-offset-2 hover:underline">
              How MegaDeal works
            </Link>
          </p>
          <p>
            We&apos;re building our launch line-up now. Run a local business?{" "}
            <Link href="/list-your-business" className="font-semibold text-hp-purple underline-offset-2 hover:underline">
              List your deals free during prelaunch
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * The business offer, once, after the deals: a contained purple card (the
 * hero's rounded, soft-glow look, not a flat full-width slab). Left: a
 * two-line headline, the offer as a short tick list, one action (signing
 * in is in the header). Right,
 * on a computer: a sample listing ("Your deal here") with the mascot
 * pointing at it, so a business can picture its own deal. A real <h2> and <ul> in plain words
 * ("Auckland businesses", "advertise free", "0% commission") for search
 * engines and AI tools.
 */
function BusinessBand() {
  const points = [
    { lead: "Free now:", text: "run 1 Everyday Deal and 1 Flash Deal at a time, no credits used." },
    { lead: `Up to ${PRELAUNCH_PROMO.months} months free`, text: `from launch: ${PRELAUNCH_PROMO.credits} credits once you're approved.*` },
    { lead: "0% commission:", text: "customers contact you and pay you directly." },
  ];
  return (
    <section aria-labelledby="business-band-heading" className="mx-auto max-w-[1200px] px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#7C3AED] via-hp-purple to-[#4C1D95] px-5 py-7 text-white sm:rounded-3xl sm:px-8 sm:py-8 lg:px-10 lg:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#F0ABFC]/20 blur-3xl" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <div>
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white">
              For Auckland businesses
            </p>
            <h2 id="business-band-heading" className="mt-3 font-display text-[1.625rem] font-bold leading-[1.1] lg:text-[2rem]">
              <span className="block">Advertise free.</span>{" "}
              <span className="block text-[#BAE6FD]">Be there on launch day.</span>
            </h2>
            <ul className="mt-4 space-y-2">
              {points.map((p) => (
                <li key={p.lead} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-white/90">
                  <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-hp-purple">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <strong className="font-bold text-white">{p.lead}</strong> {p.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link
                href="/list-your-business"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[0.9375rem] font-bold text-hp-purple shadow-[0_8px_20px_rgba(33,26,53,0.25)] transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple sm:w-auto"
              >
                Claim my free advertising
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/75">
              No credit card · No lock-in ·{" "}
              <Link href="/terms" prefetch={false} className="underline underline-offset-2 hover:text-white">
                *Conditions apply. Offers may change at any time.
              </Link>
            </p>
          </div>

          {/* A sample listing, not a real deal: decorative only. The mascot
              stands to its right, his open hand pointing at it. */}
          <div aria-hidden="true" className="hidden items-end lg:flex">
            <div className="w-[220px] shrink-0 rotate-[3deg] overflow-hidden rounded-2xl border-[5px] border-white bg-white text-hp-ink shadow-[0_18px_40px_rgba(20,10,50,0.35)]">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/megadeal/hero/collage-pizza-480.webp"
                  srcSet="/megadeal/hero/collage-pizza-320.webp 320w, /megadeal/hero/collage-pizza-480.webp 480w"
                  sizes="220px"
                  width={480}
                  height={360}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-md bg-[#BAE6FD] px-2 py-0.5 text-[0.6875rem] font-extrabold uppercase tracking-wide text-hp-ink">
                  Your deal here
                </span>
              </div>
              <div className="px-3 pb-3 pt-2.5">
                <span className="rounded bg-hp-lavender px-1.5 py-0.5 text-[0.6875rem] font-semibold text-hp-purple">Everyday</span>
                <p className="mt-1.5 font-display text-[0.9375rem] font-bold leading-snug">Your offer, on launch day</p>
                <p className="mt-0.5 text-xs text-hp-muted">Your suburb · Your business</p>
                <p className="mt-1.5 leading-none">
                  <span className="font-display text-lg font-bold text-hp-purple">$49</span>
                  <span className="ml-1.5 text-xs text-hp-muted line-through">$78</span>
                  <span className="ml-1.5 text-xs font-bold text-hp-ink">37% off</span>
                </p>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/megadeal/mascot/megadeal-mascot-hero-240.webp"
              srcSet="/megadeal/mascot/megadeal-mascot-hero-240.webp 240w, /megadeal/mascot/megadeal-mascot-hero-380.webp 380w"
              sizes="100px"
              width={240}
              height={249}
              alt=""
              loading="lazy"
              decoding="async"
              className="relative z-10 -mb-4 -ml-2 w-[100px] shrink-0 drop-shadow-[0_10px_18px_rgba(20,10,50,0.35)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
