import Image from "next/image";
import { formatMoney } from "@/lib/format";

/**
 * Static, non-interactive mockup of what a real deal listing looks like —
 * used on both /list-your-business and /coming-soon to give a prospective merchant
 * something concrete to picture instead of just abstract copy. Not the
 * real DealCard component: this never links anywhere and its data is
 * entirely fixed, so it can't accidentally be mistaken for a live deal.
 *
 * The cost of that is drift, and it has already happened once: the real
 * card gained a city and a cash-saving chip while this one kept showing
 * the older layout. This is the card a business decides to sign up on the
 * strength of, so it being out of date is not a cosmetic problem — it is
 * showing them something other than what they'd get. Any change to
 * DealCard's body needs mirroring here until the two are merged.
 */
export default function SampleDealCard() {

  return (
    <div className="mx-auto max-w-xs">
      <div
        aria-hidden
        className="pointer-events-none relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card-hover"
      >
        <span className="absolute left-2 top-2 z-10 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Sample preview
        </span>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <Image
            src="/images/beauty-spa/beauty-massage.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover"
          />
          <div className="absolute left-2 top-9 flex flex-col gap-1">
            <span className="rounded-full bg-ember-600 px-2.5 py-1 text-xs font-extrabold text-white shadow">
              50% OFF
            </span>
          </div>
          <div className="absolute bottom-2 left-2">
            {/* A fixed label, not a live countdown: the countdown's
                placeholder, "Ends in 00h 00m", was in the page's text until
                the browser filled it in, and read like an expired deal or a
                bug to anything that read the page before then (reader view,
                link previews, search and AI crawlers). A sample needs no
                real deadline. Styled like the real badge with days left. */}
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
              ⏱ Ends in 3 days
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Beauty &amp; Spa
          </span>
          <h3 className="font-display line-clamp-2 text-[15px] font-bold leading-5 text-slate-900">
            60-Minute Hot Stone Massage
          </h3>
          <p className="-mt-1 truncate text-xs font-medium text-slate-500">
            by Mega Massages &middot; Auckland
          </p>

          <div className="mt-auto flex items-end justify-between pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-900">
                {formatMoney(49, "NZD", null)}
              </span>
              <span className="text-sm text-slate-500 line-through">
                {formatMoney(99, "NZD", null)}
              </span>
            </div>
            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-extrabold text-brand-700">
              Save {formatMoney(50, "NZD", null)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
