import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney, formatOfferEndDate } from "@/lib/format";
import { dealSavingPercent } from "@/lib/dealSaving";
import { keyRestrictions } from "@/lib/dealTerms";
import { CATEGORIES } from "@/lib/categories";
import { wixImageUrl } from "@/lib/wixImageUrl";
import CountdownBadge from "./CountdownBadge";
import DealCardAction from "./DealCardAction";
import { MapPinIcon, ZapIcon } from "./icons";

/**
 * One card for standard and Flash Deals: same structure and type scale,
 * with Flash adding a label and a live "Offer ends in" deadline.
 *
 * Deliberately not shown here, though the Deal type carries them:
 * - businessRating: typed in by an admin, not aggregated from customer
 *   reviews, so presenting it as a star rating would claim more than it is.
 * - quantityAvailable: set once when the deal is created and never
 *   decremented (nothing is bought through MegaDeal), so "Only 3 left"
 *   would be a fixed number dressed up as live scarcity.
 */
export default function DealCard({
  deal,
  distanceKm = null,
  /** Shown inside the merchant's own preview, where the deal has no page
   *  to open yet. Renders the identical card without the link, so it can't
   *  navigate to a slug that 404s — taking their unsaved form with it — and
   *  Next doesn't prefetch that route just because the card scrolled into
   *  view. */
  preview = false,
}: {
  deal: Deal;
  /** Distance from the viewer, in km — shown beside the locality when known. */
  distanceKm?: number | null;
  preview?: boolean;
}) {
  const soldOut = !deal.inStock;
  const savingPct = dealSavingPercent(deal.was, deal.now);
  const restrictions = keyRestrictions(deal.terms).slice(0, 3);
  const category = deal.categories[0];
  const categoryEmoji = CATEGORIES.find((c) => c.name === category)?.emoji ?? "🏷️";
  const distance =
    distanceKm === null
      ? null
      : distanceKm < 1
      ? `${Math.round(distanceKm * 1000)}m away`
      : `${distanceKm.toFixed(1)}km away`;
  const locality = [deal.businessCity, distance].filter(Boolean).join(" · ");

  const Wrapper = preview ? "div" : Link;
  const wrapperProps = preview ? {} : { href: `/deal/${deal.slug}` };

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={`group flex h-full flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
        preview ? "" : "hover:-translate-y-0.5 hover:shadow-card-hover"
      }`}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-brand-50 sm:aspect-[4/3]">
        {deal.image ? (
          <Image
            src={wixImageUrl(deal.image, 800, 600)}
            alt={deal.name}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className={`object-cover transition duration-300 group-hover:scale-[1.03] ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center text-5xl opacity-40">
            {categoryEmoji}
          </div>
        )}

        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-slate-900 shadow">
              Sold out
            </span>
          </div>
        ) : (
          <>
            {/* One badge only. A standard deal gets its saving (derived from
                the two prices below, so they can't disagree); a Flash Deal
                gets its Flash label instead — the struck-through price
                already shows the saving, and a second pink badge would
                compete with the deadline. */}
            {deal.isFlash ? (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-1 text-xs font-extrabold text-white shadow">
                <ZapIcon className="h-3.5 w-3.5" /> Flash Deal
              </span>
            ) : (
              savingPct !== null && (
                <span className="absolute left-3 top-3 rounded-full bg-ember-600 px-2.5 py-1 text-xs font-extrabold text-white shadow">
                  {savingPct}% off
                </span>
              )
            )}
            {deal.isFlash && deal.expiresAt && (
              <div className="absolute bottom-3 left-3">
                <CountdownBadge target={new Date(deal.expiresAt)} variant="offer" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-[18px]">
        {category && (
          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-brand-600">{category}</span>
        )}
        <h3 className="mt-1.5 line-clamp-2 text-[1.0625rem] font-extrabold leading-snug text-slate-900 group-hover:text-brand-700">
          {deal.name}
        </h3>
        {deal.businessName && (
          <p className="mt-1.5 line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-slate-600">
            {deal.businessName}
          </p>
        )}
        {locality && (
          <p className="mt-0.5 flex items-center gap-1 text-[0.8125rem] text-slate-500">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{locality}</span>
          </p>
        )}
        {restrictions.length > 0 && (
          <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{restrictions.join(" · ")}</p>
        )}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[1.75rem] font-extrabold leading-none tracking-tight text-brand-700">
              {formatMoney(deal.now, deal.currency, deal.formattedNow)}
            </span>
            {deal.was > deal.now && (
              <span className="text-sm font-medium text-slate-500 line-through">
                <span className="sr-only">Usual price </span>
                {formatMoney(deal.was, deal.currency, deal.formattedWas)}
              </span>
            )}
          </div>
          {/* Always "Offer ends", never "Valid until" or "Available until":
              this is the deadline to get the deal, not the dates it can be
              used on — those are in the conditions. Flash Deals include
              the time, since they end the same day. Present on every card
              with a deadline so prices line up across a row. */}
          {deal.expiresAt && (
            <p className="mt-1.5 text-xs text-slate-500">
              Offer ends {formatOfferEndDate(deal.expiresAt, deal.isFlash)}
            </p>
          )}
          <DealCardAction expiresAt={deal.expiresAt} isFlash={deal.isFlash} soldOut={soldOut} />
        </div>
      </div>
    </Wrapper>
  );
}
