"use client";

import { useState } from "react";

export interface AdminMerchant {
  _id: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  couponCode?: string;
  creditsBalance?: number;
  status?: string;
  logoUrl?: string;
  [key: string]: any;
}

const STATUSES = ["Pending", "Approved", "Suspended"];

export default function MerchantRow({ merchant }: { merchant: AdminMerchant }) {
  const [status, setStatus] = useState(merchant.status || "Pending");
  const [credits, setCredits] = useState(merchant.creditsBalance ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = status !== (merchant.status || "Pending") || credits !== (merchant.creditsBalance ?? 0);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/merchants/${merchant._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, creditsBalance: credits }),
      });
      if (!res.ok) throw new Error();
      merchant.status = status;
      merchant.creditsBalance = credits;
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
          {merchant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={merchant.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
              🏪
            </span>
          )}
          <div>
            <p className="font-semibold text-slate-800">{merchant.businessName || "—"}</p>
            <p className="text-xs text-slate-400">{merchant.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-xs text-slate-500">
        {[merchant.address, merchant.city, merchant.postcode].filter(Boolean).join(", ") || "—"}
        <br />
        {merchant.phone}
      </td>
      <td className="py-3 pr-4 text-xs font-semibold text-slate-600">
        {merchant.couponCode || "—"}
      </td>
      <td className="py-3 pr-4">
        <input
          type="number"
          min={0}
          value={credits}
          onChange={(e) => setCredits(Number(e.target.value))}
          className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
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
