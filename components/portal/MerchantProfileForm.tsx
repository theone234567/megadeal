"use client";

import { useState } from "react";
import AddressAutocompleteField from "@/components/AddressAutocompleteField";
import PhotoGalleryField from "./PhotoGalleryField";
import BusinessHoursEditor from "@/components/BusinessHoursEditor";
import { parseBusinessHours, formatBusinessHoursLines } from "@/lib/businessHours";
import { parseBusinessPhotos } from "@/lib/businessPhotos";
import type { AddressSuggestion } from "@/lib/googlePlaces";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton", "Other"];
const MIN_BIO_LENGTH = 50;
const MAX_BIO_LENGTH = 600;

function RequiredTag() {
  return <span className="ml-1 font-normal text-ember-600">Required</span>;
}

function OptionalTag() {
  return <span className="ml-1 font-normal text-slate-500">(optional)</span>;
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
          ...(createMode ? { agreedToTerms } : {}),
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
      const { item } = await res.json();
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

  function FieldError({ name }: { name: string }) {
    return fieldErrors[name] ? <p className="mt-1 text-xs text-red-600">{fieldErrors[name]}</p> : null;
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
            <dt className="text-slate-500">Business name</dt>
            <dd className="font-medium text-slate-800">{merchant.businessName || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Website</dt>
            <dd className="font-medium text-slate-800">{merchant.website || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-800">{merchant.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Booking phone number</dt>
            <dd className="font-medium text-slate-800">{merchant.phone || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Address</dt>
            <dd className="font-medium text-slate-800">
              {[merchant.address, merchant.city, merchant.postcode].filter(Boolean).join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Opening hours</dt>
            <dd className="font-medium text-slate-800">
              {(() => {
                const parsed = parseBusinessHours(merchant.businessHours);
                if (parsed) {
                  return formatBusinessHoursLines(parsed).map((line, i) => <p key={i}>{line}</p>);
                }
                return merchant.businessHours || "—";
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Booking link</dt>
            <dd className="font-medium text-slate-800">{merchant.bookingUrl || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Booking email</dt>
            <dd className="font-medium text-slate-800">{merchant.bookingEmail || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Socials</dt>
            <dd className="font-medium text-slate-800">
              {merchant.facebookUrl || merchant.instagramUrl ? (
                <>
                  {merchant.facebookUrl && (
                    <p className="break-all">Facebook: {merchant.facebookUrl}</p>
                  )}
                  {merchant.instagramUrl && (
                    <p className="break-all">Instagram: {merchant.instagramUrl}</p>
                  )}
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Price range</dt>
            <dd className="font-medium text-slate-800">{merchant.priceRange || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Features &amp; amenities</dt>
            <dd className="font-medium text-slate-800">{merchant.amenities || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">About</dt>
            <dd className="font-medium text-slate-800">{merchant.bio || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Photos</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {parseBusinessPhotos(merchant.photos).length > 0 ? (
                parseBusinessPhotos(merchant.photos).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url + i}
                    src={url}
                    alt=""
                    className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                  />
                ))
              ) : (
                <span className="font-medium text-slate-800">—</span>
              )}
            </dd>
          </div>
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
        Everything you fill in below shows up on your public listing — except your postcode,
        which we keep to ourselves.
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
          ⚠️ Saving changes sends your listing back for review, so it comes off the site
          until we&apos;ve had a look. That&apos;s usually well under a day.
        </p>
      )}

      <form onSubmit={handleSave} className="mt-4 space-y-8">
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Business information</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-businessName" className="mb-1 block text-sm font-medium text-slate-700">
                Business name
                <RequiredTag />
              </label>
              <input
                id="profile-businessName"
                required
                maxLength={300}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("businessName")}`}
              />
              <FieldError name="businessName" />
            </div>
            <div>
              <label htmlFor="profile-website" className="mb-1 block text-sm font-medium text-slate-700">
                Website
                <OptionalTag />
              </label>
              <input
                id="profile-website"
                maxLength={300}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("website")}`}
              />
              <FieldError name="website" />
            </div>
          </div>

          {/* Legal name and NZBN are collected once at signup and don't
              need re-asking here — this block only exists for the
              createMode recovery form (an account whose signup dropped
              before that first save ever happened), where nothing has
              been given yet. */}
          {createMode && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-legalBusinessName" className="mb-1 block text-sm font-medium text-slate-700">
                  Legal / registered business name
                  <RequiredTag />
                </label>
                <input
                  id="profile-legalBusinessName"
                  required
                  maxLength={300}
                  value={legalBusinessName}
                  onChange={(e) => setLegalBusinessName(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("legalBusinessName")}`}
                />
                <FieldError name="legalBusinessName" />
              </div>
              <div>
                <label htmlFor="profile-nzbn" className="mb-1 block text-sm font-medium text-slate-700">
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
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("nzbn")}`}
                />
                <FieldError name="nzbn" />
              </div>
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
            helperText="Pick a suggestion to keep your map location accurate."
            errorText={fieldErrors.address}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-city" className="mb-1 block text-sm font-medium text-slate-700">
                City
                <RequiredTag />
              </label>
              <select
                id="profile-city"
                required
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
              <FieldError name="city" />
            </div>
            <div>
              <label htmlFor="profile-postcode" className="mb-1 block text-sm font-medium text-slate-700">
                Postcode
                <OptionalTag />
              </label>
              <input
                id="profile-postcode"
                maxLength={20}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-priceRange" className="mb-1 block text-sm font-medium text-slate-700">
                Price range
                <OptionalTag />
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
              <label htmlFor="profile-amenities" className="mb-1 block text-sm font-medium text-slate-700">
                Features &amp; amenities
                <OptionalTag />
              </label>
              <input
                id="profile-amenities"
                maxLength={300}
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
                placeholder="e.g. Vegan options, Free parking"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-6">
          <h2 className="text-base font-bold text-slate-900">Contact and booking details</h2>

          {/* Contact name/phone are collected once at signup and don't
              need re-asking here — this block only exists for the
              createMode recovery form (an account whose signup dropped
              before that first save ever happened), where nothing has
              been given yet. */}
          {createMode && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-contactName" className="mb-1 block text-sm font-medium text-slate-700">
                  Contact name
                  <RequiredTag />
                </label>
                <input
                  id="profile-contactName"
                  required
                  maxLength={300}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("contactName")}`}
                />
                <FieldError name="contactName" />
              </div>
              <div>
                <label htmlFor="profile-contactPhone" className="mb-1 block text-sm font-medium text-slate-700">
                  Contact phone
                  <RequiredTag />
                </label>
                <input
                  id="profile-contactPhone"
                  required
                  maxLength={300}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  type="tel"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("contactPhone")}`}
                />
                <FieldError name="contactPhone" />
              </div>
            </div>
          )}

          {/* Grouped with the other two ways a customer gets in touch, and
              named for what it's for. On its own above, labelled "Phone", it
              sat directly under "Contact phone" — two phone fields in a row,
              one private and one published, distinguished by a single word. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-phone" className="mb-1 block text-sm font-medium text-slate-700">
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
                placeholder="The number customers should call to book"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("phone")}`}
              />
              <FieldError name="phone" />
            </div>
            <div>
              <label htmlFor="profile-bookingUrl" className="mb-1 block text-sm font-medium text-slate-700">
                Booking link
                <OptionalTag />
              </label>
              <input
                id="profile-bookingUrl"
                maxLength={300}
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="Your booking/reservation page, if you have one"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("bookingUrl")}`}
              />
              <FieldError name="bookingUrl" />
            </div>
            <div>
              <label htmlFor="profile-bookingEmail" className="mb-1 block text-sm font-medium text-slate-700">
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
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("bookingEmail")}`}
              />
              <FieldError name="bookingEmail" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Socials</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-facebookUrl" className="mb-1 block text-sm font-medium text-slate-700">
                  Facebook
                  <OptionalTag />
                </label>
                <input
                  id="profile-facebookUrl"
                  maxLength={300}
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/yourbusiness"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("facebookUrl")}`}
                />
                <FieldError name="facebookUrl" />
              </div>
              <div>
                <label htmlFor="profile-instagramUrl" className="mb-1 block text-sm font-medium text-slate-700">
                  Instagram
                  <OptionalTag />
                </label>
                <input
                  id="profile-instagramUrl"
                  maxLength={300}
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourbusiness"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("instagramUrl")}`}
                />
                <FieldError name="instagramUrl" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-6">
          <h2 className="text-base font-bold text-slate-900">Opening hours</h2>
          <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-6">
          <h2 className="text-base font-bold text-slate-900">Description and photos</h2>

          <div>
            <label htmlFor="profile-bio" className="mb-1 block text-sm font-medium text-slate-700">
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
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${errorBorderClass("bio")}`}
            />
            <FieldError name="bio" />
            <p className="mt-1 text-xs text-slate-400">
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
              <p className="mb-2 block text-sm font-medium text-slate-700">
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
              />
              {photosError && <p className="mt-2 text-sm text-red-600">{photosError}</p>}
            </div>
          )}
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
            <FieldError name="agreedToTerms" />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

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
