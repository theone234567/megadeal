import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/format";

/**
 * MegaShop's own plain product card — deliberately not DealCard, which
 * shows a countdown badge that falls back to a made-up "urgency" timer
 * (dealEndsAt) when expiresAt is null. That's fine for a deal, but a
 * regular store product has no real expiry and showing a fake one would
 * be misleading.
 */
export default function MegaShopProductCard({ product }: { product: Deal }) {
  const soldOut = !product.inStock;
  const lowStock =
    !soldOut && product.quantityAvailable !== null && product.quantityAvailable > 0 && product.quantityAvailable <= 5;

  return (
    <Link
      href={`/megashop/${product.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
        soldOut ? "opacity-75" : ""
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className={`object-cover transition duration-300 group-hover:scale-105 ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <span className="text-4xl">🛍️</span>
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
            <span className="-rotate-6 rounded-lg bg-slate-900 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-white shadow">
              Sold out
            </span>
          </div>
        )}

        {product.discountPercent > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-ember-500 px-2.5 py-1 text-xs font-extrabold text-white shadow">
            {product.discountPercent}% OFF
          </span>
        )}

        {lowStock && (
          <span className="absolute bottom-2 left-2 rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-semibold text-white">
            Only {product.quantityAvailable} left
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-slate-900 group-hover:text-brand-700">
          {product.name}
        </h3>

        <div className="mt-auto flex items-end justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-slate-900">
              {formatMoney(product.now, product.currency, product.formattedNow)}
            </span>
            {product.was > product.now && (
              <span className="text-sm text-slate-400 line-through">
                {formatMoney(product.was, product.currency, product.formattedWas)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
