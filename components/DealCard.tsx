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
import { MapPinIcon } from "./icons";

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
            // Empty: the title is already the link's text, so repeating it
            // as the photo's alt made screen readers announce it twice.
            alt=""
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
                gets its Flash label instead, with the saving as a small chip
                beside the price. */}
            {deal.isFlash ? (
              <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow">
                Flash Deal
              </span>
            ) : (
              savingPct !== null && (
                <span className="absolute left-3 top-3 rounded-full bg-ember-600 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow">
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

      <div className="flex flex-1 flex-col p-5">
        {category && (
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-brand-600">{category}</span>
        )}
        {/* No min-height: a one-line title must not reserve a blank second
            line above the business name. Cards still line up because the
            action is pushed to the bottom with mt-auto. */}
        <h3 className="mt-1.5 line-clamp-2 text-[1.1875rem] font-extrabold leading-[1.32] tracking-[-0.02em] text-slate-900 group-hover:text-brand-700">
          {deal.name}
        </h3>
        {deal.businessName && (
          <p className="mt-1 text-[0.8125rem] font-medium leading-snug text-slate-600">{deal.businessName}</p>
        )}
        {locality && (
          <p className="mt-[3px] flex items-center gap-1 text-[0.8125rem] text-slate-500">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{locality}</span>
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[1.9375rem] font-extrabold leading-none tracking-[-0.035em] text-brand-700">
            {formatMoney(deal.now, deal.currency, deal.formattedNow)}
          </span>
          {deal.was > deal.now && (
            <span className="text-sm font-medium text-slate-500 line-through">
              <span className="sr-only">Usual price </span>
              {formatMoney(deal.was, deal.currency, deal.formattedWas)}
            </span>
          )}
          {deal.isFlash && savingPct !== null && (
            <span className="self-center rounded-lg bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
              {savingPct}% off
            </span>
          )}
        </div>
        {/* Always "Offer ends", never "Valid until" or "Available until":
            this is the deadline to get the deal, not the dates it can be
            used on — those are in the conditions. Flash Deals include the
            time, since they end the same day. */}
        {deal.expiresAt && (
          <p className="mt-2 text-xs text-slate-500">Offer ends {formatOfferEndDate(deal.expiresAt, deal.isFlash)}</p>
        )}
        {restrictions.length > 0 && (
          <p className="mt-4 border-t border-slate-200/80 pt-3 text-xs leading-relaxed text-slate-500">
            {restrictions.join(" · ")}
          </p>
        )}

        <div className="mt-auto pt-4">
          <DealCardAction expiresAt={deal.expiresAt} isFlash={deal.isFlash} soldOut={soldOut} />
        </div>
      </div>
    </Wrapper>
  );
}
