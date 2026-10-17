import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { DEMO_DEALS } from "@/lib/demoDeals";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import PrelaunchBar from "@/components/PrelaunchBar";
import PrelaunchHero from "@/components/PrelaunchHero";
import SearchAwareHero from "@/components/SearchAwareHero";
import DealRail from "@/components/DealRail";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import HomeDeals from "./HomeDeals";

/**
 * The public homepage before launch (lib/siteConfig.ts PRELAUNCH_HOME), in
 * this order: the black prelaunch bar, the hero, the example deals, then the
 * categories and filters for the real deals right above them ("Launch
 * deals"), then the business strip. The example deals are fixed data,
 * labelled EXAMPLE, each opening an example deal page; they're kept apart
 * from the real deals, so they're never searched, counted or listed as
 * offers anywhere. Search hides the hero and the example deals, as it
 * hides the hero after launch.
 */
export default function PrelaunchHome({
  deals,
  initialSearch,
  dealsLive = false,
}: {
  deals: Deal[];
  initialSearch: string;
  /** Real deals are live before launch (lib/siteConfig.ts DEALS_OPEN). */
  dealsLive?: boolean;
}) {
  return (
    <main className="bg-hp-page pb-2">
      <PrelaunchBar />
      <SearchAwareHero initialSearch={initialSearch}>
        <PrelaunchHero />
        <div className="mx-auto max-w-[1200px] px-4 pt-7 sm:px-6 lg:px-8 lg:pt-9">
          <DealRail
            id="example-deals"
            title="Example deals"
            description="Examples showing how MegaDeal will look at launch. These are not live offers and cannot be redeemed."
            deals={DEMO_DEALS}
            variant="demo"
          />
        </div>
      </SearchAwareHero>
      <div className="mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <HomeDeals initialDeals={deals} initialSearch={initialSearch} prelaunch dealsLive={dealsLive} />
        <BusinessStrip />
      </div>
    </main>
  );
}

/** The fuller business offer, once, after the launch deals. */
function BusinessStrip() {
  const points = [
    "Advertise free now: 1 Everyday Deal + 1 Flash Deal at a time",
    "0% commission, no lock-in, no credit card",
    `${PRELAUNCH_PROMO.credits} free credits once approved: up to ${PRELAUNCH_PROMO.months} months of advertising from launch*`,
    "An Everyday Deal uses 30 credits, a Flash Deal 3",
  ];
  return (
    <aside
      aria-labelledby="business-strip-heading"
      className="mt-10 flex flex-col gap-5 rounded-2xl border border-hp-line bg-hp-lavender px-5 py-6 sm:px-7 md:flex-row md:items-center lg:mt-12 lg:gap-8 lg:px-8"
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <Image
          src="/megadeal/mascot/megadeal-mascot-hero.webp"
          alt=""
          width={560}
          height={580}
          sizes="96px"
          className="hidden h-auto w-[84px] shrink-0 select-none sm:block lg:w-[96px]"
        />
        <div className="min-w-0">
          <h2 id="business-strip-heading" className="font-display text-[1.375rem] font-bold leading-tight text-hp-ink lg:text-[1.625rem]">
            Own a local business?
          </h2>
          <p className="mt-1 text-[0.9375rem] text-hp-ink">
            Advertise free during prelaunch and be part of MegaDeal&apos;s Auckland launch.
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[0.9375rem] text-hp-ink sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-hp-purple" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1.5 md:items-center">
        <Link href="/list-your-business" className="btn-primary min-h-[48px] w-full px-6 text-base sm:w-auto">
          Claim my free advertising
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
        <p className="text-xs text-hp-muted">
          <Link href="/terms" prefetch={false} className="underline underline-offset-2 hover:text-hp-ink">
            *Conditions apply. Offers may change at any time.
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/portal" prefetch={false} className="underline underline-offset-2 hover:text-hp-ink">
            Business sign in
          </Link>
        </p>
      </div>
    </aside>
  );
}
