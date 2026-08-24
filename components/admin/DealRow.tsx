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
  const [status, setStatus] = useState<string>(deal.status || "Live");
  const [expiresAt, setExpiresAt] = useState(toDateInputValue(deal.expiresAt));
  const [merchantEmail, setMerchantEmail] = useState(deal.merchantEmail || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    status !== (deal.status || "Live") ||
    expiresAt !== toDateInputValue(deal.expiresAt) ||
    merchantEmail !== (deal.merchantEmail || "");

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
        }),
      });
      if (!res.ok) throw new Error();
      deal.status = status;
      deal.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : undefined;
      deal.merchantEmail = merchantEmail;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          {deal.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deal.photoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
              🏷️
            </span>
          )}
          <div>
            <p className="font-semibold text-slate-800">{deal.dealName || "Untitled"}</p>
            <p className="text-xs text-slate-400">{deal.productId?.slice(0, 8)}…</p>
          </div>
        </div>
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
  );
}
