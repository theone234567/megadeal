"use client";

import { useEffect, useRef, useState } from "react";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton", "Other"];

interface AddressSuggestion {
  label: string;
  street: string;
  city?: string;
  postcode?: string;
  lat?: number;
  lon?: number;
}

// Free, keyless geocoder (OpenStreetMap-based) used for address suggestions
// as the merchant types — no API key or billing needed. Its response
// already includes coordinates (GeoJSON [lon, lat]), which we keep so the
// business's deal/profile pages can offer a "view map" / "get directions"
// link straight to Google Maps.
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
    const [lon, lat] = f.geometry?.coordinates ?? [];
    return { label, street, city: p.city, postcode: p.postcode, lat, lon };
  });
}

function RequiredTag() {
  return <span className="ml-1 font-normal text-ember-600">Required</span>;
}

function OptionalTag() {
  return <span className="ml-1 font-normal text-slate-400">(optional)</span>;
}

export default function MerchantSignupForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lon, setLon] = useState<number | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressBoxRef = useRef<HTMLDivElement>(null);

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
    setLat(s.lat);
    setLon(s.lon);
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
          We&apos;ve sent a verification email to the address you entered —
          click the link in it to confirm it&apos;s really you. Our merchant
          team will also review your business and be in touch by email
          within a couple of business days to talk through your first deal.
          You can check your application status and deal credits anytime in
          your{" "}
          <a href="/portal" className="font-semibold underline">
            business portal
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div id="signup" className="scroll-mt-36 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h3 className="text-lg font-bold text-slate-900">Sign up your business</h3>
      <p className="mt-1 text-sm text-slate-500">
        Tell us a bit about your business and we&apos;ll be in touch to set up
        your first deal — no account needed to apply. Once we&apos;ve
        approved you, sign in with this same email to manage your listing
        from your business portal.
      </p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitError(null);
          setSubmitting(true);
          try {
            const formData = new FormData(e.currentTarget);
            const res = await fetch("/api/merchants/apply", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                businessName: String(formData.get("businessName") ?? ""),
                website: String(formData.get("website") ?? ""),
                email: String(formData.get("email") ?? ""),
                phone: String(formData.get("phone") ?? ""),
                address,
                city,
                postcode,
                lat,
                lng: lon,
                bio: String(formData.get("bio") ?? ""),
                businessHours: String(formData.get("businessHours") ?? ""),
                bookingUrl: String(formData.get("bookingUrl") ?? ""),
                bookingEmail: String(formData.get("bookingEmail") ?? ""),
                facebookUrl: String(formData.get("facebookUrl") ?? ""),
                instagramUrl: String(formData.get("instagramUrl") ?? ""),
                priceRange: String(formData.get("priceRange") ?? ""),
                amenities: String(formData.get("amenities") ?? ""),
                couponCode: String(formData.get("couponCode") ?? ""),
                website2: String(formData.get("website2") ?? ""),
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || "Something went wrong submitting your application.");
            }
            setSubmitted(true);
          } catch (err: any) {
            setSubmitError(
              err?.message || "Something went wrong submitting your application. Please try again."
            );
          } finally {
            setSubmitting(false);
          }
        }}
        className="mt-6 space-y-6"
      >
        {/* Honeypot — hidden from real visitors via CSS, so only a bot filling every field would set this. */}
        <input
          type="text"
          name="website2"
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          aria-hidden="true"
        />

        {/* Private section — never shown to customers */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h4 className="text-sm font-bold text-slate-700">🔒 Private details</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Only MegaDeal sees this — it&apos;s never shown to customers.
          </p>

          <div className="mt-3 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Contact email
                <RequiredTag />
              </label>
              <input
                required
                name="email"
                type="email"
                placeholder="you@yourbusiness.co.nz"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                Used to sign in to your business portal and for us to contact you.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Postcode
                  <OptionalTag />
                </label>
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="1010"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Referral code
                  <OptionalTag />
                </label>
                <input
                  name="couponCode"
                  type="text"
                  placeholder="e.g. PARTNER10"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Public section — this is your customer-facing profile */}
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          <h4 className="text-sm font-bold text-slate-700">📣 Public business profile</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Shown to customers on your deal pages and business profile.
          </p>

          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Business name
                  <RequiredTag />
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
                  Phone number
                  <RequiredTag />
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
                <RequiredTag />
              </label>
              <input
                required
                type="text"
                autoComplete="off"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setLat(undefined);
                  setLon(undefined);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Start typing your street address…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                Pick a suggestion so we can show customers a map/directions link.
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
                  <RequiredTag />
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
                  Website
                  <OptionalTag />
                </label>
                <input
                  name="website"
                  type="url"
                  placeholder="https://yourbusiness.co.nz"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                About your business
                <OptionalTag />
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
                  Opening hours
                  <OptionalTag />
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
                  Booking link
                  <OptionalTag />
                </label>
                <input
                  name="bookingUrl"
                  type="url"
                  placeholder="Your booking/reservation page, if you have one"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Booking email
                  <OptionalTag />
                </label>
                <input
                  name="bookingEmail"
                  type="email"
                  placeholder="bookings@yourbusiness.co.nz"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Only if you want a different email shown to customers than your
                  contact email above.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Price range
                  <OptionalTag />
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Facebook
                  <OptionalTag />
                </label>
                <input
                  name="facebookUrl"
                  type="url"
                  placeholder="https://facebook.com/yourbusiness"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Instagram
                  <OptionalTag />
                </label>
                <input
                  name="instagramUrl"
                  type="url"
                  placeholder="https://instagram.com/yourbusiness"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Features &amp; amenities
                <OptionalTag />
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
            I understand my business name and address will be displayed
            publicly on the MegaDeal website as part of my deal listing. I
            can add a business photo once my account is set up.
          </span>
        </label>

        {submitError && (
          <p className="text-sm text-ember-600">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 py-3 text-center font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
