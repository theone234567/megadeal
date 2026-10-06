import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "./icons";

/**
 * The homepage hero, in three separate layers:
 *
 *  1. The lavender panel, with the headline, copy and buttons as real HTML.
 *  2. A real photo of the Auckland skyline (public/megadeal/hero/), in its
 *     own panel over the right ~54% of the hero, fading into the lavender
 *     at its left edge. object-fit: cover applies only inside that panel,
 *     so the photo keeps its proportions.
 *  3. The transparent elephant, on its own at the far right.
 *
 * On wider screens the grid has three columns: the text (48% of the hero),
 * an empty middle column where the photo shows — Sky Tower sits there, clear
 * of both — and the elephant. On phones the photo becomes a short band
 * across the top with the tower in the middle, the text runs full width
 * below it, and the elephant sits beside the buttons; nothing overlaps and
 * the text doesn't shrink.
 *
 * The earlier artwork (public/megadeal/hero-auckland-card.webp and
 * public/homepage/mobile-hero-artwork.webp, kept for rollback) had the old
 * elephant and hand-lettering baked in, so it isn't used.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] lg:rounded-3xl">
        {/* Layer 2: the skyline. Decorative — the headline says what matters. */}
        <div
          aria-hidden
          className="relative h-[104px] [mask-image:linear-gradient(to_bottom,black_60%,transparent)] min-[360px]:h-[116px] sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[54%] sm:[mask-image:linear-gradient(to_right,transparent,black_30%)]"
        >
          {/* Both sizes on offer, and the browser picks: on wider screens
              the band is 54% of a hero at most 1200px wide (~650px), so a
              standard screen takes the 800px copy (46KB) and only a
              high-density one the 1600px original (137KB). */}
          <picture>
            <img
              src="/megadeal/hero/auckland-skyline-800.webp"
              srcSet="/megadeal/hero/auckland-skyline-800.webp 800w, /megadeal/hero/auckland-skyline.webp 1600w"
              sizes="(min-width: 1200px) 650px, (min-width: 640px) 54vw, 100vw"
              alt=""
              width={800}
              height={351}
              fetchPriority="high"
              decoding="async"
              // Sky Tower is at the photo's horizontal centre. On phones it
              // stays centred in the band; on wider screens the photo is
              // anchored a little right of centre so the tower sits in the
              // gap between the text and the elephant.
              className="h-full w-full select-none object-cover object-[50%_4%] sm:object-[72%_38%]"
            />
          </picture>
        </div>

        {/* Layers 1 and 3: text, buttons and the elephant. */}
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 px-4 pt-3 [grid-template-areas:'text_text'_'cta_art'] min-[360px]:px-5 sm:grid-cols-[minmax(0,48%)_minmax(0,1fr)_auto] sm:gap-x-0 sm:px-8 sm:pt-6 sm:[grid-template-areas:'text_._art'_'cta_._art'] lg:px-12">
          <div className="self-end [grid-area:text] sm:self-auto sm:pt-1 lg:pt-4">
            <h1
              id="hero-heading"
              className="font-display text-[1.75rem] font-semibold leading-[1.1] text-hp-ink sm:text-[2.125rem] lg:text-[clamp(2.25rem,3vw,2.75rem)]"
            >
              Big local deals.{" "}
              <span className="block text-hp-purple">More to enjoy.</span>
            </h1>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-hp-ink sm:mt-3 sm:pr-4 sm:text-base">
              Discover standout offers from Auckland businesses. Contact or book directly with the business.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 self-center py-4 [grid-area:cta] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:self-start sm:pb-6 sm:pt-4 lg:pt-5">
            <a href="#deals" className="btn-primary whitespace-nowrap">
              Browse deals
              <ArrowRightIcon className="hidden h-4 w-4 min-[360px]:block" />
            </a>
            <Link
              href="/list-your-business"
              // A text link on phones (it sits beside the elephant, where two
              // full buttons don't fit); the outlined button from sm up.
              className="inline-flex min-h-[44px] items-center rounded-full px-1 text-[0.9375rem] font-semibold text-hp-purple underline underline-offset-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 sm:border-[1.5px] sm:border-hp-purple sm:bg-white sm:px-5 sm:no-underline sm:hover:bg-hp-lavender"
            >
              List your business
            </Link>
          </div>

          {/* Bottom-aligned so the feet sit on the panel's edge. */}
          <div className="self-end [grid-area:art]">
            <Image
              src="/megadeal/mascot/megadeal-mascot-hero.webp"
              alt=""
              width={560}
              height={580}
              priority
              sizes="(min-width: 1024px) 190px, (min-width: 640px) 150px, 118px"
              className="block h-auto w-[92px] select-none min-[360px]:w-[118px] sm:w-[150px] lg:w-[190px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
