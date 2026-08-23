import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { boughtToday, dealEndsAt } from "@/lib/socialProof";
import CountdownBadge from "./CountdownBadge";

export default function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link
      href={`/deal/${deal.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {deal.image ? (
          <Image
            src={deal.image}
            alt={deal.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <span className="text-4xl">🏷️</span>
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {deal.discountPercent > 0 && (
            <span className="rounded-full bg-ember-500 px-2.5 py-1 text-xs font-extrabold text-white shadow">
              {deal.discountPercent}% OFF
            </span>
          )}
        </div>
        <div className="absolute bottom-2 left-2">
          <CountdownBadge target={dealEndsAt(deal.id)} />
        </div>
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
        <p className="text-xs text-slate-400">{boughtToday(deal.id)} bought today</p>
      </div>
    </Link>
  );
}
