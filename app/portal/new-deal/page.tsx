"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { uploadPhoto } from "@/lib/imageUpload";
import { CATEGORIES } from "@/lib/categories";

const DURATIONS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "2 months", days: 60 },
  { label: "3 months", days: 90 },
];

const FLASH_DURATIONS = [
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
];

interface MerchantRecord {
  _id: string;
  status?: string;
  creditsBalance?: number;
}

function NewDealForm() {
  const { isLoggedIn, member, login, client } = useWix();
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");

  const [merchant, setMerchant] = useState<MerchantRecord | null | undefined>(undefined);
  const [duplicatedFrom, setDuplicatedFrom] = useState(false);

  const [dealName, setDealName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [terms, setTerms] = useState("");
  const [priceNow, setPriceNow] = useState("");
  const [priceWas, setPriceWas] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [isFlash, setIsFlash] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [quantityAvailable, setQuantityAvailable] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [step, setStep] = useState<"form" | "preview">("form");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member === undefined) return;
    if (!isLoggedIn) {
      setMerchant(null);
      return;
    }
    fetch("/api/merchants/me")
      .then((res) => (res.ok ? res.json() : { item: null }))
      .then(({ item }) => setMerchant(item ?? null))
      .catch(() => setMerchant(null));
  }, [member, isLoggedIn]);

  // Prefill from an existing deal when arriving via "Duplicate this deal".
  // Only the fields stored directly on the Deals record carry over — category
  // and photo live on the linked Wix Store product, so those are re-picked.
  useEffect(() => {
    if (!duplicateId || !merchant) return;
    (client as any).items
      .get("Deals", duplicateId)
      .then((original: any) => {
        if (!original || original.merchantEmail !== member?.email) return;
        setDealName(original.dealName || "");
        setDescription(original.description || "");
        setTerms(original.terms || "");
        setPriceNow(original.priceNow !== undefined ? String(original.priceNow) : "");
        setPriceWas(
          original.priceWas && original.priceWas !== original.priceNow
            ? String(original.priceWas)
            : ""
        );
        setIsFlash(Boolean(original.isFlash));
        setQuantityAvailable(
          original.quantityAvailable !== undefined && original.quantityAvailable !== null
            ? String(original.quantityAvailable)
            : ""
        );
        setDuplicatedFrom(true);
      })
      .catch(() => {
        // Not fatal — the merchant just starts from a blank form instead.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicateId, merchant]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function handleContinueToPreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const uploaded = photo ? await uploadPhoto(photo) : null;
      const res = await fetch("/api/deals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealName,
          category,
          description,
          terms,
          priceNow: Number(priceNow),
          priceWas: priceWas ? Number(priceWas) : undefined,
          isFlash,
          ...(isFlash ? { durationMinutes } : { durationDays }),
          quantityAvailable: quantityAvailable ? Number(quantityAvailable) : undefined,
          photoUrl: uploaded?.url || "",
          photoMediaId: uploaded?.id || "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong submitting your deal.");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong submitting your deal.");
    } finally {
      setSubmitting(false);
    }
  }

  if (member === undefined || merchant === undefined) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Create a deal</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to your merchant account to create a deal. Only your own
          account can create deals on it.
        </p>
        <button
          onClick={() => login("/portal/new-deal")}
          className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700"
        >
          Sign in
        </button>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-slate-600">
          You don&apos;t have a business application on file yet.
        </p>
        <Link
          href="/merchants#signup"
          className="mt-4 inline-block rounded-full bg-ember-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-600"
        >
          Sign up your business
        </Link>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <span className="text-4xl">🎉</span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Deal submitted!</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your deal is now <strong>Pending Approval</strong>. We&apos;ll review
          it and create your live listing shortly — you can track its status
          anytime in your portal.
        </p>
        <Link
          href="/portal"
          className="mt-6 inline-block rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card hover:bg-brand-700"
        >
          Back to portal
        </Link>
      </main>
    );
  }

  const credits = merchant.creditsBalance ?? 0;

  if (credits < 1) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <span className="text-4xl">💳</span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">No deal credits left</h1>
        <p className="mt-2 text-sm text-slate-600">
          Creating a deal uses 1 credit. Contact us to top up your account.
        </p>
        <Link
          href="/portal"
          className="mt-6 inline-block rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Back to portal
        </Link>
      </main>
    );
  }

  if (step === "preview") {
    const discountPercent =
      priceWas && Number(priceWas) > Number(priceNow) && Number(priceNow) > 0
        ? Math.round(((Number(priceWas) - Number(priceNow)) / Number(priceWas)) * 100)
        : 0;
    const categoryDef = CATEGORIES.find((c) => c.name === category);
    const durationLabel = isFlash
      ? FLASH_DURATIONS.find((d) => d.minutes === durationMinutes)?.label
      : DURATIONS.find((d) => d.days === durationDays)?.label;

    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setStep("form")}
          className="text-sm text-slate-500 hover:text-brand-700"
        >
          ← Back to edit
        </button>

        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Preview your deal</h1>
        <p className="mt-1 text-sm text-slate-500">
          This is how your deal card will look to customers. Check everything looks right,
          then submit it for review.
        </p>

        <div className="mt-6 max-w-xs">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <span className="text-4xl">🏷️</span>
                </div>
              )}
              <div className="absolute left-2 top-2 flex flex-col gap-1">
                {isFlash && (
                  <span className="inline-block animate-flash-zap rounded-full bg-brand-600 px-2.5 py-1 text-xs font-extrabold text-white shadow">
                    ⚡ FLASH
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="rounded-full bg-ember-500 px-2.5 py-1 text-xs font-extrabold text-white shadow">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <div className="absolute bottom-2 left-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
                  ⏱ Live for {durationLabel || "—"}
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              {category && (
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {categoryDef ? `${categoryDef.emoji} ${category}` : category}
                </span>
              )}
              <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-slate-900">
                {dealName || "Your deal name"}
              </h3>
              <div className="mt-auto flex items-end justify-between pt-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-slate-900">
                    ${priceNow || "0"}
                  </span>
                  {priceWas && Number(priceWas) > Number(priceNow) && (
                    <span className="text-sm text-slate-400 line-through">${priceWas}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            Preview — not yet submitted
          </p>
        </div>

        <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-700 shadow-card">
          <div>
            <p className="font-semibold text-slate-900">Description</p>
            <p className="mt-1 whitespace-pre-wrap">{description}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Terms &amp; conditions</p>
            <p className="mt-1 whitespace-pre-wrap">{terms}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Duration: {durationLabel}
              {isFlash ? " (flash deal)" : ""}
            </span>
            {quantityAvailable && <span>Quantity: {quantityAvailable}</span>}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="rounded-full border border-slate-200 px-6 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            ← Back to edit
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-brand-600 px-8 py-3 text-center text-sm font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 disabled:opacity-60 sm:ml-auto"
          >
            {submitting ? "Submitting…" : "Submit deal for approval"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/portal" className="text-sm text-slate-500 hover:text-brand-700">
        ← Back to portal
      </Link>

      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Create a deal</h1>
      <p className="mt-1 text-sm text-slate-500">
        This will use 1 of your {credits} deal credit{credits === 1 ? "" : "s"}.
        Your deal goes live once we&apos;ve reviewed it.
      </p>
      {duplicatedFrom && (
        <p className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          Prefilled from your previous deal — just re-pick the category and
          photo below, then everything else is ready to go.
        </p>
      )}

      <form onSubmit={handleContinueToPreview} className="mt-6 space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Deal name</label>
          <input
            required
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
            placeholder="e.g. 60-Minute Massage + Facial"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="" disabled>
              Choose a category…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.name}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's included, how to redeem, anything customers should know."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Deal price ($)</label>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={priceNow}
              onChange={(e) => setPriceNow(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Original price ($) <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={priceWas}
              onChange={(e) => setPriceWas(e.target.value)}
              placeholder="Shown crossed out"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={isFlash}
              onChange={(e) => setIsFlash(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            <span>
              <span className="block text-sm font-bold text-slate-900">⚡ Make this a Flash Deal</span>
              <span className="block text-xs text-slate-500">
                Short burst offer (minutes to hours) — great for filling quiet
                spots, e.g. &quot;2-for-1 tonight only&quot;. Shows an animated FLASH badge.
              </span>
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Duration</label>
            {isFlash ? (
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
              >
                {FLASH_DURATIONS.map((d) => (
                  <option key={d.minutes} value={d.minutes}>
                    {d.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
              >
                {DURATIONS.map((d) => (
                  <option key={d.days} value={d.days}>
                    {d.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Quantity available <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              value={quantityAvailable}
              onChange={(e) => setQuantityAvailable(e.target.value)}
              placeholder="e.g. 50"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Photo</label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-300">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl">🏷️</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="block text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Terms &amp; conditions</label>
          <textarea
            required
            rows={3}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="e.g. First in, first served — limited to 50 redemptions. Valid 3 months from when the deal goes live. Not valid with other offers."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-full bg-brand-600 py-3 text-center font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 sm:w-auto sm:px-8"
        >
          Preview deal →
        </button>
      </form>
    </main>
  );
}

export default function NewDealPage() {
  return (
    <Suspense fallback={null}>
      <NewDealForm />
    </Suspense>
  );
}
