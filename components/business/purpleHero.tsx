import { CheckIcon } from "@/components/icons";

/**
 * The home page's purple hero card (components/PrelaunchHero.tsx), shared
 * by the business pages (/list-your-business and the /advertise pages), so
 * every page a business lands on looks like the same site (owner, 27 Oct
 * 2026): a purple gradient card with soft glows, white headline with its
 * second line in light blue, a white button and round white ticks.
 */

/** The card itself; its content goes in a `relative` element so it sits
 *  above the glows. isolate keeps everything in it (the mascot included)
 *  on the card's own layer, so nothing can be drawn over the sticky header
 *  as the page scrolls under it. */
export const HERO_CARD = "relative isolate overflow-hidden bg-gradient-to-br from-[#7C3AED] via-hp-purple to-[#4C1D95] text-white";

/** The headline's second line. */
export const HERO_ACCENT = "text-[#BAE6FD]";

/** The small label over the headline. */
export const HERO_EYEBROW = "inline-flex rounded-full bg-white/15 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white";

/** The main button: white on the purple. */
export const HERO_BUTTON =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-bold text-hp-purple shadow-[0_8px_20px_rgba(33,26,53,0.25)] transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple";

/** A photo or card on the purple: lifted with a deeper shadow. */
export const HERO_LIFT = "shadow-[0_22px_40px_-12px_rgba(33,26,53,0.45)]";

/** The two soft glows behind the content. */
export function HeroGlows() {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#F0ABFC]/20 blur-3xl" />
    </>
  );
}

/** Round white ticks, as in the home page hero. */
export function HeroTicks({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 sm:gap-x-5 ${className}`}>
      {items.map((t) => (
        <li key={t} className="inline-flex items-center gap-1.5 whitespace-nowrap font-display text-[0.9375rem] font-bold text-white sm:gap-2 sm:text-base">
          <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-hp-purple">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}
