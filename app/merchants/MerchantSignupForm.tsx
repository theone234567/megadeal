"use client";

import { useEffect, useRef, useState } from "react";
import { useWix } from "@/context/WixProvider";
import { fileToCompressedDataUrl } from "@/lib/imageUpload";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton", "Other"];

interface AddressSuggestion {
  label: string;
  street: string;
  city?: string;
  postcode?: string;
}

// Free, keyless geocoder (OpenStreetMap-based) used purely for address
// suggestions as the merchant types — no API key or billing needed.
async function fetchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");
  // Bias results toward New Zealand without excluding other countries.
  url.searchParams.set("lat", "-41.29");
  url.searchParams.set("lon", "174.78");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Address lookup failed");
  const data = await res.json();

  return (data.features ?? []).map((f: any) => {
    const p = f.properties ?? {};
    const street = p.housenumber && p.name ? `${p.housenumber} ${p.name}` : p.name || p.street || "";
    const label = [street, p.city, p.state, p.postcode, p.country].filter(Boolean).join(", ");
    return { label, street, city: p.city, postcode: p.postcode };
  });
}

export default function MerchantSignupForm() {
  const { client, isLoggedIn, member, login } = useWix();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Debounced address lookup as the merchant types.
  useEffect(() => {
    if (address.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchAddressSuggestions(address)
        .then((results) => {
          if (!cancelled) setSuggestions(results);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address]);

  // Close the suggestions dropdown on an outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addressBoxRef.current && !addressBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectSuggestion(s: AddressSuggestion) {
    setAddress(s.street || s.label);
    if (s.postcode) setPostcode(s.postcode);
    if (s.city) {
      const match = CITIES.find(
        (c) => c.toLowerCase() === s.city!.toLowerCase()
      );
      setCity(match ?? "Other");
    }
    setSuggestions([]);
    setShowSuggestions(false);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
        <h3 className="text-lg font-bold text-brand-800">
          Thanks — we&apos;ve got your details!
        </h3>
        <p className="mt-2 text-sm text-brand-700">
          Our merchant team will review your business and be in touch by
          email within a couple of business days to talk through your first
          deal. You can check your application status and deal credits
          anytime in your{" "}
          <a href="/portal" className="font-semibold underline">
            merchant portal
          </a>
          .
        </p>
      </div>
    );
  }

  if (member === undefined) {
    return (
      <div id="signup" className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-card">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div id="signup" className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-card">
        <span className="text-3xl">🔒</span>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Sign up your business</h3>
        <p className="mt-2 text-sm text-slate-500">
          Sign in first so we can securely link your application to your
          account. You&apos;ll be able to check your status and deal credits
          anytime in your merchant portal — only you can see it.
        </p>
        <button
          onClick={() => login("/merchants#signup")}
          className="mt-5 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700"
        >
          Sign in to continue
        </button>
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
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitError(null);
          setSubmitting(true);
          try {
            const formData = new FormData(e.currentTarget);
            const logoUrl = photo ? await fileToCompressedDataUrl(photo) : "";
            await client.items.insert("Merchants", {
              businessName: String(formData.get("businessName") ?? ""),
              website: String(formData.get("website") ?? ""),
              email: String(formData.get("email") ?? ""),
              phone: String(formData.get("phone") ?? ""),
              address,
              city,
              postcode,
              bio: String(formData.get("bio") ?? ""),
              businessHours: String(formData.get("businessHours") ?? ""),
              facebookUrl: String(formData.get("facebookUrl") ?? ""),
              instagramUrl: String(formData.get("instagramUrl") ?? ""),
              priceRange: String(formData.get("priceRange") ?? ""),
              amenities: String(formData.get("amenities") ?? ""),
              couponCode: String(formData.get("couponCode") ?? ""),
              creditsBalance: 0,
              status: "Pending",
              logoUrl,
            });
            setSubmitted(true);
          } catch {
            setSubmitError(
              "Something went wrong submitting your application. Please try again."
            );
          } finally {
            setSubmitting(false);
          }
        }}
        className="mt-6 space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Company name
            </label>
            <input
              required
              name="businessName"
              type="text"
              placeholder="e.g. Harbourside Bistro"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Website
            </label>
            <input
              name="website"
              type="url"
              placeholder="https://yourbusiness.co.nz"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contact email
            </label>
            <input
              required
              name="email"
              type="email"
              defaultValue={member?.loginEmail ?? ""}
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
              name="phone"
              type="tel"
              placeholder="021 234 5678"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div ref={addressBoxRef} className="relative">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Business address
          </label>
          <input
            required
            type="text"
            autoComplete="off"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Start typing your street address…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <p className="mt-1 text-xs text-slate-400">
            Used to show your deal to customers nearby.
          </p>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              City
            </label>
            <select
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
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
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="1010"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            About your business{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            name="bio"
            rows={3}
            placeholder="A couple of sentences customers will see on your business profile — what you do, what makes you worth a visit."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Opening hours{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              name="businessHours"
              type="text"
              placeholder="e.g. Mon–Fri 9am–5pm, Sat 10am–2pm"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Facebook{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              name="facebookUrl"
              type="url"
              placeholder="https://facebook.com/yourbusiness"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Instagram{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            name="instagramUrl"
            type="url"
            placeholder="https://instagram.com/yourbusiness"
            className="w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Price range{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <select
              name="priceRange"
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="">Not applicable</option>
              <option value="$">$ — Budget-friendly</option>
              <option value="$$">$$ — Moderate</option>
              <option value="$$$">$$$ — Upmarket</option>
              <option value="$$$$">$$$$ — Premium</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Features &amp; amenities{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              name="amenities"
              type="text"
              placeholder="e.g. Vegan options, Free parking, Wheelchair accessible"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
            <p className="mt-1 text-xs text-slate-400">
              Comma-separated. Use whatever&apos;s relevant — cuisine or
              dietary options for a restaurant, class types for a gym,
              treatments for a spa, and so on.
            </p>
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

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Coupon or referral code{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            name="couponCode"
            type="text"
            placeholder="e.g. PARTNER10"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 sm:max-w-xs"
          />
          <p className="mt-1 text-xs text-slate-400">
            Were you referred by another merchant, or given a promo code at
            an event? Enter it here.
          </p>
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

        {submitError && (
          <p className="text-sm text-ember-600">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 py-3 text-center font-bold text-white shadow-card transition hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
