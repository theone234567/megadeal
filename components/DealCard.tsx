import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { dealEndsAt } from "@/lib/socialProof";
import { dealSaving } from "@/lib/dealSaving";
import CountdownBadge from "./CountdownBadge";
import StarRating from "./StarRating";

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
  /** Distance from the viewer, in km — shown as a badge when known. */
  distanceKm?: number | null;
  preview?: boolean;
}) {
  const soldOut = !deal.inStock;
  const lowStock =
    !soldOut &&
    deal.quantityAvailable !== null &&
    deal.quantityAvailable > 0 &&
    deal.quantityAvailable <= 5;

  const saving = dealSaving(deal.was, deal.now);

  const Wrapper = preview ? "div" : Link;
  const wrapperProps = preview ? {} : { href: `/deal/${deal.slug}` };

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition ${
        preview ? "" : "hover:-translate-y-0.5 hover:shadow-card-hover"
      } ${soldOut ? "opacity-75" : ""}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {deal.image ? (
          <Image
            src={deal.image}
            alt={deal.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className={`object-cover transition duration-300 group-hover:scale-105 ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <span className="text-4xl">🏷️</span>
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
            <span className="-rotate-6 rounded-lg bg-slate-900 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-white shadow">
              Sold out
            </span>
          </div>
        )}

        {!soldOut && deal.discountPercent > 0 && (
          <div className="absolute left-2 top-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-ember-500 px-2.5 py-1 text-xs font-extrabold text-white shadow">
              {deal.isFlash && <span className="animate-flash-zap">⚡</span>}
              {deal.discountPercent}% OFF
            </span>
          </div>
        )}
        {!soldOut && (
          <div className="absolute bottom-2 left-2 right-2">
            {/* At most one urgency badge at a time — scarcity is the
                stronger, more specific signal once stock is genuinely low,
                so it takes priority over the countdown rather than both
                stacking. Full countdown is still on the deal page. */}
            {lowStock ? (
              <span className="rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-semibold text-white">
                Only {deal.quantityAvailable} left
              </span>
            ) : (
              <CountdownBadge
                target={deal.expiresAt ? new Date(deal.expiresAt) : dealEndsAt(deal.id)}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {deal.categories[0] && (
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {deal.categories[0]}
          </span>
        )}
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-slate-900 group-hover:text-brand-700">
          {deal.name}
        </h3>
        {/* City rides along on the business line instead of claiming a line
            of its own. On a national grid, "which town is this in" is one
            of the first things a person needs and the card never said it —
            the distance badge below only appears for the minority who
            grant location access, so for everyone else a Dunedin massage
            and an Auckland one looked identical. */}
        {(deal.businessName || deal.businessCity) && (
          <p className="-mt-1 truncate text-xs font-medium text-slate-500">
            {deal.businessName ? `by ${deal.businessName}` : ""}
            {deal.businessName && deal.businessCity ? " · " : ""}
            {deal.businessCity ?? ""}
          </p>
        )}
        {deal.businessRating !== null && (
          <StarRating rating={deal.businessRating} reviewCount={deal.businessReviewCount} className="-mt-1" />
        )}
        {distanceKm !== null && (
          <p className="-mt-1 text-xs font-medium text-slate-400">
            📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`} away
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-slate-900">
              {formatMoney(deal.now, deal.currency, deal.formattedNow)}
            </span>
            {deal.was > deal.now && (
              <span className="text-sm text-slate-400 line-through">
                {formatMoney(deal.was, deal.currency, deal.formattedWas)}
              </span>
            )}
          </div>
          {/* This row has always been justify-between with a single child —
              a gap the layout reserved and never filled. The cash saving
              belongs in it: it sits right beside the two prices it is the
              difference between, which is where someone comparing them is
              already looking. Brand-50 rather than a new green, so it
              reads as a chip without competing with the ember % badge. */}
          {saving !== null && (
            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-extrabold text-brand-700">
              Save {formatMoney(saving, deal.currency)}
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
