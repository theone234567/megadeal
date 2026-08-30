import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { dealEndsAt } from "@/lib/socialProof";
import CountdownBadge from "./CountdownBadge";
import StarRating from "./StarRating";

export default function DealCard({
  deal,
  distanceKm = null,
}: {
  deal: Deal;
  /** Distance from the viewer, in km — shown as a badge when known. */
  distanceKm?: number | null;
}) {
  const soldOut = !deal.inStock;
  const lowStock =
    !soldOut &&
    deal.quantityAvailable !== null &&
    deal.quantityAvailable > 0 &&
    deal.quantityAvailable <= 5;

  return (
    <Link
      href={`/deal/${deal.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
        soldOut ? "opacity-75" : ""
      }`}
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

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {!soldOut && deal.isFlash && (
            <span className="inline-block animate-flash-zap rounded-full bg-brand-600 px-2.5 py-1 text-xs font-extrabold text-white shadow">
              ⚡ FLASH
            </span>
          )}
          {deal.discountPercent > 0 && (
            <span className="rounded-full bg-ember-500 px-2.5 py-1 text-xs font-extrabold text-white shadow">
              {deal.discountPercent}% OFF
            </span>
          )}
        </div>
        {!soldOut && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1">
            <CountdownBadge
              target={deal.expiresAt ? new Date(deal.expiresAt) : dealEndsAt(deal.id)}
            />
            {lowStock && (
              <span className="rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-semibold text-white">
                Only {deal.quantityAvailable} left
              </span>
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
        {deal.businessName && (
          <p className="-mt-1 truncate text-xs font-medium text-slate-500">
            by {deal.businessName}
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
        </div>
      </div>
    </Link>
  );
}
