import Link from "next/link";
import { ArrowRightIcon } from "./icons";
import { HERO_ACCENT, HERO_BUTTON, HERO_CARD, HERO_LIFT, HeroGlows, HeroTicks } from "./business/purpleHero";

/**
 * The homepage hero after launch: the same purple card as the prelaunch
 * home and the business pages (components/business/purpleHero.tsx; owner,
 * 29 Oct 2026), so the site looks the same on launch day.
 *
 * Kept short, so the real deals below start on the first screen. On a
 * computer: the headline, sentence, ticks and buttons on the left, and on
 * the right a photo of the Auckland skyline as a lifted card with the
 * mascot standing on its baseline beside it, a soft shadow under his
 * feet, his open hand held out to it. On a phone there's no photo (the
 * deals are the picture there): the text and buttons, with the mascot
 * standing at the card's lower right.
 *
 * No example deals here: real ones are right below, and made-up prices
 * next to them could be taken for real offers.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="mx-auto max-w-[1200px] px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <div className={`rounded-[22px] sm:rounded-3xl ${HERO_CARD}`}>
        <HeroGlows />
        <div className="relative grid items-center gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:px-10 lg:py-8">
          <div className="min-w-0">
            <h1
              id="hero-heading"
              className="font-display text-[1.875rem] font-bold leading-[1.04] tracking-[-0.01em] text-white min-[400px]:text-[2.125rem] sm:text-[2.5rem] xl:text-[2.875rem]"
            >
              {/* "Auckland" in the heading: what people search for (owner, 26 Oct 2026). */}
              Local deals in Auckland.{" "}
              <span className={`block ${HERO_ACCENT}`}>More to enjoy.</span>
            </h1>
            <p className="mt-2.5 max-w-[36rem] text-[0.9375rem] leading-relaxed text-white/85 sm:text-base">
              Discover standout offers from Auckland businesses. Contact or book directly with the business.
            </p>
            <HeroTicks items={["Free for shoppers", "Every business checked", "NZ-owned"]} className="mt-3.5" />
            <div className="mt-5 flex flex-col items-start gap-2.5 pr-[96px] min-[400px]:pr-[110px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:pr-[150px] lg:pr-0">
              <a href="#deals" className={HERO_BUTTON}>
                Browse deals
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <Link
                href="/list-your-business"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-white/80 px-6 text-base font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple"
              >
                List your business
              </Link>
            </div>
          </div>

          {/* The picture, from lg: the skyline as a lifted photo card, the
              mascot on its baseline. Decorative: the headline says what
              matters. */}
          <div aria-hidden="true" className="relative hidden h-[250px] lg:block xl:h-[270px]">
            <div className={`absolute bottom-3 left-0 top-0 w-[76%] overflow-hidden rounded-2xl bg-white/10 ${HERO_LIFT}`}>
              {/* Both sizes on offer, and the browser picks: the card is at
                  most ~400px wide, so most screens take the 640px copy. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/megadeal/hero/auckland-skyline-800.webp"
                srcSet="/megadeal/hero/auckland-skyline-640.webp 640w, /megadeal/hero/auckland-skyline-800.webp 800w, /megadeal/hero/auckland-skyline.webp 1600w"
                sizes="400px"
                alt=""
                width={800}
                height={351}
                fetchPriority="high"
                decoding="async"
                // Sky Tower is at the photo's horizontal centre.
                className="h-full w-full select-none object-cover object-[50%_40%] text-transparent"
              />
            </div>
            <div className="absolute bottom-0 right-[2%] h-4 w-[26%] rounded-[50%] bg-[#1e0b3d]/45 blur-md" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/megadeal/mascot/megadeal-mascot-hero-380.webp"
              srcSet="/megadeal/mascot/megadeal-mascot-hero-240.webp 240w, /megadeal/mascot/megadeal-mascot-hero-380.webp 380w, /megadeal/mascot/megadeal-mascot-hero.webp 560w"
              sizes="190px"
              alt=""
              width={560}
              height={580}
              loading="eager"
              fetchPriority="low"
              decoding="async"
              className="absolute bottom-1 right-0 w-[38%] max-w-[190px] select-none drop-shadow-[0_14px_22px_rgba(33,26,53,0.3)]"
            />
          </div>
        </div>

        {/* On a phone and tablet: the mascot at the card's lower right,
            standing on its edge, beside the buttons. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/megadeal/mascot/megadeal-mascot-hero-240.webp"
          srcSet="/megadeal/mascot/megadeal-mascot-hero-240.webp 240w, /megadeal/mascot/megadeal-mascot-hero-380.webp 380w"
          sizes="(min-width: 640px) 150px, 110px"
          alt=""
          aria-hidden="true"
          width={560}
          height={580}
          loading="eager"
          fetchPriority="low"
          decoding="async"
          className="pointer-events-none absolute bottom-0 right-2 w-[96px] select-none drop-shadow-[0_14px_22px_rgba(33,26,53,0.3)] min-[400px]:w-[110px] sm:right-4 sm:w-[150px] lg:hidden"
        />
      </div>
    </section>
  );
}
