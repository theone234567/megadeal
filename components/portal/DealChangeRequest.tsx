"use client";

import { useState } from "react";
import { BOOKING_CHOICES } from "@/lib/booking";
import { readRevision, revisionLines } from "@/lib/dealRevision";
import type { DealRecord } from "./DealManageCard";

const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400";
const label = "mb-1 block text-xs font-semibold text-slate-700";

/**
 * "Request a change" for a submitted deal (lib/dealRevision.ts): the
 * business proposes new wording, prices, booking answer or quantity, and
 * the deal stays exactly as it is for customers until an admin approves.
 * One request at a time; sending another replaces it.
 */
export default function DealChangeRequest({ deal }: { deal: DealRecord }) {
  const [row, setRow] = useState<DealRecord>(deal);
  const pending = readRevision(row);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    dealName: deal.dealName ?? "",
    description: deal.description ?? "",
    terms: deal.terms ?? "",
    priceNow: deal.priceNow != null ? String(deal.priceNow) : "",
    priceWas: deal.priceWas != null && deal.priceWas !== deal.priceNow ? String(deal.priceWas) : "",
    bookingRequirement: deal.bookingRequirement ?? "",
    quantityAvailable: deal.quantityAvailable != null ? String(deal.quantityAvailable) : "",
    note: "",
  }));
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (pending && !window.confirm("This replaces the change request you already sent. Continue?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${deal._id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: {
            dealName: form.dealName,
            description: form.description,
            terms: form.terms,
            priceNow: form.priceNow,
            priceWas: form.priceWas,
            bookingRequirement: form.bookingRequirement || undefined,
            quantityAvailable: form.quantityAvailable,
          },
          note: form.note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send your request.");
      setRow(data.item ?? row);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || "Couldn't send your request.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!window.confirm("Withdraw your change request? The deal stays as it is.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${deal._id}/revision`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't withdraw your request.");
      setRow(data.item ?? { ...row, pendingRevision: null });
    } catch (err: any) {
      setError(err?.message || "Couldn't withdraw your request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {pending && (
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">
          <p className="font-semibold">Change requested — waiting for review</p>
          <p className="mt-0.5 text-brand-800">Customers see the deal as it is until it&apos;s approved.</p>
          <ul className="mt-2 space-y-1">
            {revisionLines(pending, row).map((l) => (
              <li key={l.label} className="break-words">
                <span className="font-semibold">{l.label}:</span> <span className="text-slate-500 line-through">{l.from}</span> →{" "}
                {l.to}
              </li>
            ))}
          </ul>
          <button type="button" onClick={withdraw} disabled={busy} className="mt-2 text-xs font-bold text-brand-700 underline disabled:opacity-60">
            Withdraw request
          </button>
        </div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            // Changing a request starts from what was asked for, not from
            // the deal as it is.
            if (pending) {
              const c = pending.changes as Record<string, unknown>;
              setForm((f) => ({
                ...f,
                ...Object.fromEntries(
                  Object.entries(c).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])
                ),
                note: pending.note,
              }));
            }
            setOpen(true);
          }}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          {pending ? "Change your request" : "Request a change"}
        </button>
      ) : (
        <form onSubmit={send} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-600">
            Edit what should change. We&apos;ll review it, and it shows once approved. The deal code stays the same.
          </p>
          <div>
            <label htmlFor={`cr-name-${deal._id}`} className={label}>Deal name</label>
            <input id={`cr-name-${deal._id}`} className={input} maxLength={80} value={form.dealName} onChange={(e) => set("dealName", e.target.value)} />
          </div>
          <div>
            <label htmlFor={`cr-desc-${deal._id}`} className={label}>Description</label>
            <textarea id={`cr-desc-${deal._id}`} className={input} rows={3} maxLength={2000} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label htmlFor={`cr-terms-${deal._id}`} className={label}>Conditions</label>
            <textarea id={`cr-terms-${deal._id}`} className={input} rows={2} maxLength={2000} value={form.terms} onChange={(e) => set("terms", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`cr-now-${deal._id}`} className={label}>Deal price ($)</label>
              <input id={`cr-now-${deal._id}`} className={input} inputMode="decimal" value={form.priceNow} onChange={(e) => set("priceNow", e.target.value)} />
            </div>
            <div>
              <label htmlFor={`cr-was-${deal._id}`} className={label}>Original price ($)</label>
              <input id={`cr-was-${deal._id}`} className={input} inputMode="decimal" value={form.priceWas} onChange={(e) => set("priceWas", e.target.value)} placeholder="None" />
            </div>
            <div>
              <label htmlFor={`cr-qty-${deal._id}`} className={label}>Quantity offered</label>
              <input id={`cr-qty-${deal._id}`} className={input} inputMode="numeric" value={form.quantityAvailable} onChange={(e) => set("quantityAvailable", e.target.value)} placeholder="No limit" />
            </div>
          </div>
          <div>
            <label htmlFor={`cr-book-${deal._id}`} className={label}>Do customers need to book?</label>
            <select id={`cr-book-${deal._id}`} className={input} value={form.bookingRequirement} onChange={(e) => set("bookingRequirement", e.target.value)}>
              {!form.bookingRequirement && <option value="">Not set</option>}
              {BOOKING_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`cr-note-${deal._id}`} className={label}>
              Note for our team <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input id={`cr-note-${deal._id}`} className={input} maxLength={500} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. The price went up on 1 November" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60">
              {busy ? "Sending…" : "Send for review"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
