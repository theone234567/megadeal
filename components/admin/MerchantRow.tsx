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
  bio?: string;
  businessHours?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  priceRange?: string;
  amenities?: string;
  [key: string]: any;
}

const STATUSES = ["Pending", "Approved", "Suspended"];

export default function MerchantRow({ merchant }: { merchant: AdminMerchant }) {
  const [status, setStatus] = useState(merchant.status || "Pending");
  const [credits, setCredits] = useState(merchant.creditsBalance ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const dirty = status !== (merchant.status || "Pending") || credits !== (merchant.creditsBalance ?? 0);

  const hasProfileDetails =
    merchant.bio || merchant.businessHours || merchant.facebookUrl || merchant.instagramUrl ||
    merchant.priceRange || merchant.amenities;

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
    <>
    <tr className="border-b border-slate-100 align-top">
      <td className="py-3 pr-4">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
          disabled={!hasProfileDetails}
        >
          {merchant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={merchant.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
              🏪
            </span>
          )}
          <div>
            <p className="font-semibold text-slate-800">
              {merchant.businessName || "—"} {hasProfileDetails && (detailsOpen ? "▲" : "▼")}
            </p>
            <p className="text-xs text-slate-400">{merchant.email}</p>
          </div>
        </button>
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
    {detailsOpen && hasProfileDetails && (
      <tr className="border-b border-slate-100 bg-slate-50">
        <td colSpan={6} className="px-4 py-3 text-sm text-slate-600">
          {(merchant.priceRange || merchant.amenities) && (
            <p className="font-semibold text-slate-800">
              {merchant.priceRange}
              {merchant.priceRange && merchant.amenities ? " · " : ""}
              {merchant.amenities}
            </p>
          )}
          {merchant.bio && <p className="mt-1">{merchant.bio}</p>}
          {merchant.businessHours && (
            <p className="mt-1 text-xs text-slate-500">Hours: {merchant.businessHours}</p>
          )}
          {(merchant.facebookUrl || merchant.instagramUrl) && (
            <p className="mt-1 text-xs text-slate-500">
              {merchant.facebookUrl && (
                <a href={merchant.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                  Facebook
                </a>
              )}
              {merchant.facebookUrl && merchant.instagramUrl ? " · " : ""}
              {merchant.instagramUrl && (
                <a href={merchant.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                  Instagram
                </a>
              )}
            </p>
          )}
        </td>
      </tr>
    )}
    </>
  );
}
