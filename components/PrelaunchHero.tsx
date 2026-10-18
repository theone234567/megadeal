import Link from "next/link";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import { ArrowRightIcon } from "./icons";

/**
 * The prelaunch homepage's hero, one bold idea: the headline (the page's
 * only <h1>), one sentence, the business promise as one bold two-tone line
 * ("0% commission." in purple, the same display type as the headline),
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
 * On a computer the text takes the left side and the deals the right. On a
 * phone the text and button come first, then the deals at a compact
 * height. A flat background: no gradient or blurred shapes.
 */
export default function PrelaunchHero() {
  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden bg-[#F6F1FF]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 pb-10 pt-7 sm:px-6 sm:pt-9 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-12 xl:gap-16 lg:px-8 lg:pb-12 lg:pt-10">
        <div>
          <h1
            id="hero-heading"
            className="font-display text-[2.125rem] font-bold leading-[1.04] tracking-[-0.01em] text-hp-ink min-[400px]:text-[2.375rem] sm:text-[3rem] lg:text-[2.75rem] xl:text-[3.25rem]"
          >
            {/* Two clean lines wherever they fit: never a colour change mid-line. */}
            <span className="sm:block">Big local deals are</span>{" "}
            <span className="block text-hp-purple">coming to Auckland.</span>
          </h1>
          <p className="mt-3 max-w-[31rem] text-base leading-relaxed text-[#4B4560] sm:text-[1.0625rem]">
            Auckland&apos;s new local deals site is building its launch lineup. Businesses can advertise free now,
            with up to {PRELAUNCH_PROMO.months} months free from launch.*
          </p>
          <p className="mt-4 font-display text-lg font-bold leading-snug text-hp-ink sm:text-xl">
            {/* Wraps only between the phrases. */}
            <span className="whitespace-nowrap text-hp-purple">0% commission.</span>{" "}
            <span className="whitespace-nowrap">No lock-in.</span> <span className="whitespace-nowrap">No credit card.</span>
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link href="/list-your-business" className="btn-primary min-h-[52px] whitespace-nowrap px-7 text-base">
              Claim my free advertising
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/terms"
              prefetch={false}
              className="self-center text-sm text-hp-muted underline underline-offset-2 hover:text-hp-ink sm:self-auto"
            >
              *Conditions apply
            </Link>
          </div>
        </div>

        {/* The picture: three example deals as small deal cards, fanned out,
            and the mascot at the bottom right pointing at them. Decorative:
            the headline says what matters. */}
        <div aria-hidden="true" className="relative mx-auto h-[205px] w-full max-w-[520px] min-[400px]:h-[225px] sm:h-[290px] lg:h-[255px] lg:max-w-none xl:h-[285px]">
          {/* Stacked left to right, each card in front of the one before, so
              only a card's right edge is ever covered and every saving, name
              and price (all on the left) stays in view. */}
          <CollageCard photo="pizza" title="Pizza for two" place="Ponsonby" price="$49" was="$78" off="37% off" className="left-0 top-[12%] -rotate-[4deg]" />
          <CollageCard photo="massage" title="60 min massage" place="Takapuna" price="$69" was="$120" off="42% off" className="left-[26%] top-0 z-10" />
          <CollageCard photo="kayak" title="Sea kayak tour" place="Devonport" price="$59" was="$99" off="40% off" className="right-0 top-[16%] z-20 rotate-[4deg] shadow-[0_22px_40px_-12px_rgba(33,26,53,0.4)]" />
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
            className="absolute -bottom-6 -right-3 z-30 w-[22%] max-w-[130px] select-none drop-shadow-[0_12px_20px_rgba(33,26,53,0.25)] sm:-right-6"
          />
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
    <div className={`absolute w-[40%] overflow-hidden rounded-xl bg-white shadow-[0_14px_30px_-10px_rgba(33,26,53,0.3)] ring-1 ring-black/5 sm:rounded-2xl ${className}`}>
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
        <p className="truncate font-display text-[0.75rem] font-bold leading-snug text-hp-ink sm:text-sm">{title}</p>
        <p className="truncate text-[0.625rem] text-hp-muted sm:text-xs">{place}</p>
        <p className="mt-0.5 leading-none sm:mt-1">
          <span className="font-display text-sm font-bold text-hp-purple sm:text-base">{price}</span>
          <span className="ml-1 text-[0.625rem] text-hp-muted line-through sm:text-xs">{was}</span>
        </p>
      </div>
    </div>
  );
}
