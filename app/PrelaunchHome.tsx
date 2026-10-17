import Link from "next/link";
import type { Deal } from "@/lib/types";
import { DEMO_DEALS } from "@/lib/demoDeals";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import PrelaunchHero from "@/components/PrelaunchHero";
import SearchAwareHero from "@/components/SearchAwareHero";
import DealRail from "@/components/DealRail";
import { ArrowRightIcon, CalendarIcon, PercentIcon, ZapIcon } from "@/components/icons";
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
            <Link href="/portal" prefetch={false} className="text-sm font-semibold text-white/90 underline underline-offset-2 hover:text-white">
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

        <p className="mt-4 text-xs text-white/75">
          <Link href="/terms" prefetch={false} className="underline underline-offset-2 hover:text-white">
            *Conditions apply. Offers may change at any time.
          </Link>
        </p>
      </div>
    </section>
  );
}
