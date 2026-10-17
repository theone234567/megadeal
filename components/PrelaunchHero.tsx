import Image from "next/image";
import Link from "next/link";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import { ArrowRightIcon, ChevronDownIcon, CreditCardIcon, PercentIcon, UnlockIcon } from "./icons";

/**
 * The prelaunch homepage's hero: one message and one action. Eyebrow,
 * headline, a short paragraph, "Claim my free advertising", a link down
 * to the example deals and one trust line. The fuller offer is in the
 * business strip further down, not here.
 *
 * The picture is two separate layers: the Auckland skyline photo (no
 * mascot baked in) and the current mascot on top of it, toward the bottom
 * right, clear of Sky Tower and of the text. The mascot is the approved
 * file itself (public/megadeal/mascot/megadeal-mascot-hero.webp), drawn at
 * its own proportions: only its height is set, the width follows.
 *
 * On a computer the text takes the left half and the picture the right,
 * about 340px tall in all. On a phone the text and button come first and
 * a short band of the picture follows.
 */
export default function PrelaunchHero() {
  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden bg-gradient-to-br from-white via-hp-lavender to-[#ECE4FA]">
      <div className="mx-auto grid max-w-[1200px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch">
        <div className="px-4 pb-5 pt-5 sm:px-6 sm:pt-7 lg:py-7 lg:pl-8 lg:pr-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-hp-purple">Auckland first</p>
          <h1
            id="hero-heading"
            className="mt-2 text-balance font-display text-[1.875rem] font-bold leading-[1.08] text-hp-ink min-[400px]:text-[2.125rem] sm:text-[2.5rem] lg:text-[2.625rem] xl:text-[2.875rem]"
          >
            Big local deals are <span className="text-hp-purple">coming to Auckland.</span>
          </h1>
          <p className="mt-3 max-w-[34rem] text-[0.9375rem] leading-relaxed text-hp-ink sm:text-base">
            We&apos;re building MegaDeal&apos;s launch lineup now. Auckland businesses can advertise free during
            prelaunch and eligible businesses can receive up to {PRELAUNCH_PROMO.months} months free advertising from
            launch.*
          </p>
          <div className="mt-5 flex flex-col gap-2 lg:mt-4 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center min-[400px]:gap-3">
            <Link href="/list-your-business" className="btn-primary min-h-[48px] px-6 text-base">
              Claim my free advertising
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a
              href="#example-deals"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border-[1.5px] border-hp-purple/30 bg-white px-5 text-[0.9375rem] font-semibold text-hp-purple transition hover:border-hp-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
            >
              See example deals
              <ChevronDownIcon className="h-4 w-4" />
            </a>
          </div>
          <ul className="mt-4 flex flex-wrap lg:mt-3 items-center gap-x-4 gap-y-1.5 text-[0.8125rem] text-hp-muted sm:text-sm">
            <li className="inline-flex items-center gap-1.5">
              <PercentIcon className="h-4 w-4 text-hp-purple" />
              0% commission
            </li>
            <li className="inline-flex items-center gap-1.5">
              <UnlockIcon className="h-4 w-4 text-hp-purple" />
              No lock-in
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CreditCardIcon className="h-4 w-4 text-hp-purple" />
              No credit card
            </li>
            <li>
              <Link href="/terms" prefetch={false} className="underline underline-offset-2 hover:text-hp-ink">
                *Conditions apply, offers may change
              </Link>
            </li>
          </ul>
        </div>

        {/* The picture: decorative, the headline says what matters. */}
        <div
          aria-hidden="true"
          // Wider than the page column: on a wide screen the photo runs to
          // the screen's right edge instead of stopping at the column.
          className="relative h-[176px] min-[480px]:h-[220px] sm:h-[260px] lg:-mr-[max(0px,calc((100vw-1200px)/2))] lg:h-auto lg:min-h-[320px]"
        >
          <div className="absolute inset-0 lg:[mask-image:linear-gradient(to_right,transparent,black_22%)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/megadeal/hero/auckland-skyline-800.webp"
              srcSet="/megadeal/hero/auckland-skyline-640.webp 640w, /megadeal/hero/auckland-skyline-800.webp 800w, /megadeal/hero/auckland-skyline.webp 1600w"
              sizes="(min-width: 1200px) 600px, (min-width: 1024px) 50vw, 100vw"
              alt=""
              width={800}
              height={351}
              fetchPriority="high"
              decoding="async"
              // Sky Tower is the photo's centre: kept left of the mascot.
              className="h-full w-full select-none object-cover object-[78%_40%] lg:object-[80%_50%]"
            />
          </div>
          <Image
            src="/megadeal/mascot/megadeal-mascot-hero.webp"
            alt=""
            width={560}
            height={580}
            loading="eager"
            sizes="(min-width: 1024px) 290px, 170px"
            className="absolute bottom-0 right-3 h-[92%] w-auto select-none drop-shadow-[0_8px_16px_rgba(33,26,53,0.18)] sm:right-8 lg:right-[max(1.5rem,calc((100vw-1200px)/2+1.5rem))] lg:h-[min(86%,290px)]"
          />
        </div>
      </div>
    </section>
  );
}
