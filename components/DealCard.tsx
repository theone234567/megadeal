import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import type { Deal } from "@/lib/types";
import { formatMoney, formatOfferEndDate } from "@/lib/format";
import { dealSavingPercent } from "@/lib/dealSaving";
import { keyRestrictions } from "@/lib/dealTerms";
import { CATEGORIES } from "@/lib/categories";
import { wixImageUrl } from "@/lib/wixImageUrl";
import CountdownBadge from "./CountdownBadge";
import {
  CompassIcon,
  DumbbellIcon,
  FlowerIcon,
  MapPinIcon,
  StoreIcon,
  SuitcaseIcon,
  TagIcon,
  UtensilsIcon,
  WrenchIcon,
  ZapIcon,
} from "./icons";

const PLACEHOLDER_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "food-drink": UtensilsIcon,
  "beauty-spa": FlowerIcon,
  "things-to-do": CompassIcon,
  "travel-getaways": SuitcaseIcon,
  "health-fitness": DumbbellIcon,
  "home-car": WrenchIcon,
};

/**
 * One card for Flash and Everyday Deals: photo, title, business, place and
 * price, with Flash adding its label and real time left. The whole card is
 * the link to the deal.
 *
 * Deliberately not shown, though the Deal type carries them:
 * - businessRating: typed in by an admin, not aggregated from customer
 *   reviews, so presenting it as a star rating would claim more than it is.
 * - quantityAvailable: set once when the deal is created and never
 *   decremented (nothing is bought through MegaDeal), so "Only 3 left"
 *   would be a fixed number dressed up as live scarcity.
 * No save/favourite control either — deal hunters don't have accounts.
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
  // From the two real prices: a "was" at or below the deal price is no saving.
  const savingPct = dealSavingPercent(deal.was, deal.now);
  const restrictions = keyRestrictions(deal.terms).slice(0, 2);
  const categorySlug = CATEGORIES.find((c) => c.name === deal.categories[0])?.slug ?? "";
  const PlaceholderIcon = PLACEHOLDER_ICONS[categorySlug] ?? TagIcon;
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
      // relative: the screen-reader-only price label is absolutely
      // positioned, and without a positioned card around it, it escaped the
      // Flash row's scroll area and made the whole page scroll sideways.
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hp-line bg-white shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 ${
        preview ? "" : "hover:-translate-y-0.5 hover:shadow-card-hover"
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-hp-lavender">
        {deal.image ? (
          <Image
            src={wixImageUrl(deal.image, 800, 500)}
            // Empty: the title is already the link's text, so repeating it
            // as the photo's alt made screen readers announce it twice.
            alt=""
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 768px) 33vw, 50vw"
            className={`object-cover transition duration-300 group-hover:scale-[1.03] ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center text-hp-purple/40">
            <PlaceholderIcon className="h-12 w-12" />
          </div>
        )}

        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-hp-ink/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-hp-ink shadow">Sold out</span>
          </div>
        ) : (
          <div className="absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-1.5 sm:inset-x-2.5 sm:top-2.5">
            {deal.isFlash ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-hp-purple px-2.5 py-1 text-[0.75rem] font-extrabold uppercase tracking-wide text-white shadow-sm">
                <ZapIcon className="h-3.5 w-3.5" />
                Flash Deal
              </span>
            ) : (
              savingPct !== null && (
                <span className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-extrabold text-hp-purple shadow-sm">
                  {savingPct}% off
                </span>
              )
            )}
            {deal.isFlash && deal.expiresAt && <CountdownBadge target={new Date(deal.expiresAt)} variant="left" />}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        {/* Wraps rather than truncating mid-word; no fixed height, so a
            short title sits right on top of its business name. */}
        <h3 className="line-clamp-3 text-[0.9375rem] font-extrabold leading-snug tracking-[-0.01em] text-hp-ink group-hover:text-hp-purple sm:text-[1.0625rem]">
          {deal.name}
        </h3>
        {deal.businessName && (
          <p className="mt-[5px] flex items-start gap-1.5 text-[0.8125rem] leading-snug text-hp-muted sm:text-sm">
            <StoreIcon className="mt-px h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="min-w-0">{deal.businessName}</span>
          </p>
        )}
        {locality && (
          <p className="mt-1 flex items-start gap-1.5 text-[0.8125rem] leading-snug text-hp-muted sm:text-sm">
            <MapPinIcon className="mt-px h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="min-w-0">{locality}</span>
          </p>
        )}

        {restrictions.length > 0 && (
          <p className="mt-1.5 text-xs leading-snug text-hp-muted">{restrictions.join(" · ")}</p>
        )}
        {/* mt-auto keeps prices level across a row of cards without
            padding the gap under a short title. */}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-3">
          <span className="text-[1.375rem] font-extrabold leading-none tracking-[-0.03em] text-hp-purple sm:text-[1.625rem]">
            {formatMoney(deal.now, deal.currency, deal.formattedNow)}
          </span>
          {savingPct !== null && (
            <span className="text-sm font-semibold text-hp-muted line-through sm:text-[0.9375rem]">
              <span className="sr-only">Usual price </span>
              {formatMoney(deal.was, deal.currency, deal.formattedWas)}
            </span>
          )}
        </div>
        {/* "Offer ends", never "Valid until": the deadline to get the deal,
            not the dates it can be used on — those are in the conditions.
            A Flash Deal shows its time left on the photo instead. */}
        {deal.expiresAt && !deal.isFlash && (
          <p className="mt-1.5 text-xs text-hp-muted">Offer ends {formatOfferEndDate(deal.expiresAt, false)}</p>
        )}
      </div>
    </Wrapper>
  );
}
