import Link from "next/link";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import { ArrowRightIcon, CheckIcon } from "./icons";

/**
 * The prelaunch homepage's hero, one bold idea: the headline (the page's
 * only <h1>), one sentence for shoppers, three bold ticks that hold for
 * every deal, then two actions: deals by email for shoppers first, the
 * free advertising offer second, with its conditions in one line. Kept
 * short, so the example deals below show on the first screen.
 *
 * The picture is three example deals as small, real-looking deal cards
 * (photo with the saving, then name and price; small copies of the
 * site's own photos in public/megadeal/hero/collage-*), fanned out, and the
 * current mascot at the bottom right, his open hand pointing at them. The
 * mascot is the approved file (public/megadeal/mascot/megadeal-mascot-hero*.webp)
 * at its own proportions: only its width is set.
 *
 * A purple card, the same look as the business card lower down: white
 * headline with its second line in light blue, white ticks and a white
 * button. On a computer the text takes the left side and the deals the
 * right. On a phone the text and button come first, then the deals as a
 * compact strip.
 */
export default function PrelaunchHero() {
  return (
    <section aria-labelledby="hero-heading" className="mx-auto max-w-[1200px] px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      {/* isolate: everything in the card stays on the card's own layer, so
          the mascot (z-30 inside it) can never be drawn over the sticky
          header (also z-30) as the page scrolls under it. */}
      <div className="relative isolate overflow-hidden rounded-[22px] bg-gradient-to-br from-[#7C3AED] via-hp-purple to-[#4C1D95] text-white sm:rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#F0ABFC]/20 blur-3xl" />
        {/* Three parts: the headline and sentence, the picture, then the
            ticks and buttons. On a phone they stack in that order, so the
            example deals show on the first screen; from lg the text is one
            column on the left and the picture spans both rows on the right. */}
        <div className="relative grid items-center gap-5 px-5 py-6 sm:gap-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-x-10 lg:gap-y-0 lg:px-10 lg:py-7">
          <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
            <p className="mb-2.5 hidden rounded-full sm:inline-flex bg-white/15 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white">
              Launching in Auckland
            </p>
            <h1
              id="hero-heading"
              className="font-display text-[1.875rem] font-bold leading-[1.04] tracking-[-0.01em] text-white min-[400px]:text-[2.125rem] sm:text-[2.5rem] xl:text-[2.875rem]"
            >
              {/* Two clean lines wherever they fit: never a colour change mid-line. */}
              <span className="sm:block">Big local deals are</span>{" "}
              <span className="block text-[#BAE6FD]">coming to Auckland.</span>
            </h1>
            {/* Shoppers first (owner, 27 Oct 2026): what MegaDeal is and why
                it's different, then the business offer as the second
                button, its conditions in one place. */}
            <p className="mt-2.5 max-w-[38rem] text-[0.9375rem] leading-relaxed text-white/85 sm:text-base">
              Free deal codes from Auckland restaurants, spas, activities and more. No vouchers to buy: you pay the business
              directly.
            </p>
          </div>

          {/* The picture: the mascot presenting three example deals; on a
              phone, a compact strip under the sentence. Decorative: the
              headline says what matters.

              Everything stands on one baseline, like things set out on a
              table (owner, 27 Oct 2026: the mascot looked like it was
              floating, and the deals' arrangement odd): the deals as a
              hand of cards, the two outer ones tilted outward with their
              bottoms on the baseline and the middle one raised in front, so
              every name and price shows below it; the mascot on the same
              baseline at the right, a soft shadow under his feet, his open
              hand held out to the cards. */}
          <div
            aria-hidden="true"
            className="relative mx-auto h-[175px] w-full max-w-[420px] min-[400px]:h-[185px] sm:h-[265px] sm:max-w-[460px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[235px] lg:max-w-none xl:h-[270px]"
          >
            <CollageCard photo="pizza" title="Pizza for two" price="$49" was="$78" off="37% off" className="bottom-[3%] left-0 origin-bottom-right -rotate-[6deg]" />
            <CollageCard photo="kayak" title="Sea kayak tour" price="$59" was="$99" off="40% off" offRight className="bottom-[3%] left-[44%] z-[5] origin-bottom-left rotate-[6deg] lg:left-[42%]" />
            <CollageCard photo="massage" title="60 min massage" price="$69" was="$120" off="42% off" className="left-[22%] top-0 z-10 shadow-[0_22px_40px_-12px_rgba(33,26,53,0.45)] lg:left-[21%]" />
            <div aria-hidden="true" className="absolute bottom-0 right-[5%] z-20 h-4 w-[24%] rounded-[50%] bg-[#1e0b3d]/45 blur-md lg:-right-[3%]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/megadeal/mascot/megadeal-mascot-hero-380.webp"
              srcSet="/megadeal/mascot/megadeal-mascot-hero-240.webp 240w, /megadeal/mascot/megadeal-mascot-hero-380.webp 380w, /megadeal/mascot/megadeal-mascot-hero.webp 560w"
              sizes="(min-width: 1024px) 200px, 34vw"
              width={560}
              height={580}
              alt="MegaDeal’s elephant mascot" aria-hidden="true"
              loading="eager"
              fetchPriority="low"
              decoding="async"
              className="absolute bottom-1 right-0 z-30 w-[34%] max-w-[200px] select-none drop-shadow-[0_14px_22px_rgba(33,26,53,0.3)] lg:-right-[8%] lg:w-[33%]"
            />
          </div>

          <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
            {/* Things that are true of every deal, as the same round white
                ticks as the business card's list, all one colour. */}
            <ul className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 sm:gap-x-5">
              {["Free for shoppers", "Every business checked", "NZ-owned"].map((t) => (
                <li
                  key={t}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap font-display text-[0.9375rem] font-bold text-white sm:gap-2 sm:text-base"
                >
                  <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-hp-purple">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {/* The email sign-up at the foot of every page (Footer.tsx). */}
              <a
                href="#deal-alerts"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-7 text-base font-bold text-hp-purple shadow-[0_8px_20px_rgba(33,26,53,0.25)] transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple"
              >
                Get launch deals by email
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <Link
                href="/list-your-business"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-white/80 px-6 text-base font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple"
              >
                Advertise your business free*
              </Link>
            </div>
            <p className="mt-3 text-sm text-white/80">
              *Free during prelaunch, then up to {PRELAUNCH_PROMO.months} months free from launch for eligible businesses.{" "}
              <Link href="/terms" prefetch={false} className="whitespace-nowrap text-white underline underline-offset-2 hover:text-white">
                Conditions apply
              </Link>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

/** One example deal in the picture, as a small deal card: photo with the
 *  saving, then the name and price. */
function CollageCard({
  photo,
  title,
  price,
  was,
  off,
  offRight = false,
  className,
}: {
  photo: "pizza" | "massage" | "kayak";
  title: string;
  price: string;
  was: string;
  off: string;
  /** The saving at the top right: for a card whose top left is behind another. */
  offRight?: boolean;
  className: string;
}) {
  return (
    <div className={`absolute w-[34%] overflow-hidden rounded-lg bg-white lg:w-[33%] shadow-[0_14px_30px_-10px_rgba(33,26,53,0.3)] ring-1 ring-black/5 sm:rounded-2xl ${className}`}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/megadeal/hero/collage-${photo}-480.webp`}
          srcSet={`/megadeal/hero/collage-${photo}-320.webp 320w, /megadeal/hero/collage-${photo}-480.webp 480w`}
          sizes="(min-width: 1024px) 190px, 40vw"
          width={480}
          height={360}
          alt={`Example deal photo: ${title}`} aria-hidden="true"
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
        />
        <span className={`absolute top-1.5 rounded-md bg-white px-1.5 py-0.5 text-[0.625rem] font-bold text-hp-ink shadow-sm sm:top-2 sm:text-xs ${offRight ? "right-1.5 sm:right-2" : "left-1.5 sm:left-2"}`}>
          {off}
        </span>
      </div>
      <div className="px-2 pb-2 pt-1.5 sm:px-3 sm:pb-2.5 sm:pt-2">
        <p className="truncate font-display text-[0.6875rem] font-bold leading-snug text-hp-ink sm:text-sm lg:text-[0.75rem] xl:text-[0.8125rem]">{title}</p>
        <p className="mt-0.5 leading-none sm:mt-1">
          <span className="font-display text-[0.8125rem] font-bold text-hp-purple sm:text-base">{price}</span>
          <span className="ml-1 text-[0.625rem] text-hp-muted line-through sm:text-xs">{was}</span>
        </p>
      </div>
    </div>
  );
}
