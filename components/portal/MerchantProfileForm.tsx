"use client";

import { useEffect, useRef, useState } from "react";
import { EyeOffIcon, GlobeIcon } from "@/components/icons";
import AddressAutocompleteField, { findAddressPin } from "@/components/AddressAutocompleteField";
import PhotoGalleryField from "./PhotoGalleryField";
import BusinessHoursEditor from "@/components/BusinessHoursEditor";
import { parseBusinessHours, formatBusinessHoursLines } from "@/lib/businessHours";
import { parseBusinessPhotos } from "@/lib/businessPhotos";
import type { AddressSuggestion } from "@/lib/googlePlaces";
import { trackMetaPixelEvent } from "@/lib/metaPixel";
import { getAttribution, getFbc, getFbp } from "@/lib/attribution";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton", "Other"];
const MIN_BIO_LENGTH = 50;
const MAX_BIO_LENGTH = 600;

function RequiredTag() {
  return <span className="ml-1 font-normal text-ember-600">Required</span>;
}

function OptionalTag() {
  return <span className="ml-1 font-normal text-slate-500">(optional)</span>;
}

/** Marks a field that's never shown on the public site: legal name, NZBN,
 *  contact name and phone, postcode and the account email. Everything
 *  else in this form is on the business's public listing
 *  (mapMerchantToBusiness in lib/business.ts is the public set). */
function PrivateTag() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-slate-600">
      <EyeOffIcon className="h-3 w-3" />
      Private
    </span>
  );
}

interface MerchantRecord {
  _id: string;
  businessName?: string;
  contactName?: string;
  contactPhone?: string;
  legalBusinessName?: string;
  nzbn?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  suburb?: string;
  postcode?: string;
  lat?: number | null;
  lng?: number | null;
  bio?: string;
  businessHours?: string;
  bookingUrl?: string;
  bookingEmail?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  priceRange?: string;
  amenities?: string;
  /** Pending / Approved / Suspended. Decides whether an edit costs the
   *  merchant live visibility, which is the only case worth warning about. */
  status?: string;
  logoUrl?: string;
  photos?: string;
  [key: string]: any;
}

export default function MerchantProfileForm({
  merchant,
  onSaved,
  /** Open straight into the editable form instead of the summary.
   *  Set while a listing is still incomplete: the summary is a column of
   *  em-dashes at that point, so making someone read it and press Edit is
   *  a step that shows them nothing. Every field is still pre-filled from
   *  what they gave at signup — this is finishing a listing, not starting
   *  one over. */
  startEditing = false,
  /** No merchant record exists yet — this submission creates one.
   *
   *  Posts to /api/merchants/apply rather than /api/merchants/profile,
   *  because the profile route only ever updates and answers 404 when
   *  there is nothing to update. apply takes exactly the fields this form
   *  already sends, so the same form serves both, and it additionally
   *  requires agreedToTerms, which is why the checkbox below appears only
   *  here: a first application must carry consent, and the server refuses
   *  it otherwise. */
  createMode = false,
  /** Saves the photo set. Supplied only when there's a record to attach
   *  photos to — photos have their own save route, so during createMode
   *  (no record yet) there is nothing for them to write to and the field
   *  stays out of the form. */
  onPhotosConfirm,
  photosError,
}: {
  merchant: MerchantRecord;
  onSaved: (updated: MerchantRecord) => void;
  startEditing?: boolean;
  createMode?: boolean;
  onPhotosConfirm?: (photos: string[]) => Promise<void>;
  photosError?: string | null;
}) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [editing, setEditing] = useState(startEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keyed by the same name used in each field's id (e.g. "businessName" for
  // #profile-businessName) — set from the server's per-field validation
  // response so a merchant sees exactly which fields are wrong, not just a
  // single message at the bottom of a long form.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [businessName, setBusinessName] = useState(merchant.businessName || "");
  const [contactName, setContactName] = useState(merchant.contactName || "");
  const [contactPhone, setContactPhone] = useState(merchant.contactPhone || "");
  const [legalBusinessName, setLegalBusinessName] = useState(merchant.legalBusinessName || "");
  const [nzbn, setNzbn] = useState(merchant.nzbn || "");
  const [website, setWebsite] = useState(merchant.website || "");
  const [phone, setPhone] = useState(merchant.phone || "");
  const [address, setAddress] = useState(merchant.address || "");
  const [city, setCity] = useState(merchant.city || "");
  const [suburb, setSuburb] = useState(merchant.suburb || "");
  /** Home-based or mobile: the street stays private (lib/location.ts). */
  const [hideAddress, setHideAddress] = useState(merchant.hideAddress === true);
  const [serviceArea, setServiceArea] = useState(merchant.serviceArea || "");
  const [postcode, setPostcode] = useState(merchant.postcode || "");
  const [lat, setLat] = useState<number | null>(merchant.lat ?? null);
  const [lon, setLon] = useState<number | null>(merchant.lng ?? null);
  const [bio, setBio] = useState(merchant.bio || "");
  const [businessHours, setBusinessHours] = useState(merchant.businessHours || "");
  const [bookingUrl, setBookingUrl] = useState(merchant.bookingUrl || "");
  const [bookingEmail, setBookingEmail] = useState(merchant.bookingEmail || "");
  const [facebookUrl, setFacebookUrl] = useState(merchant.facebookUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(merchant.instagramUrl || "");
  const [priceRange, setPriceRange] = useState(merchant.priceRange || "");
  const [amenities, setAmenities] = useState(merchant.amenities || "");

  // No pin yet (the address was typed or filled in by the browser, not
  // picked from the list): look it up once the street and suburb or city
  // are in, so the map shows for checking before saving. "Near me" and the
  // map need it. A pick from the list, or a dragged pin, always wins.
  const latRef = useRef(lat);
  useEffect(() => {
    latRef.current = lat;
  }, [lat]);
  useEffect(() => {
    if (lat !== null || address.trim().length < 5 || !(suburb.trim() || city)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const place = [address, suburb, city === "Other" ? "" : city, "New Zealand"].map((p) => p.trim()).filter(Boolean).join(", ");
      const pin = await findAddressPin(place);
      if (cancelled || !pin || latRef.current !== null) return;
      setLat(pin.lat ?? null);
      setLon(pin.lon ?? null);
      // Only fills a suburb that's missing or is really the city.
      if (pin.suburb && (!suburb.trim() || suburb.trim().toLowerCase() === city.toLowerCase())) setSuburb(pin.suburb);
      if (pin.postcode && !postcode.trim()) setPostcode(pin.postcode);
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address, suburb, city, postcode, lat]);

  /** The suburb is what customers and searches see ("Glenfield,
   *  Auckland"); the city on its own there says nothing. */
  const suburbIsCity = Boolean(suburb.trim()) && city !== "Other" && suburb.trim().toLowerCase() === city.toLowerCase();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (suburbIsCity) {
      setFieldErrors({ suburb: `Enter your suburb (e.g. Glenfield), not the city.` });
      setError(null);
      document.getElementById("profile-suburb")?.focus();
      return;
    }
    // Checked here as well as server-side so the visitor is told which
    // box is missing, rather than getting a generic 400 back.
    if (createMode && !agreedToTerms) {
      setError("Please agree to the Terms and Conditions to submit your listing.");
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch(createMode ? "/api/merchants/apply" : "/api/merchants/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          contactName,
          contactPhone,
          legalBusinessName,
          nzbn,
          website,
          phone,
          address,
          city,
          suburb,
          hideAddress,
          serviceArea: hideAddress ? serviceArea : "",
          postcode,
          lat,
          lng: lon,
          bio,
          businessHours,
          bookingUrl,
          bookingEmail,
          facebookUrl,
          instagramUrl,
          priceRange,
          amenities,
          // Only sent when creating. The server requires it on a first
          // application and ignores it on an update.
          ...(createMode
            ? {
                agreedToTerms,
                attribution: getAttribution() ?? undefined,
                fbp: getFbp(),
                fbc: getFbc(),
                eventSourceUrl: window.location.href,
              }
            : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const fieldCount = data.fields && typeof data.fields === "object" ? Object.keys(data.fields).length : 0;
        if (fieldCount > 0) {
          setFieldErrors(data.fields);
          // Bring the first problem field into view rather than leaving the
          // merchant to scroll a long form hunting for what's wrong.
          const firstField = Object.keys(data.fields)[0];
          requestAnimationFrame(() => {
            const el = document.getElementById(`profile-${firstField}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          });
        }
        // With more than one bad field, the messages are already shown
        // inline next to each one — repeating them all in a single banner
        // too is redundant, so the banner just points down at them.
        throw new Error(
          fieldCount > 1
            ? `Please fix the ${fieldCount} highlighted fields below.`
            : data.error || "Couldn't save your profile."
        );
      }
      const { item, metaEventId } = await res.json();
      // This is the same conversion the signup form fires
      // CompleteRegistration for — this is the other route that reaches
      // it, via the portal's "finish your signup" recovery screen for an
      // account whose original signup dropped before this step ran.
      // metaEventId only comes back on a genuine first application (see
      // /api/merchants/apply), so this never double-fires on a later edit.
      if (createMode && metaEventId) {
        trackMetaPixelEvent("CompleteRegistration", { content_name: "business_signup" }, metaEventId);
      }
      onSaved(item);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || "Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function errorBorderClass(name: string): string {
    return fieldErrors[name]
      ? "border-red-400 focus:border-red-500"
      : "border-slate-200 focus:border-brand-400";
  }

  // A plain call, not a component: one defined inside this one would be
  // remade on every keystroke.
  function fieldError(name: string) {
    return fieldErrors[name] ? <p className="mt-1 text-xs text-red-600">{fieldErrors[name]}</p> : null;
  }

  const inputClass = (name: string) => `w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass(name)}`;
  const plainInputClass = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  if (!editing) {
    const hours = (() => {
      const parsed = parseBusinessHours(merchant.businessHours);
      if (parsed) return formatBusinessHoursLines(parsed).map((line, i) => <p key={i}>{line}</p>);
      return merchant.businessHours || "—";
    })();
    const photos = parseBusinessPhotos(merchant.photos);
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

        <PublicHeading className="mt-4" />
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <SummaryItem label="Business name" value={merchant.businessName} />
          <SummaryItem label="Website" value={merchant.website} />
          <SummaryItem label="Booking phone number" value={merchant.phone} />
          <SummaryItem label="Booking link" value={merchant.bookingUrl} />
          <SummaryItem label="Booking email" value={merchant.bookingEmail} />
          {merchant.hideAddress ? (
            <>
              <SummaryItem
                label="Location shown"
                value={`${[merchant.suburb, merchant.city].filter(Boolean).join(", ") || "—"} (home-based or mobile: street address kept private)`}
              />
              <SummaryItem label="Areas you cover" value={merchant.serviceArea} />
            </>
          ) : (
            <SummaryItem wide label="Address" value={[merchant.address, merchant.suburb, merchant.city].filter(Boolean).join(", ")} />
          )}
          <SummaryItem label="Opening hours" value={hours} />
          <SummaryItem
            label="Socials"
            value={
              merchant.facebookUrl || merchant.instagramUrl ? (
                <>
                  {merchant.facebookUrl && <p className="break-all">Facebook: {merchant.facebookUrl}</p>}
                  {merchant.instagramUrl && <p className="break-all">Instagram: {merchant.instagramUrl}</p>}
                </>
              ) : null
            }
          />
          <SummaryItem label="Price range" value={merchant.priceRange} />
          <SummaryItem label="Features & amenities" value={merchant.amenities} />
          <SummaryItem wide label="About" value={merchant.bio} />
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Photos</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {photos.length > 0 ? (
                photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url + i} src={url} alt="" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                ))
              ) : (
                <span className="font-medium text-slate-800">—</span>
              )}
            </dd>
          </div>
        </dl>

        <PrivateHeading className="mt-6" />
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <SummaryItem label="Legal / registered company name" value={merchant.legalBusinessName} />
          <SummaryItem label="NZBN" value={merchant.nzbn} />
          <SummaryItem label="Your name" value={merchant.contactName} />
          <SummaryItem label="Your phone" value={merchant.contactPhone} />
          <SummaryItem label="Sign-in email" value={merchant.email} />
          <SummaryItem label="Postcode" value={merchant.postcode} />
        </dl>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">
        {startEditing ? "Your business details" : "Edit business details"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Two parts: what deal hunters see on your listing, and private details only MegaDeal sees,
        used to contact you and check your business.
      </p>
      {/* Only once there's a live listing for a re-review to take down.
          Before approval this warned about a consequence that can't
          happen: a first application is already in the queue, so "sends
          your profile back for review" described the thing the merchant
          was in the middle of doing, and read as a penalty for doing it.
          Suspended is left out for the same reason — nothing of theirs is
          showing publicly, so saving costs them no visibility. */}
      {merchant.status === "Approved" && (
        <p className="mt-1 text-xs text-amber-700">
          ⚠️ Changing your business name, legal name, NZBN or category sends your listing back
          for review, so it comes off the site until we&apos;ve had a look (usually well under a
          day). Phone, address, hours, links and your description save straight away.
        </p>
      )}

      <form onSubmit={handleSave} className="mt-5 space-y-6">
        {/* The public set is mapMerchantToBusiness in lib/business.ts
            (lib/businessPrivacy.test.ts); everything in the private part
            stays off the site. */}
        <section aria-labelledby="profile-public-heading" className="space-y-6 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5">
          <PublicHeading id="profile-public-heading" />

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Name and website</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-businessName" className={labelClass}>
                  Business name (trading as)
                  <RequiredTag />
                </label>
                <input
                  id="profile-businessName"
                  required
                  maxLength={300}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={inputClass("businessName")}
                />
                {fieldError("businessName")}
                <p className="mt-1 text-xs text-slate-500">The name customers know you by, e.g. Harbourside Bistro.</p>
              </div>
              <div>
                <label htmlFor="profile-website" className={labelClass}>
                  Website
                  <OptionalTag />
                </label>
                <input
                  id="profile-website"
                  maxLength={300}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={inputClass("website")}
                />
                {fieldError("website")}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900">Location</h3>
            {/* Google's "service-area business": the address is still
                given (to check the business, and to place it roughly for
                "near me"), but a home or a mobile business's base isn't
                published. */}
            <fieldset>
              <legend className={labelClass}>Do customers come to you at your address?</legend>
              <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { value: false, title: "Yes", text: "A shop, salon, venue, clinic or office customers visit." },
                  { value: true, title: "No", text: "I work from home, or I go to my customers." },
                ].map((o) => (
                  <label
                    key={String(o.value)}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border-2 p-3 text-sm transition focus-within:ring-2 focus-within:ring-brand-400 ${
                      hideAddress === o.value ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hideAddress"
                      checked={hideAddress === o.value}
                      onChange={() => setHideAddress(o.value)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                    />
                    <span>
                      <span className="block font-bold text-slate-900">{o.title}</span>
                      <span className="text-slate-600">{o.text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {hideAddress && (
              <div>
                <label htmlFor="profile-serviceArea" className={labelClass}>
                  Areas you cover
                  <OptionalTag />
                </label>
                <input
                  id="profile-serviceArea"
                  maxLength={200}
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g. North Shore and West Auckland"
                  className={plainInputClass}
                />
                <p className="mt-1 text-xs text-slate-500">Shown on your listing, so customers know if you&apos;ll come to them.</p>
              </div>
            )}
            <AddressAutocompleteField
              id="profile-address"
              address={address}
              onAddressChange={(value) => {
                setAddress(value);
                setLat(null);
                setLon(null);
              }}
              onSelect={(s: AddressSuggestion) => {
                setAddress(s.label || s.street);
                if (s.postcode) setPostcode(s.postcode);
                // Replaced, not kept: a new address may be in another suburb.
                setSuburb(s.suburb ?? "");
                if (s.city) {
                  const match = CITIES.find((c) => c.toLowerCase() === s.city!.toLowerCase());
                  setCity(match ?? "Other");
                }
                setLat(s.lat ?? null);
                setLon(s.lon ?? null);
              }}
              lat={lat}
              lon={lon}
              onPinMove={(newLat, newLng) => {
                setLat(newLat);
                setLon(newLng);
              }}
              helperText={
                [
                  hideAddress
                    ? "Kept private: customers see only your suburb. We use it to check your business and to place you roughly on the map."
                    : "",
                  lat === null
                    ? "Pick your address from the list as you type. If it isn't there, fill in the suburb and city and we'll find it on the map."
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              errorText={fieldErrors.address}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="profile-suburb" className={labelClass}>
                  Suburb
                  <RequiredTag />
                </label>
                {/* Shown to customers ("Glenfield, Auckland") and used in your
                    deal pages' titles, so people searching your area find
                    you. Filled in from the address when it can be. */}
                <input
                  id="profile-suburb"
                  required
                  maxLength={40}
                  autoComplete="address-level3"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="e.g. Glenfield"
                  aria-invalid={Boolean(fieldErrors.suburb || suburbIsCity) || undefined}
                  className={suburbIsCity ? "w-full rounded-xl border border-red-400 px-3 py-2 text-sm outline-none focus:border-red-500" : inputClass("suburb")}
                />
                {suburbIsCity ? (
                  <p className="mt-1 text-xs text-red-600">That&apos;s the city: enter your suburb, e.g. Glenfield.</p>
                ) : (
                  fieldError("suburb")
                )}
              </div>
              <div>
                <label htmlFor="profile-city" className={labelClass}>
                  City
                  <RequiredTag />
                </label>
                <select
                  id="profile-city"
                  required
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${errorBorderClass("city")}`}
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
                {fieldError("city")}
              </div>
              <div>
                <label htmlFor="profile-postcode" className={labelClass}>
                  Postcode
                  <PrivateTag />
                </label>
                <input
                  id="profile-postcode"
                  maxLength={20}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="Optional"
                  className={plainInputClass}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900">How customers book</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-phone" className={labelClass}>
                  Booking phone number
                  <RequiredTag />
                </label>
                <input
                  id="profile-phone"
                  required
                  type="tel"
                  maxLength={300}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 09 123 4567"
                  className={inputClass("phone")}
                />
                {fieldError("phone")}
                <p className="mt-1 text-xs text-slate-500">
                  The number customers call to book, shown on your listing.
                  {/* One tap when it's the same number, without making a
                      private mobile public unless they choose to. */}
                  {contactPhone.trim() && phone.trim() !== contactPhone.trim() && (
                    <>
                      {" "}
                      <button type="button" onClick={() => setPhone(contactPhone)} className="font-semibold text-brand-700 underline hover:no-underline">
                        Use my phone ({contactPhone.trim()})
                      </button>
                    </>
                  )}
                </p>
              </div>
              <div>
                <label htmlFor="profile-bookingUrl" className={labelClass}>
                  Booking link
                  <OptionalTag />
                </label>
                <input
                  id="profile-bookingUrl"
                  maxLength={300}
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  placeholder="Your booking/reservation page, if you have one"
                  className={inputClass("bookingUrl")}
                />
                {fieldError("bookingUrl")}
              </div>
              <div>
                <label htmlFor="profile-bookingEmail" className={labelClass}>
                  Booking email
                  <OptionalTag />
                </label>
                <input
                  id="profile-bookingEmail"
                  type="email"
                  maxLength={300}
                  value={bookingEmail}
                  onChange={(e) => setBookingEmail(e.target.value)}
                  placeholder="bookings@yourbusiness.co.nz"
                  className={inputClass("bookingEmail")}
                />
                {fieldError("bookingEmail")}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900">Opening hours</h3>
            <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900">Description and photos</h3>
            <div>
              <label htmlFor="profile-bio" className={labelClass}>
                About your business
                <RequiredTag />
              </label>
              <textarea
                id="profile-bio"
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                minLength={MIN_BIO_LENGTH}
                maxLength={MAX_BIO_LENGTH}
                rows={3}
                placeholder="A couple of sentences customers will see on your listing — what you do and what makes you worth choosing."
                className={inputClass("bio")}
              />
              {fieldError("bio")}
              <p className="mt-1 text-xs text-slate-500">
                {bio.length < MIN_BIO_LENGTH
                  ? `At least ${MIN_BIO_LENGTH} characters (${MIN_BIO_LENGTH - bio.length} to go)`
                  : `${bio.length}/${MAX_BIO_LENGTH} characters`}
              </p>
            </div>

            {/* Saves on its own (its own save route, and a photo change sends
                the listing back for review), which is why it keeps its own
                confirm step rather than riding along with the main Save. */}
            {onPhotosConfirm && (
              <div>
                <p className={labelClass}>
                  Business photo
                  <RequiredTag />
                </p>
                <PhotoGalleryField
                  photos={parseBusinessPhotos(merchant.photos)}
                  label={merchant.businessName}
                  warningText={
                    merchant.status === "Approved"
                      ? "Changing your photos sends your listing back for review, so it comes off the site until we've had a look. Continue?"
                      : "Save these photos?"
                  }
                  onConfirm={onPhotosConfirm}
                  saveRightAway={merchant.status !== "Approved"}
                />
                {photosError && <p role="alert" className="mt-2 text-sm text-red-600">{photosError}</p>}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900">
              Extras <span className="font-normal text-slate-500">(all optional)</span>
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-priceRange" className={labelClass}>
                  Price range
                </label>
                <select
                  id="profile-priceRange"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
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
                <label htmlFor="profile-amenities" className={labelClass}>
                  Features &amp; amenities
                </label>
                <input
                  id="profile-amenities"
                  maxLength={300}
                  value={amenities}
                  onChange={(e) => setAmenities(e.target.value)}
                  placeholder="e.g. Vegan options, Free parking"
                  className={plainInputClass}
                />
              </div>
              <div>
                <label htmlFor="profile-facebookUrl" className={labelClass}>
                  Facebook
                </label>
                <input
                  id="profile-facebookUrl"
                  maxLength={300}
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/yourbusiness"
                  className={inputClass("facebookUrl")}
                />
                {fieldError("facebookUrl")}
              </div>
              <div>
                <label htmlFor="profile-instagramUrl" className={labelClass}>
                  Instagram
                </label>
                <input
                  id="profile-instagramUrl"
                  maxLength={300}
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourbusiness"
                  className={inputClass("instagramUrl")}
                />
                {fieldError("instagramUrl")}
              </div>
            </div>
          </div>
        </section>

        {/* Private: who to contact, and the legal details that let an admin
            check it's a registered company. The names and email come from
            the sign-up, so they're already filled in. */}
        <section aria-labelledby="profile-private-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <PrivateHeading id="profile-private-heading" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-legalBusinessName" className={labelClass}>
                Legal / registered company name
                <RequiredTag />
              </label>
              <input
                id="profile-legalBusinessName"
                required
                maxLength={300}
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                placeholder="e.g. Harbourside Hospitality Limited"
                className={`bg-white ${inputClass("legalBusinessName")}`}
              />
              {fieldError("legalBusinessName")}
              <p className="mt-1 text-xs text-slate-500">
                As registered with the Companies Office (a New Zealand Limited company).
              </p>
            </div>
            <div>
              <label htmlFor="profile-nzbn" className={labelClass}>
                NZBN
                <OptionalTag />
              </label>
              <input
                id="profile-nzbn"
                value={nzbn}
                onChange={(e) => setNzbn(e.target.value)}
                inputMode="numeric"
                maxLength={13}
                placeholder="13-digit NZBN, if you have one"
                className={`bg-white ${inputClass("nzbn")}`}
              />
              {fieldError("nzbn")}
            </div>
            <div>
              <label htmlFor="profile-contactName" className={labelClass}>
                Your name
                <RequiredTag />
              </label>
              <input
                id="profile-contactName"
                required
                maxLength={300}
                autoComplete="name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={`bg-white ${inputClass("contactName")}`}
              />
              {fieldError("contactName")}
            </div>
            <div>
              <label htmlFor="profile-contactPhone" className={labelClass}>
                Your phone
                <RequiredTag />
              </label>
              <input
                id="profile-contactPhone"
                required
                maxLength={300}
                autoComplete="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                type="tel"
                placeholder="e.g. 021 234 5678"
                className={`bg-white ${inputClass("contactPhone")}`}
              />
              {fieldError("contactPhone")}
              <p className="mt-1 text-xs text-slate-500">So we can reach you about your listing.</p>
            </div>
            {merchant.email && (
              <div className="sm:col-span-2">
                <p className={labelClass}>Sign-in email</p>
                <p className="text-sm font-medium text-slate-800">{merchant.email}</p>
              </div>
            )}
          </div>
        </section>

        {createMode && (
          <div>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                id="profile-agreedToTerms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
              <span>
                I agree to MegaDeal&apos;s{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-brand-700">
                  Terms and Conditions
                </a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-brand-700">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {fieldError("agreedToTerms")}
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving
              ? createMode || startEditing
                ? "Submitting…"
                : "Saving…"
              : createMode || startEditing
                ? "Submit for approval"
                : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/** The two halves of the listing, named the same in the form and the
 *  summary (and like admin's business page). */
function PublicHeading({ id, className = "" }: { id?: string; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <h3 id={id} className="text-base font-bold text-slate-900">
        Your listing
      </h3>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        <GlobeIcon className="h-3.5 w-3.5" /> What deal hunters see
      </span>
    </div>
  );
}

function PrivateHeading({ id, className = "" }: { id?: string; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <h3 id={id} className="text-base font-bold text-slate-900">
        Private details
      </h3>
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
        <EyeOffIcon className="h-3.5 w-3.5" /> Only MegaDeal sees these
      </span>
    </div>
  );
}

function SummaryItem({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}
