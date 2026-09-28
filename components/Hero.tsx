import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "./icons";

/**
 * The homepage hero: headline, one line of copy and two actions, with the
 * MegaDeal elephant to the right.
 *
 * The elephant is a transparent cutout in its own grid cell, never layered
 * over the text: on wider screens it's the right-hand column beside the
 * whole text block; on phones the headline and copy take the full width
 * and the elephant sits beside the buttons. The panel behind it is plain
 * CSS — the previous artwork (public/megadeal/hero-auckland-card.webp and
 * public/homepage/mobile-hero-artwork.webp, kept for rollback) had the old
 * elephant and hand-lettering baked in, so it can't sit behind the new one.
 *
 * "Business sign in" lives in the header, not here.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <div
        className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-4 pt-5 min-[360px]:px-5 [grid-template-areas:'text_text'_'cta_art'] sm:gap-x-6 sm:px-8 sm:pt-6 sm:[grid-template-areas:'text_art'_'cta_art'] lg:rounded-3xl lg:px-12"
      >
        <div className="self-end [grid-area:text] sm:self-auto sm:pt-1 lg:pt-4">
          <h1
            id="hero-heading"
            className="font-display text-[1.75rem] font-semibold leading-[1.1] text-hp-ink sm:text-[2.125rem] lg:text-[clamp(2.25rem,3vw,2.75rem)]"
          >
            Big local deals.{" "}
            <span className="block text-hp-purple">More to enjoy.</span>
          </h1>
          <p className="mt-2 max-w-[34rem] text-[0.9375rem] leading-relaxed text-hp-ink sm:mt-3 sm:text-base lg:max-w-[46rem]">
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

        {/* Decorative: the headline carries the message. Bottom-aligned so
            the feet sit on the panel's edge rather than floating. */}
        <div className="self-end [grid-area:art]">
          <Image
            src="/megadeal/mascot/megadeal-mascot-hero.webp"
            alt=""
            width={560}
            height={580}
            priority
            sizes="(min-width: 1024px) 200px, (min-width: 640px) 168px, 118px"
            className="block h-auto w-[92px] select-none min-[360px]:w-[118px] sm:w-[168px] lg:w-[200px]"
          />
        </div>
      </div>
    </section>
  );
}
