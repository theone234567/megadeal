import { dealActionCounts } from "@/lib/dealEvents";

/**
 * A deal's results for its business (and admin): views, visits that used
 * "Get this deal", and each action separately. Taps and copies, never
 * bookings or sales, and nothing shown until there is something to show.
 */
export default function DealResults({ deal }: { deal: Record<string, unknown> }) {
  const views = Math.max(0, Math.floor(Number(deal.viewCount) || 0));
  const interested = Math.max(0, Math.floor(Number(deal.clickCount) || 0));
  const actions = dealActionCounts(deal);
  if (views === 0 && interested === 0 && actions.length === 0) return null;
  return (
    <div className="text-xs text-slate-600">
      <p>
        <span className="font-semibold text-slate-800">
          {views} view{views === 1 ? "" : "s"}
        </span>
        {" · "}
        <span className="font-semibold text-slate-800">
          {interested} visit{interested === 1 ? "" : "s"}
        </span>{" "}
        used &quot;Get this deal&quot;
      </p>
      {actions.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="What customers did">
          {actions.map((a) => (
            <li key={a.action} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              {a.label}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[11px] text-slate-500">Counts taps and copies, not bookings or sales.</p>
    </div>
  );
}
