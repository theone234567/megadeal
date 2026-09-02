"use client";

import { useState } from "react";
import type { DealStatus } from "@/lib/types";

export interface AdminDeal {
  _id: string;
  dealName?: string;
  productId?: string;
  expiresAt?: string;
  status?: DealStatus | string;
  photoUrl?: string;
  merchantEmail?: string;
  statusNote?: string | null;
  dealCode?: string | null;
  [key: string]: any;
}

const STATUSES: DealStatus[] = ["Pending Approval", "Live", "Paused", "Cancelled"];

function toDateInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function DealRow({ deal }: { deal: AdminDeal }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [status, setStatus] = useState<string>(deal.status || "Live");
  const [expiresAt, setExpiresAt] = useState(toDateInputValue(deal.expiresAt));
  const [merchantEmail, setMerchantEmail] = useState(deal.merchantEmail || "");
  const [note, setNote] = useState(deal.statusNote || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusChangedToPausedOrCancelled =
    status !== (deal.status || "Live") && (status === "Paused" || status === "Cancelled");

  const dirty =
    status !== (deal.status || "Live") ||
    expiresAt !== toDateInputValue(deal.expiresAt) ||
    merchantEmail !== (deal.merchantEmail || "") ||
    note !== (deal.statusNote || "");

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deals/${deal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          merchantEmail,
          note,
        }),
      });
      if (!res.ok) throw new Error();
      deal.status = status;
      deal.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : undefined;
      deal.merchantEmail = merchantEmail;
      deal.statusNote = note || null;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const hasDetails = deal.description || deal.terms || deal.priceNow !== undefined;

  return (
    <>
    <tr className="border-b border-slate-100 align-top">
      <td className="py-3 pr-4">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
          disabled={!hasDetails}
        >
          {deal.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deal.photoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
              🏷️
            </span>
          )}
          <div>
            <p className="font-semibold text-slate-800">
              {deal.isFlash && <span className="mr-1 text-brand-600">⚡</span>}
              {deal.dealName || "Untitled"} {hasDetails && (detailsOpen ? "▲" : "▼")}
            </p>
            <p className="text-xs text-slate-400">{deal.productId ? `${deal.productId.slice(0, 8)}…` : "no linked product"}</p>
          </div>
        </button>
      </td>
      <td className="py-3 pr-4">
        <input
          type="email"
          value={merchantEmail}
          onChange={(e) => setMerchantEmail(e.target.value)}
          placeholder="unassigned"
          className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs"
        />
      </td>
      <td className="py-3 pr-4">
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </td>
      <td className="py-3 pr-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(status === "Paused" || status === "Cancelled" || note) && (
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              statusChangedToPausedOrCancelled ? "Note for the merchant (why?)" : "Note for the merchant"
            }
            className="mt-1 w-44 rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        )}
      </td>
      <td className="py-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
    {detailsOpen && hasDetails && (
      <tr className="border-b border-slate-100 bg-slate-50">
        <td colSpan={5} className="px-4 py-3 text-sm text-slate-600">
          {deal.priceNow !== undefined && (
            <p className="font-semibold text-slate-800">
              ${deal.priceNow}
              {deal.priceWas && deal.priceWas > deal.priceNow ? (
                <span className="ml-1 text-xs font-normal text-slate-400 line-through">
                  ${deal.priceWas}
                </span>
              ) : null}
              {deal.quantityAvailable ? (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  · {deal.quantityAvailable} available
                </span>
              ) : null}
            </p>
          )}
          {deal.description && <p className="mt-1">{deal.description}</p>}
          {deal.terms && <p className="mt-1 text-xs italic text-slate-500">Terms: {deal.terms}</p>}
          {deal.dealCode && (
            <p className="mt-1 text-xs text-slate-500">
              Code: <span className="font-mono font-semibold text-slate-700">{deal.dealCode}</span>
            </p>
          )}
          {(deal.viewCount || deal.clickCount) && (
            <p className="mt-1 text-xs text-slate-500">
              👁 {deal.viewCount || 0} views · 🖱 {deal.clickCount || 0} clicks
            </p>
          )}
          {!deal.productId && (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              ⚠️ No Wix Store product linked — this deal won&apos;t appear on the storefront even if
              set to Live. Deals normally get a product automatically when submitted; if one is
              missing here, check the Wix dashboard or have the merchant resubmit.
            </p>
          )}
        </td>
      </tr>
    )}
    </>
  );
}
