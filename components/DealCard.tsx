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

  // Business and place on one line, one icon: the card's single metadata row.
  const metaLine = [deal.businessName, locality].filter(Boolean).join(" · ");
  const footLine = [
    deal.expiresAt && !deal.isFlash ? `Offer ends ${formatOfferEndDate(deal.expiresAt, false)}` : null,
    ...restrictions,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Wrapper
      {...(wrapperProps as any)}
      // relative: the screen-reader-only price label is absolutely
      // positioned, and without a positioned card around it, it escaped the
      // Flash row's scroll area and made the whole page scroll sideways.
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hp-line bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 ${
        preview ? "" : "hover:border-hp-purple/40 hover:shadow-card"
      }`}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-hp-lavender">
        {deal.image ? (
          <Image
            src={wixImageUrl(deal.image, 750, 500)}
            // Empty: the title is already the link's text, so repeating it
            // as the photo's alt made screen readers announce it twice.
            alt=""
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
            className={`object-cover transition duration-300 group-hover:scale-[1.02] ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center text-hp-purple/40">
            <PlaceholderIcon className="h-10 w-10" />
          </div>
        )}

        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-hp-ink/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-hp-ink shadow">Sold out</span>
          </div>
        ) : (
          // Fixed positions: the Flash label (or the saving) top left, the
          // time left top right. One marker each, never both colours twice.
          <div className="absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-1.5">
            {deal.isFlash ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-hp-flash px-2 py-0.5 text-xs font-bold text-white">
                <ZapIcon className="h-3.5 w-3.5" />
                Flash Deal
              </span>
            ) : (
              savingPct !== null && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-hp-purple shadow-sm">
                  {savingPct}% off
                </span>
              )
            )}
            {deal.isFlash && deal.expiresAt && <CountdownBadge target={new Date(deal.expiresAt)} variant="left" />}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5">
        {/* Two lines at most, and always two lines tall, so the rows of
            metadata and prices line up across a row of cards. */}
        <h3 className="line-clamp-2 min-h-[2.7em] text-[0.9375rem] font-bold leading-[1.35] text-hp-ink group-hover:text-hp-purple sm:text-base">
          {deal.name}
        </h3>
        {metaLine && (
          <p className="flex min-w-0 items-center gap-1 text-[0.8125rem] text-hp-muted">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{metaLine}</span>
          </p>
        )}

        {/* mt-auto keeps prices level across a row of cards. */}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1.5">
          <span className="text-xl font-bold leading-none tracking-[-0.02em] text-hp-purple sm:text-[1.375rem]">
            {formatMoney(deal.now, deal.currency, deal.formattedNow)}
          </span>
          {savingPct !== null && (
            <span className="text-sm text-hp-muted line-through">
              <span className="sr-only">Usual price </span>
              {formatMoney(deal.was, deal.currency, deal.formattedWas)}
            </span>
          )}
        </div>
        {/* The last line, in a fixed place: when the offer ends, then its
            main conditions — the date first, so a long condition can't
            push it out of view. "Offer ends", never "Valid until": the
            deadline to get the deal, not the dates it can be used on. A
            Flash Deal's time left is on the photo instead. */}
        {footLine && <p className="truncate text-xs text-hp-muted">{footLine}</p>}
      </div>
    </Wrapper>
  );
}
