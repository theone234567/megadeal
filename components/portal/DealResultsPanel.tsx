"use client";

import { useEffect, useState } from "react";
import type { DealStats } from "@/lib/dealEventLog";

const METHOD_LABELS: Record<keyof DealStats["byMethod"], string> = {
  booking: "Book online",
  phone: "Call",
  website: "Website",
  email: "Email",
  directions: "Directions",
};

/**
 * "Deal results": what customers did with this business's deals over the
 * last 7, 30 or 90 days (lib/dealEventLog.ts via /api/merchants/deal-stats
 * or, for MegaDeal, /api/admin/deal-stats). Every figure says what it
 * counts: taps are taps, "visits" are anonymous browser visits (one person
 * on two devices counts twice), and none of it is a booking, a call that
 * connected, a redemption or a sale.
 */
export default function DealResultsPanel({ endpoint = "/api/merchants/deal-stats", title = "Deal results" }: { endpoint?: string; title?: string }) {
  const [days, setDays] = useState(30);
  const [state, setState] = useState<{ stats: DealStats | null; notReady?: boolean; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${endpoint}?days=${days}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setState(res.ok ? { stats: data.stats ?? null, notReady: data.notReady } : { stats: null, error: data.error || "Couldn't load the figures." });
      })
      .catch(() => !cancelled && setState({ stats: null, error: "Couldn't load the figures." }));
    return () => {
      cancelled = true;
    };
  }, [endpoint, days]);

  const s = state?.stats;
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

  return (
    <section aria-labelledby="deal-results-heading" className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="deal-results-heading" className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <div role="group" aria-label="Period" className="flex overflow-hidden rounded-xl border border-slate-200 text-sm font-semibold">
          {[7, 30, 90].map((d, i) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`min-h-[40px] px-3 ${i > 0 ? "border-l border-slate-200" : ""} ${days === d ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {!state ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : state.error ? (
        <p className="mt-4 text-sm text-red-600">{state.error}</p>
      ) : state.notReady || !s ? (
        <p className="mt-4 text-sm text-slate-600">Detailed results start once MegaDeal&apos;s next update is switched on.</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Deal views" value={s.totals.views} note={`${s.totals.viewSessions} visits`} />
            <Stat label="Visits that revealed a code" value={s.totals.revealSessions} note={`${s.totals.reveals} reveals in all`} />
            <Stat label="Code reveal rate" value={pct(s.totals.revealRate)} note="of visits that viewed a deal" />
            <Stat label="Contact taps" value={s.totals.contactClicks} note={`${s.totals.copies} codes copied`} />
          </dl>

          {s.totals.contactClicks > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact taps by type</p>
              <ul className="mt-1 flex flex-wrap gap-2 text-sm">
                {(Object.keys(METHOD_LABELS) as (keyof DealStats["byMethod"])[])
                  .filter((m) => s.byMethod[m] > 0)
                  .map((m) => (
                    <li key={m} className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      {METHOD_LABELS[m]}: <strong className="tabular-nums">{s.byMethod[m]}</strong>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {s.totals.views > 0 && (
            <p className="mt-3 text-xs text-slate-600">
              Views by device: phone {s.byDevice.mobile}, tablet {s.byDevice.tablet}, computer {s.byDevice.desktop}. &ldquo;Get deal code&rdquo; taps: {s.bySource.main} on
              the deal, {s.bySource.sticky} from the bar at the bottom of a phone&apos;s screen.
            </p>
          )}

          {s.deals.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">Results for each deal</caption>
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-semibold">Deal</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Views</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Visits revealing code</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Contact taps</th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">Codes copied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {s.deals.map((d) => (
                    <tr key={d.dealId}>
                      <th scope="row" className="max-w-[16rem] truncate py-2 pr-3 font-medium text-slate-900">
                        {d.name}
                      </th>
                      <td className="px-3 py-2 text-right">{d.views}</td>
                      <td className="px-3 py-2 text-right">{d.revealSessions}</td>
                      <td className="px-3 py-2 text-right">{d.contactClicks}</td>
                      <td className="py-2 pl-3 text-right">{d.copies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Counts what customers tapped on MegaDeal, not bookings, calls answered, visits or sales. A visit is one browser
            tab, so one person on two devices counts as two. Some visits aren&apos;t counted at all (blocked by the browser,
            or offline). Previews by you or MegaDeal are never counted.
          </p>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-semibold text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-2xl font-extrabold tabular-nums text-slate-900">{value}</dd>
      <dd className="text-xs text-slate-500">{note}</dd>
    </div>
  );
}
