"use client";

import { useState } from "react";
import { nzLongDate } from "@/lib/dealVerification";
import type { DealRecord } from "./DealManageCard";

/**
 * "Still running as listed": one tap for a business to say a live deal is
 * still exactly as its page says. The deal page then shows "Confirmed by
 * the business" with the date, which tells customers (and search engines)
 * the deal is current. Changes nothing else about the deal.
 */
export default function DealConfirmLive({ deal }: { deal: DealRecord }) {
  const [confirmedAt, setConfirmedAt] = useState<string | null>(deal.merchantConfirmedAt ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState(false);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${deal._id}/confirm`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't confirm this deal.");
      setConfirmedAt(data.item?.merchantConfirmedAt ?? new Date().toISOString());
      setJustDone(true);
    } catch (err: any) {
      setError(err?.message || "Couldn't confirm this deal.");
    } finally {
      setBusy(false);
    }
  }

  const when = nzLongDate(confirmedAt);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-700">
          {justDone ? (
            <span className="font-semibold text-emerald-700">Thanks — your deal page now shows it&apos;s confirmed.</span>
          ) : when ? (
            <>Last confirmed by you on {when}.</>
          ) : (
            <>Is this deal still running exactly as listed? Confirming shows customers it&apos;s current.</>
          )}
        </p>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || justDone}
          className="rounded-full border border-brand-600 px-4 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          {busy ? "Confirming…" : "Still running as listed"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
