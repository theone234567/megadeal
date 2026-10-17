import Link from "next/link";
import type { Deal } from "@/lib/types";
import { DEMO_DEALS } from "@/lib/demoDeals";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import PrelaunchHero from "@/components/PrelaunchHero";
import SearchAwareHero from "@/components/SearchAwareHero";
import DealRail from "@/components/DealRail";
import { ArrowRightIcon } from "@/components/icons";
import HomeDeals from "./HomeDeals";

/**
 * The public homepage before launch (lib/siteConfig.ts PRELAUNCH_HOME), in
 * this order: the dark prelaunch bar, the hero, the example deals, then the
 * categories and filters for the real deals right above them ("Launch
 * deals"), then the business strip. The example deals are fixed data,
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
        </div>
      </SearchAwareHero>
      <div className="mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <HomeDeals initialDeals={deals} initialSearch={initialSearch} prelaunch dealsLive={dealsLive} />
      </div>
      <BusinessBand />
    </main>
  );
}

/**
 * The fuller business offer, once, after the deals: a full-width purple
 * band with a big headline and the offer as ruled rows (the style of the
 * coming-soon page's "call to businesses").
 */
function BusinessBand() {
  const rows = [
    {
      title: "Free while we prelaunch",
      text: "Run 1 Everyday Deal and 1 Flash Deal at a time, free. No credits are used before launch.",
    },
    {
      title: `Up to ${PRELAUNCH_PROMO.months} months free advertising`,
      text: `${PRELAUNCH_PROMO.credits} credits once you're approved, used from launch: an Everyday Deal uses 30 credits, a Flash Deal 3.*`,
    },
    {
      title: "Customers contact you directly",
      text: "Phone, booking link or email. MegaDeal takes 0% commission and doesn't sit between you and your customer.",
    },
  ];
  return (
    <section aria-labelledby="business-band-heading" className="mt-10 bg-hp-purple text-white lg:mt-12">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/85">For Auckland businesses</p>
            <h2 id="business-band-heading" className="mt-1 text-balance font-display text-[1.625rem] font-bold leading-tight sm:text-[2rem]">
              Advertise free. Be there on launch day.
            </h2>
            <p className="mt-1.5 text-[0.9375rem] text-white/90">No credit card, no lock-in.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/list-your-business"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-6 text-[0.9375rem] font-bold text-hp-purple transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple"
            >
              Claim my free advertising
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/portal" prefetch={false} className="text-sm font-semibold text-white/90 underline underline-offset-2 hover:text-white">
              Business sign in
            </Link>
          </div>
        </div>

        <ol className="mt-6 grid gap-5 border-t border-white/25 pt-5 md:grid-cols-3 md:gap-8">
          {rows.map((r, i) => (
            <li key={r.title}>
              <p className="flex items-baseline gap-2.5">
                <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-white/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-lg font-bold leading-snug">{r.title}</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/90">{r.text}</p>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-xs text-white/80">
          <Link href="/terms" prefetch={false} className="underline underline-offset-2 hover:text-white">
            *Conditions apply. Offers may change at any time.
          </Link>
        </p>
      </div>
    </section>
  );
}
