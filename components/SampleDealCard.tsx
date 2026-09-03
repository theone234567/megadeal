import { formatMoney } from "@/lib/format";
import CountdownBadge from "@/components/CountdownBadge";

/**
 * Static, non-interactive mockup of what a real deal listing looks like —
 * used on both /businesses and /coming-soon to give a prospective merchant
 * something concrete to picture instead of just abstract copy. Not the
 * real DealCard component: this never links anywhere and its data is
 * entirely fixed, so it can't accidentally be mistaken for a live deal.
 */
export default function SampleDealCard() {
  const sampleExpiresAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);

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
          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">
            🏷️
          </div>
          <div className="absolute left-2 top-9 flex flex-col gap-1">
            <span className="rounded-full bg-ember-500 px-2.5 py-1 text-xs font-extrabold text-white shadow">
              50% OFF
            </span>
          </div>
          <div className="absolute bottom-2 left-2">
            <CountdownBadge target={sampleExpiresAt} />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Beauty &amp; Spa
          </span>
          <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-slate-900">
            60-Minute Deep Tissue Massage
          </h3>
          <p className="-mt-1 truncate text-xs font-medium text-slate-500">
            by Your Business Name
          </p>

          <div className="mt-auto flex items-end justify-between pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-900">
                {formatMoney(49, "NZD", null)}
              </span>
              <span className="text-sm text-slate-400 line-through">
                {formatMoney(99, "NZD", null)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
