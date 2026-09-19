"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AdminMerchant } from "@/components/admin/MerchantRow";
import BusinessHoursEditor from "@/components/BusinessHoursEditor";
import { parseBusinessHours, formatBusinessHoursLines } from "@/lib/businessHours";

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
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">
        {label}
        {required ? (
          <span className="ml-1 font-normal text-ember-600">Required</span>
        ) : (
          <span className="ml-1 font-normal text-slate-500">(optional)</span>
        )}
      </span>
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // "Forgot password" on the public site currently 404s (see
  // lib/adminResetPassword.ts) — this is the stopgap until that's fixed:
  // set a new password directly and relay it to the business yourself.
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

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

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/merchants/${params.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't delete that business.");
      }
      router.push("/admin");
    } catch (err: any) {
      setDeleteError(err?.message || "Couldn't delete that business.");
      setDeleting(false);
    }
  }

  async function resetPassword() {
    setResettingPassword(true);
    setResetPasswordError(null);
    setNewPassword(null);
    try {
      const res = await fetch(`/api/admin/merchants/${params.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Couldn't reset the password.");
      }
      setNewPassword(data.password);
    } catch (err: any) {
      setResetPasswordError(err?.message || "Couldn't reset the password. Please try again.");
    } finally {
      setResettingPassword(false);
    }
  }

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
        <p className="text-sm text-slate-500">Loading…</p>
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
          {/* Rendered even when empty. A bare {merchant.email} in a <p>
              shows nothing at all when the field is blank, which reads as
              "I forgot to look" rather than "there is no email here" —
              and a merchant with no email on file is exactly the record an
              admin most needs to notice, since there is no way to contact
              them and nothing for an account to link to. */}
          {merchant.email ? (
            <p className="text-sm text-slate-500">
              <a href={`mailto:${merchant.email}`} className="hover:text-brand-700 hover:underline">
                {merchant.email}
              </a>
            </p>
          ) : (
            <p className="text-sm font-semibold text-amber-700">⚠️ No email on file</p>
          )}
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

      <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold text-slate-900">Account access</h2>
        <p className="mt-1 text-xs text-slate-500">
          Stopgap while the site&apos;s own &quot;Forgot password&quot; email link is
          broken. Sets a new password directly — nothing is emailed to the
          business, so you&apos;ll need to pass it on to them yourself.
        </p>
        <button
          onClick={resetPassword}
          disabled={resettingPassword || !merchant.email}
          className="mt-3 rounded-full border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-40"
        >
          {resettingPassword ? "Generating…" : "Generate new password"}
        </button>
        {newPassword && (
          <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3">
            <p className="text-xs font-semibold text-brand-900">
              New password — shown once, won&apos;t be shown again:
            </p>
            <p className="mt-1 select-all font-mono text-base font-bold text-brand-900">
              {newPassword}
            </p>
            <p className="mt-1 text-xs text-brand-700/80">
              This is already set — the business can sign in with it right away.
            </p>
          </div>
        )}
        {resetPasswordError && (
          <p className="mt-2 text-sm text-red-600">{resetPasswordError}</p>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Contact &amp; legal</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business (trading) name" value={businessName} onChange={setBusinessName} required />
            <Field label="Legal / registered business name" value={legalBusinessName} onChange={setLegalBusinessName} required />
            <Field label="NZBN" value={nzbn} onChange={setNzbn} />
            <Field label="Contact name" value={contactName} onChange={setContactName} required />
            <Field label="Contact phone" value={contactPhone} onChange={setContactPhone} required />
            <Field label="Public phone" value={phone} onChange={setPhone} required />
            <Field label="Address" value={address} onChange={setAddress} required />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                City
                <span className="ml-1 font-normal text-ember-600">Required</span>
              </span>
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
            <p className="mt-3 text-xs text-slate-500">
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
            <div className="mb-4">
              {(() => {
                const parsed = parseBusinessHours(businessHours);
                if (!parsed) return null;
                const lines = formatBusinessHoursLines(parsed);
                return (
                  <div className="mb-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">
                    <p className="mb-0.5 font-semibold text-slate-600">
                      Displays to customers as:
                    </p>
                    {lines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                );
              })()}
              <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <dt className="text-slate-500">Code they entered at signup</dt>
              <dd className="font-medium text-slate-800">{merchant.couponCode || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Their code to share (generated)</dt>
              <dd className="font-medium text-slate-800">
                {merchant.referralCode || "—"}
                {merchant.referredBy && ` · Referred by ${merchant.referredBy}`}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Bonus status</dt>
              <dd className="font-medium text-slate-800">
                {merchant.promoRewarded
                  ? "✓ WELCOME6 promo already granted"
                  : merchant.referralRewarded
                  ? "✓ Referral bonus already granted"
                  : "Not yet granted"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Referral-bonus emails</dt>
              <dd className="font-medium text-slate-800">
                {merchant.notifyReferralBonus === false ? "🔕 Opted out" : "Enabled"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Credit &amp; activity history</h2>
          <p className="mt-1 text-xs text-slate-500">
            Every credit grant, adjustment and deal listed by this business —
            the same ledger they see on their own portal. MegaDeal doesn&apos;t
            process any payment itself, so this tracks credit units only,
            not a dollar amount — there&apos;s nothing to show for a
            self-serve credit purchase since that doesn&apos;t exist yet.
          </p>
          {activity === null ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
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
                        <p className="text-xs text-slate-500">
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

      {/* Kept at the very bottom, behind a typed confirmation. Deleting a
          business is irreversible and the usual reason to do it is tidying
          up test accounts — exactly the situation where a misplaced click
          on the wrong row is easiest. Typing the name makes that mistake
          almost impossible without slowing down the real case much. */}
      <section className="mt-8 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-5">
        <h2 className="font-display text-base font-bold text-red-900">Delete this business</h2>
        <p className="mt-1 max-w-xl text-sm text-red-800/80">
          Removes the business record, its drafts and its credit history. Submitted
          deals block the delete — cancel those first. This can&apos;t be undone.
        </p>
        <p className="mt-2 max-w-xl text-xs text-red-800/70">
          Their MegaDeal login isn&apos;t deleted — that lives in Wix Members. They
          can still sign in, and will be asked to start a new application, which is
          what frees the email up for testing again.
        </p>
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 rounded-full border-2 border-red-300 px-5 py-2.5 text-sm font-extrabold text-red-700 transition hover:bg-red-100 active:scale-95"
          >
            Delete business
          </button>
        ) : (
          <div className="mt-4 max-w-md">
            <label htmlFor="confirm-delete" className="block text-sm font-bold text-red-900">
              Type <span className="font-mono">{businessName.trim() || params.id}</span> to confirm
            </label>
            <input
              id="confirm-delete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-red-200 px-3 py-2 text-sm outline-none focus:border-red-400"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={remove}
                // A record with no business name would otherwise compare
                // "" to "" and enable the button with nothing typed —
                // turning the confirmation off in exactly the case the
                // label's fallback text anticipates. Falls back to the id,
                // which is always present and always has to be typed.
                disabled={
                  deleting ||
                  !deleteConfirmText.trim() ||
                  deleteConfirmText.trim() !== (businessName.trim() || params.id)
                }
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
              <button
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                className="rounded-full border-2 border-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-white active:scale-95"
              >
                Cancel
              </button>
            </div>
            {deleteError && <p className="mt-2 text-sm text-red-700">{deleteError}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
