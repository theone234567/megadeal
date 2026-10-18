import Link from "next/link";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import { ArrowRightIcon, CheckIcon } from "./icons";

/**
 * The prelaunch homepage's hero, one bold idea: the headline (the page's
 * only <h1>), one sentence, the business promise as three bold ticks
 * ("0% commission" in purple, the same display type as the headline),
 * then the business action. Kept short, so the example deals below show
 * on the first screen.
 *
 * The picture is three example deals as small, real-looking deal cards
 * (photo with the saving, then name, suburb and price; small copies of the
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
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#7C3AED] via-hp-purple to-[#4C1D95] text-white sm:rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#F0ABFC]/20 blur-3xl" />
        <div className="relative grid items-center gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:py-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10 lg:px-10">
          <div>
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
            <p className="mt-2.5 max-w-[38rem] text-[0.9375rem] leading-relaxed text-white/85 sm:text-base">
              Auckland&apos;s new local deals site. Businesses advertise free during prelaunch, then get up to{" "}
              {PRELAUNCH_PROMO.months} months free from launch.*{" "}
              {/* On a phone the conditions link sits here, saving a line
                  under the button. */}
              <Link href="/terms" prefetch={false} className="whitespace-nowrap text-sm text-white/75 underline underline-offset-2 hover:text-white sm:hidden">
                Conditions apply
              </Link>
            </p>
            {/* The same round white ticks as the business card's list. */}
            <ul className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 sm:gap-x-5">
              {["0% commission", "No lock-in", "No credit card"].map((t, i) => (
                <li
                  key={t}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap font-display text-[0.9375rem] font-bold sm:gap-2 sm:text-base ${
                    i === 0 ? "text-[#BAE6FD]" : "text-white"
                  }`}
                >
                  <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-hp-purple">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-5">
              <Link href="/list-your-business" className="inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-7 text-base font-bold text-hp-purple shadow-[0_8px_20px_rgba(33,26,53,0.25)] transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple">
                Claim my free advertising
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/terms"
                prefetch={false}
                className="hidden text-sm text-white/75 underline underline-offset-2 hover:text-white sm:inline"
              >
                *Conditions apply
              </Link>
            </div>
          </div>

          {/* The picture: three example deals as small deal cards, fanned
              out, and the mascot at the bottom right pointing at them; on a
              phone, a compact strip under the button. Decorative: the
              headline says what matters. */}
          <div
            aria-hidden="true"
            className="relative mx-auto -mt-1 h-[150px] w-full max-w-[420px] min-[400px]:h-[160px] sm:h-[250px] sm:max-w-[460px] lg:mt-0 lg:h-[225px] lg:max-w-none xl:h-[245px]"
          >
            {/* Stacked left to right, each card in front of the one before, so
                only a card's right edge is ever covered and every saving, name
                and price (all on the left) stays in view. */}
            <CollageCard photo="pizza" title="Pizza for two" place="Ponsonby" price="$49" was="$78" off="37% off" className="left-0 top-[12%] -rotate-[4deg]" />
            <CollageCard photo="massage" title="60 min massage" place="Takapuna" price="$69" was="$120" off="42% off" className="left-[28%] top-0 z-10" />
            <CollageCard photo="kayak" title="Sea kayak tour" place="Devonport" price="$59" was="$99" off="40% off" className="right-[3%] top-[16%] sm:right-0 z-20 rotate-[4deg] shadow-[0_22px_40px_-12px_rgba(33,26,53,0.4)]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/megadeal/mascot/megadeal-mascot-hero-240.webp"
              srcSet="/megadeal/mascot/megadeal-mascot-hero-240.webp 240w, /megadeal/mascot/megadeal-mascot-hero-380.webp 380w, /megadeal/mascot/megadeal-mascot-hero.webp 560w"
              sizes="(min-width: 1024px) 130px, 25vw"
              width={240}
              height={249}
              alt=""
              loading="eager"
              decoding="async"
              className="absolute -bottom-5 -right-4 z-30 w-[15%] max-w-[130px] sm:-bottom-6 sm:-right-8 sm:w-[18%] lg:-right-6 lg:w-[22%] select-none drop-shadow-[0_12px_20px_rgba(33,26,53,0.25)] sm:-right-6"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** One example deal in the picture, as a small deal card: photo with the
 *  saving, then the name, suburb and price. */
function CollageCard({
  photo,
  title,
  place,
  price,
  was,
  off,
  className,
}: {
  photo: "pizza" | "massage" | "kayak";
  title: string;
  place: string;
  price: string;
  was: string;
  off: string;
  className: string;
}) {
  return (
    <div className={`absolute w-[37%] overflow-hidden rounded-lg sm:w-[40%] bg-white shadow-[0_14px_30px_-10px_rgba(33,26,53,0.3)] ring-1 ring-black/5 sm:rounded-2xl ${className}`}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/megadeal/hero/collage-${photo}-480.webp`}
          srcSet={`/megadeal/hero/collage-${photo}-320.webp 320w, /megadeal/hero/collage-${photo}-480.webp 480w`}
          sizes="(min-width: 1024px) 190px, 40vw"
          width={480}
          height={360}
          alt=""
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
        />
        <span className="absolute left-1.5 top-1.5 rounded-md bg-white px-1.5 py-0.5 text-[0.625rem] font-bold text-hp-ink shadow-sm sm:left-2 sm:top-2 sm:text-xs">
          {off}
        </span>
      </div>
      <div className="px-2 pb-2 pt-1.5 sm:px-3 sm:pb-2.5 sm:pt-2">
        <p className="truncate font-display text-[0.6875rem] font-bold leading-snug text-hp-ink sm:text-sm lg:text-[0.8125rem] xl:text-sm">{title}</p>
        <p className="hidden truncate text-xs text-hp-muted sm:block">{place}</p>
        <p className="mt-0.5 leading-none sm:mt-1">
          <span className="font-display text-[0.8125rem] font-bold text-hp-purple sm:text-base">{price}</span>
          <span className="ml-1 text-[0.625rem] text-hp-muted line-through sm:text-xs">{was}</span>
        </p>
      </div>
    </div>
  );
}
