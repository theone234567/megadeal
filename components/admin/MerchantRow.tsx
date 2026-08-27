"use client";

import { useState } from "react";

export interface AdminMerchant {
  _id: string;
  _owner?: string;
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
  bookingUrl?: string;
  bookingEmail?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  priceRange?: string;
  amenities?: string;
  emailVerified?: boolean;
  lat?: number;
  lng?: number;
  rating?: number | null;
  reviewCount?: number | null;
  referralCode?: string;
  referredBy?: string;
  [key: string]: any;
}

const STATUSES = ["Pending", "Approved", "Suspended"];

export default function MerchantRow({ merchant }: { merchant: AdminMerchant }) {
  const [status, setStatus] = useState(merchant.status || "Pending");
  const [credits, setCredits] = useState(merchant.creditsBalance ?? 0);
  const [rating, setRating] = useState(merchant.rating ?? "");
  const [reviewCount, setReviewCount] = useState(merchant.reviewCount ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const dirty =
    status !== (merchant.status || "Pending") ||
    credits !== (merchant.creditsBalance ?? 0) ||
    rating !== (merchant.rating ?? "") ||
    reviewCount !== (merchant.reviewCount ?? "");

  const hasProfileDetails =
    merchant.bio || merchant.businessHours || merchant.bookingUrl || merchant.bookingEmail ||
    merchant.facebookUrl || merchant.instagramUrl || merchant.priceRange || merchant.amenities;

  async function save() {
    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await fetch(`/api/admin/merchants/${merchant._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          creditsBalance: credits,
          rating: rating === "" ? null : rating,
          reviewCount: reviewCount === "" ? null : reviewCount,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      merchant.status = status;
      merchant.creditsBalance = credits;
      merchant.rating = rating === "" ? null : Number(rating);
      merchant.reviewCount = reviewCount === "" ? null : Number(reviewCount);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }
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
            {merchant.emailVerified ? (
              <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                ✓ Email verified
              </p>
            ) : (
              <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                ⏳ Email pending verification
              </p>
            )}
            {!merchant._owner && (
              <p
                className="mt-0.5 text-xs font-semibold text-amber-700"
                title="No one has signed in with this business's email yet, so it isn't linked to any account. It'll link automatically the first time they sign in with a matching email."
              >
                ⚠️ Unclaimed — no account signed in yet
              </p>
            )}
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
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={rating}
            onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="★"
            className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
          <input
            type="number"
            min={0}
            value={reviewCount}
            onChange={(e) => setReviewCount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="#"
            className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        </div>
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
        {warnings.map((w, i) => (
          <p key={i} className="mt-1 max-w-[16rem] text-xs text-amber-600">
            ⚠️ {w}
          </p>
        ))}
      </td>
    </tr>
    {detailsOpen && hasProfileDetails && (
      <tr className="border-b border-slate-100 bg-slate-50">
        <td colSpan={7} className="px-4 py-3 text-sm text-slate-600">
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
          {merchant.referralCode && (
            <p className="mt-1 text-xs text-slate-500">
              🤝 Referral code: <span className="font-semibold">{merchant.referralCode}</span>
              {merchant.referredBy && ` · Referred by ${merchant.referredBy}`}
            </p>
          )}
          {(merchant.bookingUrl || merchant.bookingEmail) && (
            <p className="mt-1 text-xs text-slate-500">
              Booking: {[merchant.bookingUrl, merchant.bookingEmail].filter(Boolean).join(" · ")}
            </p>
          )}
          {typeof merchant.lat === "number" && typeof merchant.lng === "number" && (
            <p className="mt-1 text-xs text-slate-400">
              📍 {merchant.lat.toFixed(5)}, {merchant.lng.toFixed(5)}
            </p>
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
