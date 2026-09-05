"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { registerMember, submitVerificationCode, type AuthOutcome } from "@/lib/wixAuth";
import AddressAutocompleteField from "@/components/AddressAutocompleteField";
import type { AddressSuggestion } from "@/lib/googlePlaces";
import { trackMetaPixelEvent } from "@/lib/metaPixel";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton", "Other"];

function RequiredTag() {
  return <span className="ml-1 font-normal text-ember-600">Required</span>;
}

function OptionalTag() {
  return <span className="ml-1 font-normal text-slate-400">(optional)</span>;
}

/** Submits everything the /businesses form collected to create (or claim)
 *  the business application — called only once the account itself exists
 *  and, if Wix required it, its email is verified. */
async function submitApplication(formEl: HTMLFormElement, extra: {
  address: string;
  city: string;
  postcode: string;
  lat: number | null;
  lon: number | null;
}) {
  const formData = new FormData(formEl);
  const res = await fetch("/api/merchants/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: String(formData.get("businessName") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      legalBusinessName: String(formData.get("legalBusinessName") ?? ""),
      nzbn: String(formData.get("nzbn") ?? ""),
      website: String(formData.get("website") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      address: extra.address,
      city: extra.city,
      postcode: extra.postcode,
      lat: extra.lat,
      lng: extra.lon,
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
      agreedToTerms: formData.get("agreedToTerms") === "on",
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Your account was created, but we couldn't save your business details. Please contact us so we can sort it out.");
  }
}

export default function MerchantSignupForm() {
  const { client } = useWix();
  const searchParams = useSearchParams();
  const referralPrefill = searchParams.get("ref") || "";
  const formRef = useRef<HTMLFormElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Set once Wix comes back with EMAIL_VERIFICATION_REQUIRED — the rest of
  // the form stays filled in underneath while this is shown, nothing is
  // lost, the verification code just has to clear before the application
  // itself gets submitted.
  const [pendingState, setPendingState] = useState<unknown>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");

  function applyAddressSuggestion(s: AddressSuggestion) {
    setAddress(s.label || s.street);
    if (s.postcode) setPostcode(s.postcode);
    if (s.city) {
      const match = CITIES.find((c) => c.toLowerCase() === s.city!.toLowerCase());
      setCity(match ?? "Other");
    }
    setLat(s.lat ?? null);
    setLon(s.lon ?? null);
  }

  async function finishAfterAuth() {
    if (!formRef.current) return;
    await submitApplication(formRef.current, { address, city, postcode, lat, lon });
    // The real conversion event for business-recruitment ad campaigns — a
    // completed application, not just a click or an email signup.
    trackMetaPixelEvent("CompleteRegistration", { content_name: "business_signup" });
    window.location.href = "/portal";
  }

  async function handleOutcome(outcome: AuthOutcome) {
    if (outcome.status === "success") {
      await finishAfterAuth();
    } else if (outcome.status === "verify") {
      setPendingState(outcome.pendingState);
      setPendingEmail(outcome.email);
    } else {
      setSubmitError(outcome.message);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const formData = new FormData(e.currentTarget);

    // Honeypot — hidden from real visitors via CSS, so only a bot filling
    // every field would set this. Pretend to succeed either way so a bot
    // isn't tipped off it was caught.
    if (String(formData.get("website2") ?? "").trim() !== "") {
      setSubmitting(true);
      return;
    }

    const email = String(formData.get("email") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();

    if (password.length < 8) {
      setSubmitError("Your password needs to be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Those passwords don't match.");
      return;
    }
    if (!agreedToTerms) {
      setSubmitError("You must agree to the Terms and Conditions to apply.");
      return;
    }

    setSubmitting(true);
    try {
      const outcome = await registerMember(client, email, password, businessName);
      await handleOutcome(outcome);
    } catch (err: any) {
      setSubmitError(err?.message || "Something went wrong submitting your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const outcome = await submitVerificationCode(client, code, pendingState);
      if (outcome.status === "success") {
        await finishAfterAuth();
      } else if (outcome.status === "error") {
        setSubmitError(outcome.message);
      } else {
        setSubmitError("That code isn't right — check your email and try again.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "That code isn't right. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingState) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
        <h3 className="text-lg font-bold text-brand-800">Almost there — check your email</h3>
        <p className="mt-2 text-sm text-brand-700">
          We&apos;ve sent a verification code to <strong>{pendingEmail}</strong>. Enter it below to
          finish creating your account.
        </p>
        <form onSubmit={handleVerifySubmit} className="mt-4 max-w-xs space-y-3">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Verification code"
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm tracking-widest outline-none focus:border-brand-400"
          />
          {submitError && <p className="text-sm text-ember-600">{submitError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Verify & finish signing up"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div id="signup" className="scroll-mt-36 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h3 className="text-lg font-bold text-slate-900">Sign up your business</h3>
      <p className="mt-1 text-sm text-slate-500">
        Create your account and tell us about your business in one go — you&apos;ll land straight in
        your business portal, ready to go the moment we approve you.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-6">
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
          <h4 className="text-sm font-bold text-slate-700">🔒 Account &amp; private details</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Kept private — never shown to customers.
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
                autoComplete="email"
                placeholder="you@yourbusiness.co.nz"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                This becomes your login for the business portal.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Contact name
                  <RequiredTag />
                </label>
                <input
                  required
                  name="contactName"
                  type="text"
                  placeholder="Full name of the person we should deal with"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Contact phone
                  <RequiredTag />
                </label>
                <input
                  required
                  name="contactPhone"
                  type="tel"
                  placeholder="Direct number for that person"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Legal / registered business name
                  <RequiredTag />
                </label>
                <input
                  required
                  name="legalBusinessName"
                  type="text"
                  placeholder="e.g. Harbourside Bistro Limited"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  The registered entity behind your business — sole trader,
                  partnership or company, whichever applies.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  NZBN
                  <OptionalTag />
                </label>
                <input
                  name="nzbn"
                  type="text"
                  inputMode="numeric"
                  placeholder="13-digit New Zealand Business Number, if you have one"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                  <RequiredTag />
                </label>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Confirm password
                  <RequiredTag />
                </label>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Same password again"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Encrypted and verified by our secure account provider — MegaDeal never sees or
              stores your password.
            </p>

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
                  Referral or promo code
                  <OptionalTag />
                </label>
                <input
                  name="couponCode"
                  type="text"
                  defaultValue={referralPrefill || "WELCOME3"}
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

            <AddressAutocompleteField
              address={address}
              onAddressChange={(value) => {
                setAddress(value);
                setLat(null);
                setLon(null);
              }}
              onSelect={applyAddressSuggestion}
              lat={lat}
              lon={lon}
              onPinMove={(newLat, newLng) => {
                setLat(newLat);
                setLon(newLng);
              }}
            />

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

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            required
            type="checkbox"
            name="agreedToTerms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
          />
          <span>
            I agree to MegaDeal&apos;s{" "}
            <a href="/terms" target="_blank" className="font-semibold underline hover:text-brand-700">
              Terms and Conditions
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" className="font-semibold underline hover:text-brand-700">
              Privacy Policy
            </a>
            .
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
          {submitting ? "Submitting…" : "Create account & submit application"}
        </button>

        <p className="text-center text-sm text-slate-500 sm:text-left">
          Already applied?{" "}
          <a href="/portal" className="font-semibold text-brand-600 hover:underline">
            Sign in to your business portal
          </a>
        </p>
      </form>
    </div>
  );
}
