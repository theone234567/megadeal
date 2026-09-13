"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { uploadPhoto } from "@/lib/imageUpload";
import { CATEGORIES } from "@/lib/categories";
import { parseDraft, MAX_DRAFT_TEXT } from "@/lib/dealDraft";
import { STANDARD_TERMS, renderTerms } from "@/lib/dealTerms";
import { buildPreviewDeal } from "@/lib/previewDeal";
import DealCard from "@/components/DealCard";
import DealDetail from "@/app/deal/[slug]/DealDetail";
import MerchantLoginForm from "@/components/portal/MerchantLoginForm";

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
  /** /api/merchants/me returns the whole record, and the preview reads the
   *  business fields (booking link, hours, address, socials) straight off
   *  it so the merchant sees the same panel customers will. */
  [key: string]: any;
}

export default function NewDealForm({ siteLaunched }: { siteLaunched: boolean }) {
  const { isLoggedIn, member } = useWix();
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");

  const [merchant, setMerchant] = useState<MerchantRecord | null | undefined>(undefined);
  const [duplicatedFrom, setDuplicatedFrom] = useState(false);

  const [dealName, setDealName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  /** Which standard conditions are ticked, plus anything specific the
   *  merchant adds. These two render into the single `terms` string the
   *  deal record and the public page have always used. */
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [customTerms, setCustomTerms] = useState("");
  const terms = renderTerms(selectedTerms, customTerms);
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

  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  /** Set once a draft exists server-side, so every later save updates that
   *  row instead of leaving a trail of near-identical drafts behind. */
  const [draftId, setDraftId] = useState<string | null>(searchParams.get("draft"));
  /** The draft id we arrived with, captured once. Restoring must not key
   *  off `draftId`, because saving sets that — the effect would refire the
   *  moment a new draft was created and overwrite the form with the row it
   *  had just written, losing anything typed during the round-trip. */
  const [openedDraftId] = useState<string | null>(() => searchParams.get("draft"));
  const restoredRef = useRef(false);
  /** A photo already uploaded — either restored from a draft or uploaded
   *  when one was saved. `photo` holds a newly picked File that hasn't been
   *  sent anywhere yet; this holds the Wix Media URL once it has. */
  const [uploaded, setUploaded] = useState<{ url: string; id: string } | null>(null);

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
    // Server-side, which also moves the ownership check off the client.
    // Comparing merchantEmail in the page decided what to *show*; by then
    // the record had already been handed to the browser. The route refuses
    // to send someone else's deal at all.
    fetch(`/api/deals/${duplicateId}`)
      .then((res) => (res.ok ? res.json() : { item: null }))
      .then(({ item: original }: any) => {
        if (!original) return;
        setDealName(original.dealName || "");
        setDescription(original.description || "");
        // An existing deal stores terms as one rendered string, with no
        // record of which boxes produced it, so it comes back as custom text.
        setCustomTerms(original.terms || "");
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

  // Reopen a saved draft, arriving as ?draft=<id> from the portal. Never
  // alongside "Duplicate this deal" — the two prefill paths would race and
  // whichever landed second would win silently.
  useEffect(() => {
    if (!openedDraftId || duplicateId || restoredRef.current) return;
    restoredRef.current = true;
    let cancelled = false;
    fetch(`/api/deals/${openedDraftId}`)
      .then((res) => (res.ok ? res.json() : { item: null }))
      .then(({ item }) => {
        if (cancelled || !item) return;
        const draft = parseDraft(item);
        setDealName(draft.dealName);
        setCategory(draft.category);
        setDescription(draft.description);
        setSelectedTerms(draft.selectedTerms);
        setCustomTerms(draft.customTerms);
        setPriceNow(draft.priceNow);
        setPriceWas(draft.priceWas);
        setDurationDays(draft.durationDays);
        setIsFlash(draft.isFlash);
        setDurationMinutes(draft.durationMinutes);
        setQuantityAvailable(draft.quantityAvailable);
        // The photo comes back too, which the old local drafts could never
        // do — a File can't be serialised, so restoring one always meant
        // hunting for the image again.
        if (draft.photoUrl) {
          setUploaded({ url: draft.photoUrl, id: draft.photoMediaId });
          setPhotoPreview(draft.photoUrl);
        }
        setDraftRestored(true);
      })
      .catch(() => {
        // Nothing to restore — the form is simply blank, which is a fine
        // place to start from.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedDraftId, duplicateId]);

  useEffect(() => {
    // No new file: fall back to whatever is already uploaded — a reopened
    // draft has a photo but no File. Clearing the input has to land here
    // too, or the preview keeps pointing at a blob URL that has just been
    // revoked, which renders as a broken image.
    if (!photo) {
      setPhotoPreview(uploaded?.url ?? null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo, uploaded]);

  function handleContinueToPreview(e: React.FormEvent) {
    e.preventDefault();
    // Caught before the preview rather than on submit. The preview exists to
    // show the merchant their deal as customers will see it, and the photo
    // is most of that — previewing a card with an empty image well would
    // misrepresent the thing they're being asked to approve.
    // Either a file just picked, or one already uploaded with a reopened
    // draft — a restored draft has a photo but no File, and rejecting it
    // would demand the merchant re-pick an image already on screen.
    if (!photo && !uploaded) {
      setError("Add a photo before you preview — it's the main image customers see.");
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }
    // The textarea is no longer `required` — most deals are now described
    // entirely by tick-boxes and never touch it — so nothing native is
    // left enforcing that terms exist at all.
    if (!terms) {
      setError("Tick at least one condition, or write your own terms.");
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }
    setError(null);
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Saves the deal as it stands, server-side, so it survives a closed
   *  browser, a cleared cache and a different device — none of which the
   *  old localStorage draft did. Also used pre-launch, when submissions
   *  aren't being accepted yet, so a merchant's work isn't lost between
   *  now and launch day.
   *
   *  Deliberately does not require a complete form: a draft is unfinished
   *  by definition, and refusing to save one for a missing price would
   *  defeat the point of having drafts. */
  async function saveDraft() {
    setSavingDraft(true);
    setError(null);
    try {
      // The photo has to become a real URL before the draft can hold it —
      // this is what makes a restored draft keep its image.
      let media = uploaded;
      if (photo && !media) {
        media = await uploadPhoto(photo);
        setUploaded(media);
      }

      const res = await fetch("/api/deals/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          draft: {
            dealName,
            category,
            description,
            terms,
            priceNow,
            priceWas,
            durationDays,
            isFlash,
            durationMinutes,
            quantityAvailable,
            selectedTerms,
            customTerms,
            photoUrl: media?.url || "",
            photoMediaId: media?.id || "",
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save your draft.");
      }
      const { item } = await res.json();
      // Held on to so the next save updates this draft rather than
      // creating another one beside it.
      if (item?._id) setDraftId(item._id);
      setDraftSaved(true);
    } catch (err: any) {
      setError(err?.message || "Couldn't save your draft. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      // Reuses the already-uploaded image where there is one: a draft
      // reopened from the portal has a photo but no File, and re-uploading
      // on every submit would also leave a duplicate in the media library
      // each time.
      let media = uploaded;
      if (photo && !media) {
        media = await uploadPhoto(photo);
        setUploaded(media);
      }
      const res = await fetch("/api/deals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          dealName,
          category,
          description,
          terms,
          priceNow: Number(priceNow),
          priceWas: priceWas ? Number(priceWas) : undefined,
          isFlash,
          ...(isFlash ? { durationMinutes } : { durationDays }),
          quantityAvailable: quantityAvailable ? Number(quantityAvailable) : undefined,
          photoUrl: media?.url || "",
          photoMediaId: media?.id || "",
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
          Sign in to your business account to create a deal. Only your own
          account can create deals on it.
        </p>
        <MerchantLoginForm redirectTo="/portal/new-deal" />
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
          href="/list-your-business#signup"
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
    const categoryDef = CATEGORIES.find((c) => c.name === category);
    const previewDeal = buildPreviewDeal(
      {
        dealName,
        description,
        terms,
        category,
        priceNow,
        priceWas,
        quantityAvailable,
        isFlash,
        durationDays,
        durationMinutes,
        imageUrl: photoPreview,
      },
      merchant
    );
    const durationLabel = isFlash
      ? FLASH_DURATIONS.find((d) => d.minutes === durationMinutes)?.label
      : DURATIONS.find((d) => d.days === durationDays)?.label;

    // Not wrapped in <main>: DealDetail below renders the real page, main
    // landmark and h1 included, and nesting a second set inside it would
    // be invalid and leave two of each. The banner is chrome around the
    // real thing rather than a page of its own.
    return (
      <div className="pb-10">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="rounded-full border-2 border-slate-200 px-4 py-1.5 text-sm font-extrabold text-slate-600 transition hover:border-brand-300 hover:text-brand-700 active:scale-95"
            >
              ← Back to edit
            </button>
            <span className="rounded-full bg-ember-500 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white shadow-sm">
              👀 Preview
            </span>
            <p className="w-full text-xs font-semibold text-slate-500 sm:w-auto">
              Exactly what customers see. Anything missing here is missing at launch.
            </p>
          </div>
        </div>

        {/* Full width, matching the live page. Constrained to the form's
            column it showed the desktop two-column layout crammed into
            half the space, which is the opposite of what a preview is
            for. */}
        <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-600">
            On the deals page
          </p>
          <div className="max-w-xs">
            <DealCard deal={previewDeal} preview />
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-2">
          <DealDetail deal={previewDeal} relatedDeals={[]} preview />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <div>
            <dt className="text-slate-500">Category</dt>
            <dd className="font-semibold text-slate-800">
              {categoryDef ? `${categoryDef.emoji} ${categoryDef.name}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Runs for</dt>
            <dd className="font-semibold text-slate-800">
              {durationLabel}
              {isFlash ? " (flash deal)" : ""}
            </dd>
          </div>
          {quantityAvailable && (
            <div>
              <dt className="text-slate-500">Quantity</dt>
              <dd className="font-semibold text-slate-800">{quantityAvailable}</dd>
            </div>
          )}
        </dl>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!siteLaunched && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            🚧 MegaDeal hasn&apos;t officially launched yet, so we&apos;re not
            able to accept deals for review. Save it for now — it&apos;s kept
            with your account, not just this browser, and you can submit it
            for approval the moment we go live.
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="rounded-full border border-slate-200 px-6 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            ← Back to edit
          </button>
          {siteLaunched ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full bg-brand-600 px-8 py-3 text-center text-sm font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 disabled:opacity-60 sm:ml-auto"
            >
              {submitting ? "Submitting…" : "Submit deal for approval"}
            </button>
          ) : (
            <div className="flex flex-col items-end gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={saveDraft}
                disabled={savingDraft}
                className="rounded-full bg-brand-600 px-8 py-3 text-center text-sm font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 disabled:opacity-60"
              >
                {savingDraft ? "Saving…" : draftId ? "💾 Save changes" : "💾 Save as draft"}
              </button>
              {draftSaved && !savingDraft && (
                <p className="text-xs font-semibold text-emerald-600">
                  Saved to your portal ✓
                </p>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
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
      {!siteLaunched && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          🚧 MegaDeal hasn&apos;t officially launched yet, so we&apos;re not
          accepting deals for review. Build your deal below and
          save it as a draft — you can submit it for approval the moment
          we go live, and we&apos;ll email you when that happens.
        </p>
      )}
      {duplicatedFrom && (
        <p className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          Prefilled from your previous deal — just re-pick the category and
          photo below, then everything else is ready to go.
        </p>
      )}
      {draftRestored && (
        <p className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          📝 Picked up your saved draft, photo and all — carry on where you
          left off.
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
            maxLength={MAX_DRAFT_TEXT}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Unwind with a full-body deep tissue massage using warm oils, finished with a relaxing foot scrub. Includes a herbal tea on arrival. Book at least 24 hours ahead — walk-ins subject to availability."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          {description.length > 0 && description.length < 60 && (
            <p className="mt-1 text-xs text-amber-600">
              💡 A bit more detail helps customers know exactly what they&apos;re
              getting, and makes your listing easier to find in search — try
              describing what&apos;s included, not just the price.
            </p>
          )}
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
                Short-burst offer (minutes to hours) — great for filling quiet
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
          <label htmlFor="deal-photo" className="mb-1 block font-display text-base font-bold text-slate-900">
            Photo
            <span className="ml-1 font-sans text-sm font-normal text-ember-600">Required</span>
          </label>
          <p className="mb-2 text-xs text-slate-500">
            This is the whole card on the deals page — a real photo of the food, room
            or treatment does far more than a logo.
          </p>
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
              id="deal-photo"
              type="file"
              accept="image/*"
              // Not `required`: a restored draft can't carry the file, so the
              // browser would block the form over an input the merchant has
              // no way to see is empty. handleContinueToPreview checks the
              // state instead and says so in plain words.
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPhoto(file);
                // A new file supersedes anything already uploaded, so the
                // draft stops pointing at the old image and save/submit
                // knows it has something new to send.
                if (file) setUploaded(null);
              }}
              className="block text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-display text-base font-bold text-slate-900">
            The fine print
            <span className="ml-1 font-sans text-sm font-normal text-ember-600">Required</span>
          </label>
          <p className="mb-2 text-xs text-slate-500">
            Tap everything that applies. Saying it here saves the awkward
            conversation when someone turns up expecting something else.
          </p>
          {/* Chips rather than checkboxes: a 16px tick-box is a poor target
              on the phone most merchants will use, and ten of them in a
              column reads like a form to endure. These are one tap each and
              the ticked ones are obvious at a glance. */}
          <div className="flex flex-wrap gap-2">
            {STANDARD_TERMS.map((term) => {
              const on = selectedTerms.includes(term.id);
              return (
                <button
                  key={term.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSelectedTerms((prev) =>
                      on ? prev.filter((id) => id !== term.id) : [...prev, term.id]
                    )
                  }
                  className={`rounded-full border-2 px-3.5 py-2 text-sm font-bold transition active:scale-95 ${
                    on
                      ? "border-brand-600 bg-brand-600 text-white shadow-card"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {term.label}
                </button>
              );
            })}
          </div>
          <textarea
            id="deal-custom-terms"
            rows={2}
            maxLength={MAX_DRAFT_TEXT}
            value={customTerms}
            onChange={(e) => setCustomTerms(e.target.value)}
            placeholder="Anything else specific to your deal — e.g. maximum 6 people per booking"
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          {terms && (
            <p className="mt-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <span className="font-display font-bold">Customers will see: </span>
              {terms}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Saving is available here, not only from the preview. The preview
            demands a complete, valid deal — which is the wrong bar for
            saving unfinished work, and left a merchant interrupted halfway
            with no way to keep what they had typed. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="w-full rounded-full bg-brand-600 py-3 text-center font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 sm:w-auto sm:px-8"
          >
            Preview deal →
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={savingDraft}
            className="w-full rounded-full border-2 border-brand-200 py-3 text-center text-sm font-extrabold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50 active:scale-95 disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {savingDraft ? "Saving…" : draftId ? "Save changes" : "Save as draft"}
          </button>
          {draftSaved && !savingDraft && (
            <span className="text-xs font-semibold text-emerald-600">Saved ✓</span>
          )}
        </div>
      </form>
    </main>
  );
}
