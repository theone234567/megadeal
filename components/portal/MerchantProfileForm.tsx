"use client";

import { useState } from "react";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton", "Other"];

interface MerchantRecord {
  _id: string;
  businessName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postcode?: string;
  bio?: string;
  businessHours?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  [key: string]: any;
}

export default function MerchantProfileForm({
  merchant,
  onSaved,
}: {
  merchant: MerchantRecord;
  onSaved: (updated: MerchantRecord) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState(merchant.businessName || "");
  const [website, setWebsite] = useState(merchant.website || "");
  const [phone, setPhone] = useState(merchant.phone || "");
  const [address, setAddress] = useState(merchant.address || "");
  const [city, setCity] = useState(merchant.city || "");
  const [postcode, setPostcode] = useState(merchant.postcode || "");
  const [bio, setBio] = useState(merchant.bio || "");
  const [businessHours, setBusinessHours] = useState(merchant.businessHours || "");
  const [facebookUrl, setFacebookUrl] = useState(merchant.facebookUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(merchant.instagramUrl || "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/merchants/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          website,
          phone,
          address,
          city,
          postcode,
          bio,
          businessHours,
          facebookUrl,
          instagramUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save your profile.");
      }
      const { item } = await res.json();
      onSaved(item);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || "Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Business details</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Edit
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Business name</dt>
            <dd className="font-medium text-slate-800">{merchant.businessName || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Website</dt>
            <dd className="font-medium text-slate-800">{merchant.website || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Email</dt>
            <dd className="font-medium text-slate-800">{merchant.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Phone</dt>
            <dd className="font-medium text-slate-800">{merchant.phone || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400">Address</dt>
            <dd className="font-medium text-slate-800">
              {[merchant.address, merchant.city, merchant.postcode].filter(Boolean).join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Opening hours</dt>
            <dd className="font-medium text-slate-800">{merchant.businessHours || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Social</dt>
            <dd className="font-medium text-slate-800">
              {[merchant.facebookUrl && "Facebook", merchant.instagramUrl && "Instagram"]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400">About</dt>
            <dd className="font-medium text-slate-800">{merchant.bio || "—"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Edit business details</h2>
      <p className="mt-1 text-xs text-amber-700">
        ⚠️ Saving changes sends your profile back for review before it&apos;s shown
        publicly again.
      </p>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Business name</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Opening hours</label>
            <input
              value={businessHours}
              onChange={(e) => setBusinessHours(e.target.value)}
              placeholder="e.g. Mon–Fri 9am–5pm, Sat 10am–2pm"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="">Select a city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Postcode</label>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Facebook</label>
            <input
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/yourbusiness"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Instagram</label>
            <input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/yourbusiness"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">About your business</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
