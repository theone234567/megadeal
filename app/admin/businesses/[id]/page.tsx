"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AdminMerchant } from "@/components/admin/MerchantRow";

const STATUSES = ["Pending", "Approved", "Suspended"];
const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton", "Other"];

interface ActivityItem {
  _id: string;
  type: "credit" | "deal";
  amount?: number | null;
  description?: string;
  _createdDate?: string;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
    </label>
  );
}

export default function AdminBusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [merchant, setMerchant] = useState<AdminMerchant | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);

  // Admin controls
  const [status, setStatus] = useState("Pending");
  const [credits, setCredits] = useState(0);
  const [rating, setRating] = useState<number | "">("");
  const [reviewCount, setReviewCount] = useState<number | "">("");

  // Editable profile fields — fixing a typo, a wrong number, etc.
  const [businessName, setBusinessName] = useState("");
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [nzbn, setNzbn] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [amenities, setAmenities] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  function seedFrom(item: AdminMerchant) {
    setStatus(item.status || "Pending");
    setCredits(item.creditsBalance ?? 0);
    setRating(item.rating ?? "");
    setReviewCount(item.reviewCount ?? "");
    setBusinessName(item.businessName || "");
    setLegalBusinessName(item.legalBusinessName || "");
    setNzbn(item.nzbn || "");
    setContactName(item.contactName || "");
    setContactPhone(item.contactPhone || "");
    setPhone(item.phone || "");
    setAddress(item.address || "");
    setCity(item.city || "");
    setPostcode(item.postcode || "");
    setWebsite(item.website || "");
    setBio(item.bio || "");
    setBusinessHours(item.businessHours || "");
    setBookingUrl(item.bookingUrl || "");
    setBookingEmail(item.bookingEmail || "");
    setFacebookUrl(item.facebookUrl || "");
    setInstagramUrl(item.instagramUrl || "");
    setPriceRange(item.priceRange || "");
    setAmenities(item.amenities || "");
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/admin/merchants/${params.id}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.status === 404) {
        if (!cancelled) setNotFound(true);
        return;
      }
      if (!res.ok) {
        if (!cancelled) setLoadError("Couldn't load this business.");
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      const item: AdminMerchant = data.item;
      setMerchant(item);
      seedFrom(item);

      fetch(`/api/admin/merchants/${params.id}/activity`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then(({ items }) => {
          if (!cancelled) setActivity(items ?? []);
        })
        .catch(() => {
          if (!cancelled) setActivity([]);
        });
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  const dirty =
    merchant !== null &&
    (status !== (merchant.status || "Pending") ||
      credits !== (merchant.creditsBalance ?? 0) ||
      rating !== (merchant.rating ?? "") ||
      reviewCount !== (merchant.reviewCount ?? "") ||
      businessName !== (merchant.businessName || "") ||
      legalBusinessName !== (merchant.legalBusinessName || "") ||
      nzbn !== (merchant.nzbn || "") ||
      contactName !== (merchant.contactName || "") ||
      contactPhone !== (merchant.contactPhone || "") ||
      phone !== (merchant.phone || "") ||
      address !== (merchant.address || "") ||
      city !== (merchant.city || "") ||
      postcode !== (merchant.postcode || "") ||
      website !== (merchant.website || "") ||
      bio !== (merchant.bio || "") ||
      businessHours !== (merchant.businessHours || "") ||
      bookingUrl !== (merchant.bookingUrl || "") ||
      bookingEmail !== (merchant.bookingEmail || "") ||
      facebookUrl !== (merchant.facebookUrl || "") ||
      instagramUrl !== (merchant.instagramUrl || "") ||
      priceRange !== (merchant.priceRange || "") ||
      amenities !== (merchant.amenities || ""));

  async function save() {
    if (!merchant) return;
    setSaving(true);
    setSaveError(null);
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
          businessName,
          legalBusinessName,
          nzbn,
          contactName,
          contactPhone,
          phone,
          address,
          city,
          postcode,
          website,
          bio,
          businessHours,
          bookingUrl,
          bookingEmail,
          facebookUrl,
          instagramUrl,
          priceRange,
          amenities,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed.");
      }
      const data = await res.json();
      const updated: AdminMerchant = { ...merchant, ...data.item };
      setMerchant(updated);
      seedFrom(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }
    } catch (err: any) {
      setSaveError(err?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">
          That business couldn&apos;t be found.{" "}
          <a href="/admin" className="font-semibold text-brand-600 hover:underline">
            Back to admin dashboard
          </a>
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-red-600">{loadError}</p>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <a href="/admin" className="text-sm font-medium text-slate-500 hover:text-brand-700">
        ← Back to admin dashboard
      </a>

      <div className="mt-4 flex items-center gap-3">
        {merchant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={merchant.logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-2xl">
            🏪
          </span>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {merchant.businessName || "—"}
          </h1>
          <p className="text-sm text-slate-500">{merchant.email}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {merchant.emailVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            ✓ Email verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            ⏳ Email pending verification
          </span>
        )}
        {!merchant._owner && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
            title="No one has signed in with this business's email yet, so it isn't linked to any account. It'll link automatically the first time they sign in with a matching email."
          >
            ⚠️ Unclaimed account
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-amber-700">
        ⚠️ Editing details here changes the business's live listing directly —
        it does <strong>not</strong> send it back for the business's own
        review, unlike when they edit it themselves from their portal.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Contact &amp; legal</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business (trading) name" value={businessName} onChange={setBusinessName} />
            <Field label="Legal / registered business name" value={legalBusinessName} onChange={setLegalBusinessName} />
            <Field label="NZBN" value={nzbn} onChange={setNzbn} />
            <Field label="Contact name" value={contactName} onChange={setContactName} />
            <Field label="Contact phone" value={contactPhone} onChange={setContactPhone} />
            <Field label="Public phone" value={phone} onChange={setPhone} />
            <Field label="Address" value={address} onChange={setAddress} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">City</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
              >
                <option value="">—</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Postcode" value={postcode} onChange={setPostcode} />
            <Field label="Website" value={website} onChange={setWebsite} placeholder="https://yourbusiness.co.nz" />
          </div>
          {typeof merchant.lat === "number" && typeof merchant.lng === "number" && (
            <p className="mt-3 text-xs text-slate-400">
              📍 Map pin: {merchant.lat.toFixed(5)}, {merchant.lng.toFixed(5)} (set by the
              business's own address autocomplete — edit their address from the portal to move it)
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Public profile</h2>
          <div className="mt-3 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">About</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Opening hours" value={businessHours} onChange={setBusinessHours} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Price range</span>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                >
                  <option value="">Not applicable</option>
                  <option value="$">$ — Budget-friendly</option>
                  <option value="$$">$$ — Moderate</option>
                  <option value="$$$">$$$ — Upmarket</option>
                  <option value="$$$$">$$$$ — Premium</option>
                </select>
              </label>
              <Field label="Features & amenities" value={amenities} onChange={setAmenities} />
              <Field label="Booking link" value={bookingUrl} onChange={setBookingUrl} />
              <Field label="Booking email" value={bookingEmail} onChange={setBookingEmail} type="email" />
              <Field label="Facebook" value={facebookUrl} onChange={setFacebookUrl} placeholder="https://facebook.com/yourbusiness" />
              <Field label="Instagram" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/yourbusiness" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Referral &amp; promo</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">Entered referral/promo code</dt>
              <dd className="font-medium text-slate-800">{merchant.couponCode || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Their own referral code</dt>
              <dd className="font-medium text-slate-800">
                {merchant.referralCode || "—"}
                {merchant.referredBy && ` · Referred by ${merchant.referredBy}`}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Bonus status</dt>
              <dd className="font-medium text-slate-800">
                {merchant.promoRewarded
                  ? "✓ WELCOME3 promo already granted"
                  : merchant.referralRewarded
                  ? "✓ Referral bonus already granted"
                  : "Not yet granted"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Referral-bonus emails</dt>
              <dd className="font-medium text-slate-800">
                {merchant.notifyReferralBonus === false ? "🔕 Opted out" : "Enabled"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Credit &amp; activity history</h2>
          <p className="mt-1 text-xs text-slate-400">
            Every credit grant, adjustment and deal listed by this business —
            the same ledger they see on their own portal. MegaDeal doesn&apos;t
            process any payment itself, so this tracks credit units only,
            not a dollar amount — there&apos;s nothing to show for a
            self-serve credit purchase since that doesn&apos;t exist yet.
          </p>
          {activity === null ? (
            <p className="mt-3 text-sm text-slate-400">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {activity.map((item) => (
                <li key={item._id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span aria-hidden>{item.type === "credit" ? "💳" : "📋"}</span>
                    <div>
                      <p className="text-slate-700">{item.description}</p>
                      {item._createdDate && (
                        <p className="text-xs text-slate-400">
                          {new Date(item._createdDate).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {item.type === "credit" && typeof item.amount === "number" && item.amount !== 0 && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                        item.amount > 0 ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.amount > 0 ? `+${item.amount}` : item.amount}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Admin controls</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Credits</span>
              <input
                type="number"
                min={0}
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Rating</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={rating}
                onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="★"
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Reviews</span>
              <input
                type="number"
                min={0}
                value={reviewCount}
                onChange={(e) => setReviewCount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="#"
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </label>
          </div>

          <button
            onClick={save}
            disabled={!dirty || saving}
            className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </button>
          {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
          {warnings.map((w, i) => (
            <p key={i} className="mt-2 max-w-md text-sm text-amber-600">
              ⚠️ {w}
            </p>
          ))}
        </section>
      </div>
    </main>
  );
}
