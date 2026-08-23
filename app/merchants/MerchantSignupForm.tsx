"use client";

import { useEffect, useState } from "react";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton", "Other"];

export default function MerchantSignupForm() {
  const [submitted, setSubmitted] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  if (submitted) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
        <h3 className="text-lg font-bold text-brand-800">
          Thanks — we&apos;ve got your details!
        </h3>
        <p className="mt-2 text-sm text-brand-700">
          Our merchant team will review your business and be in touch by
          email within a couple of business days to talk through your first
          deal.
        </p>
      </div>
    );
  }

  return (
    <div id="signup" className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h3 className="text-lg font-bold text-slate-900">Sign up your business</h3>
      <p className="mt-1 text-sm text-slate-500">
        Tell us a bit about your business and we&apos;ll be in touch to set up
        your first deal.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Company name
          </label>
          <input
            required
            type="text"
            placeholder="e.g. Harbourside Bistro"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contact email
            </label>
            <input
              required
              type="email"
              placeholder="you@yourbusiness.co.nz"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Phone number
            </label>
            <input
              required
              type="tel"
              placeholder="021 234 5678"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Business address
          </label>
          <input
            required
            type="text"
            placeholder="Street address"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <p className="mt-1 text-xs text-slate-400">
            Used to show your deal to customers nearby.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              City
            </label>
            <select
              required
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="" disabled>
                Select a city
              </option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Postcode
            </label>
            <input
              type="text"
              placeholder="1010"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Photo of your business
          </label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-300">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Business preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl">🏪</span>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="block text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                A photo of your storefront or space helps your listing stand out. JPG or PNG.
              </p>
            </div>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            required
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
          />
          <span>
            I understand my business name, address, and photo will be
            displayed publicly on the MegaDeal website as part of my deal
            listing.
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-full bg-brand-600 py-3 text-center font-bold text-white shadow-card transition hover:bg-brand-700 sm:w-auto sm:px-8"
        >
          Submit application
        </button>
      </form>
    </div>
  );
}
