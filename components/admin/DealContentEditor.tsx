"use client";

import { useState } from "react";
import { BOOKING_CHOICES } from "@/lib/booking";
import type { AdminDeal } from "./DealRow";

const FIELD_LABELS: Record<string, string> = {
  dealName: "Name",
  description: "What's included",
  terms: "Conditions",
  priceNow: "Price",
  priceWas: "Usual price",
  bookingRequirement: "Booking",
  quantityAvailable: "Quantity",
  photoUrl: "Photo",
};

function formFromDeal(deal: AdminDeal) {
  return {
    dealName: deal.dealName ?? "",
    description: deal.description ?? "",
    terms: deal.terms ?? "",
    priceNow: deal.priceNow != null ? String(deal.priceNow) : "",
    // Stored equal to the price when there's no comparison; shown empty.
    priceWas: deal.priceWas != null && deal.priceWas !== deal.priceNow ? String(deal.priceWas) : "",
    bookingRequirement: deal.bookingRequirement ?? "",
    quantityAvailable: deal.quantityAvailable != null ? String(deal.quantityAvailable) : "",
  };
}

/**
 * Admin-only editing of a submitted deal. Businesses can't change a deal
 * once it's submitted, so corrections they ask for are made here. Saving
 * sends only the fields that changed; the server keeps what each edit
 * replaced (shown under "Change history").
 */
export default function DealContentEditor({ deal, onSaved }: { deal: AdminDeal; onSaved: (item: AdminDeal) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => formFromDeal(deal));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deals/${deal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed.");
      onSaved(data.item);
      return true;
    } catch (err: any) {
      setError(err?.message || "Save failed.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function saveContent() {
    const original = formFromDeal(deal);
    const changed: Record<string, unknown> = {};
    for (const key of Object.keys(form) as (keyof typeof form)[]) {
      if (form[key] !== original[key]) changed[key] = form[key];
    }
    if (Object.keys(changed).length === 0) {
      setEditing(false);
      return;
    }
    if (await patch(changed, "content")) setEditing(false);
  }

  const history: { at: string; previous: Record<string, unknown> }[] = Array.isArray(deal.contentHistory)
    ? deal.contentHistory
    : [];
  const input = "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm";

  return (
    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
      <p className="text-xs text-slate-500">
        Deal ID: <span className="select-all font-mono">{deal._id}</span>
      </p>

      {deal.pendingPhotoUrl && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">New photo waiting for approval</p>
          <div className="mt-2 flex items-center gap-3">
            {deal.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={deal.photoUrl} alt="Current photo" className="h-20 w-20 rounded-lg object-cover opacity-60" />
            )}
            <span aria-hidden>→</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={deal.pendingPhotoUrl} alt="New photo" className="h-20 w-20 rounded-lg object-cover" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => patch({ photoDecision: "approve" }, "photo")}
              className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Approve photo
            </button>
            <input
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason (sent to the business)"
              aria-label="Reason for rejecting the photo"
              className="w-56 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => patch({ photoDecision: "reject", photoNote: rejectNote }, "photo")}
              className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {!editing ? (
        <button
          type="button"
          onClick={() => {
            setForm(formFromDeal(deal));
            setEditing(true);
          }}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white"
        >
          Edit deal details
        </button>
      ) : (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Name
            <input className={input} maxLength={80} value={form.dealName} onChange={(e) => setForm({ ...form, dealName: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            What&apos;s included
            <textarea className={input} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Conditions
            <textarea className={input} rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Price ($)
            <input className={input} type="number" min="0" step="0.01" value={form.priceNow} onChange={(e) => setForm({ ...form, priceNow: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Usual price ($, optional)
            <input className={input} type="number" min="0" step="0.01" value={form.priceWas} onChange={(e) => setForm({ ...form, priceWas: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Booking
            <select className={input} value={form.bookingRequirement} onChange={(e) => setForm({ ...form, bookingRequirement: e.target.value })}>
              {!form.bookingRequirement && <option value="">Not set (older deal)</option>}
              {BOOKING_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Quantity (optional)
            <input className={input} type="number" min="0" step="1" value={form.quantityAvailable} onChange={(e) => setForm({ ...form, quantityAvailable: e.target.value })} />
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Customers who already revealed a code saw the old version — if a change makes the deal worse for them,
            honour what they saw.
          </p>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={saveContent}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {busy === "content" ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setEditing(false)}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {history.length > 0 && (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold">Change history ({history.length})</summary>
          <ul className="mt-2 space-y-2">
            {history.map((h, i) => (
              <li key={i}>
                <span className="font-semibold">{new Date(h.at).toLocaleString("en-NZ")}</span> — replaced:{" "}
                {Object.entries(h.previous)
                  .map(([k, v]) => `${FIELD_LABELS[k] ?? k}: ${v === null || v === "" ? "(empty)" : String(v).slice(0, 120)}`)
                  .join(" · ")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
