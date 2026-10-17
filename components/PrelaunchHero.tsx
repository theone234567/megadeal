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
 * The picture is a bright collage of three example deals (small copies of
 * the site's own photos in public/megadeal/hero/collage-*) as tilted
 * cards with their saving and price, and the current mascot in front of
 * them, waving toward the headline. The mascot is the approved file itself
 * (public/megadeal/mascot/megadeal-mascot-hero.webp), at its own
 * proportions: only its width is set.
 *
 * On a computer the text takes the left half and the collage the right,
 * at a fixed height and centred beside the text, so the bottom card and
 * the mascot stay close to the top two however tall the text runs.
 * On a phone the text and buttons come first and the collage follows.
 */
export default function PrelaunchHero() {
  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden bg-gradient-to-br from-white via-hp-lavender to-[#ECE4FA]">
      <div className="mx-auto grid max-w-[1200px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
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

        {/* The picture: decorative, the headline says what matters. Three
            sunny example deals as tilted cards, and the mascot in front. */}
        <div aria-hidden="true" className="relative mx-4 h-[190px] min-[400px]:h-[215px] sm:mx-6 sm:h-[300px] lg:mx-0 lg:h-[350px] xl:h-[370px]">
          <div className="absolute right-[8%] top-[6%] h-[70%] w-[70%] rounded-full bg-[#FFE7B3] opacity-60 blur-3xl" />
          <div className="absolute bottom-[4%] left-[10%] h-[55%] w-[55%] rounded-full bg-[#D9C8FF] opacity-70 blur-3xl" />
          <CollageCard photo="pizza" price="$49" was="$78" off="37% off" priceLeft className="left-[16%] top-[5%] -rotate-[5deg]" />
          <CollageCard photo="massage" price="$69" was="$120" off="42% off" className="right-[1%] top-[11%] rotate-[4deg]" />
          <CollageCard photo="kayak" price="$59" was="$99" off="40% off" className="bottom-[5%] right-[19%] z-10 -rotate-[2deg]" />
          <Image
            src="/megadeal/mascot/megadeal-mascot-hero.webp"
            alt=""
            width={560}
            height={580}
            loading="eager"
            sizes="(min-width: 1024px) 180px, 30vw"
            className="absolute bottom-0 left-0 z-20 h-auto w-[25%] max-w-[180px] sm:w-[30%] select-none drop-shadow-[0_10px_18px_rgba(33,26,53,0.22)]"
          />
        </div>
      </div>
    </section>
  );
}

/** One example deal in the collage: a photo with its saving and price. */
function CollageCard({
  photo,
  price,
  was,
  off,
  priceLeft = false,
  className,
}: {
  photo: "pizza" | "massage" | "kayak";
  price: string;
  was: string;
  off: string;
  /** Put the price on the left, clear of a card overlapping the right. */
  priceLeft?: boolean;
  className: string;
}) {
  return (
    <div
      className={`absolute w-[38%] overflow-hidden rounded-xl border-4 sm:w-[42%] sm:rounded-2xl sm:border-[5px] border-white bg-white shadow-[0_14px_30px_rgba(33,26,53,0.2)] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/megadeal/hero/collage-${photo}-480.webp`}
        srcSet={`/megadeal/hero/collage-${photo}-320.webp 320w, /megadeal/hero/collage-${photo}-480.webp 480w`}
        sizes="(min-width: 1024px) 250px, 42vw"
        width={480}
        height={360}
        alt=""
        decoding="async"
        className="aspect-[4/3] w-full object-cover"
      />
      <span className="absolute left-2 top-2 rounded-md bg-white px-2 py-0.5 text-xs font-bold text-hp-ink shadow-sm">{off}</span>
      <span className={`absolute bottom-2 ${priceLeft ? "left-2" : "right-2"} rounded-lg bg-white px-2 py-1 leading-none shadow-sm`}>
        <span className="font-display text-base font-bold text-hp-purple sm:text-lg">{price}</span>
        <span className="ml-1 text-[0.6875rem] text-hp-muted line-through sm:text-xs">{was}</span>
      </span>
    </div>
  );
}
