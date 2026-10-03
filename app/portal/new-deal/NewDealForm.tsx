"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { uploadPhoto } from "@/lib/imageUpload";
import { CATEGORIES } from "@/lib/categories";
import { parseDraft, MAX_DRAFT_TEXT } from "@/lib/dealDraft";
import { STANDARD_TERMS, renderTerms, parseTerms } from "@/lib/dealTerms";
import { buildPreviewDeal } from "@/lib/previewDeal";
import { DEAL_CODE_MAX, dealCodeError, normaliseDealCode } from "@/lib/dealCode";
import { BOOKING_CHOICES, bookingConflict, hasUsableBookingRoute, isBookingChoice } from "@/lib/booking";
import DealCard from "@/components/DealCard";
import DealDetail from "@/app/deal/[slug]/DealDetail";
import PortalAuthScreen from "@/components/portal/PortalAuthScreen";
import { CalendarIcon, CheckIcon, ZapIcon } from "@/components/icons";
import {
  DEFAULT_EVERYDAY_DAYS,
  DEFAULT_FLASH_MINUTES,
  EVERYDAY_MAX_DAYS,
  FLASH_MAX_MINUTES,
  clampEverydayDays,
  clampFlashMinutes,
  everydayOptionsUpTo,
  flashOptionsUpTo,
} from "@/lib/dealDuration";
import { usePlatformSettings } from "@/lib/usePlatformSettings";
import {
  creditsLabel,
  dealCostsLine,
  dealCreditCost,
  dealTypeBlocked,
  dealTypeName,
} from "@/lib/platformSettingsRules";

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
  const [durationDays, setDurationDays] = useState<number>(DEFAULT_EVERYDAY_DAYS);
  const [isFlash, setIsFlash] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(DEFAULT_FLASH_MINUTES);
  // Costs, open deal types and longest runs (admin → Platform settings).
  // Display only: the server checks them again on submission.
  const platformSettings = usePlatformSettings();
  // Flash up to 6 hours, Everyday up to 30 days (lib/dealDuration.ts), or
  // less if an admin has set a shorter maximum.
  const maxDays = platformSettings?.everydayMaxDays ?? EVERYDAY_MAX_DAYS;
  const maxFlashMinutes = (platformSettings?.flashMaxHours ?? FLASH_MAX_MINUTES / 60) * 60;
  const DURATIONS = everydayOptionsUpTo(maxDays);
  const FLASH_DURATIONS = flashOptionsUpTo(maxFlashMinutes);
  // A restored draft or a duplicated deal may ask for more than the
  // current maximum: bring it down to the longest run allowed.
  useEffect(() => {
    if (durationDays > maxDays) setDurationDays(maxDays);
    if (durationMinutes > maxFlashMinutes) setDurationMinutes(maxFlashMinutes);
  }, [durationDays, durationMinutes, maxDays, maxFlashMinutes]);
  const [quantityAvailable, setQuantityAvailable] = useState("");
  /** "required" | "recommended" | "not_required", or "" until chosen —
   *  never defaulted, so "no booking needed" is always the merchant's
   *  own answer (see lib/booking.ts). */
  const [bookingRequirement, setBookingRequirement] = useState("");
  /** The business's own deal code; blank means we generate one. */
  const [dealCode, setDealCode] = useState("");
  /** Left the code box at least once — "too short" and a trailing hyphen
   *  only show after that, so they don't nag mid-typing. */
  const [dealCodeTouched, setDealCodeTouched] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [step, setStep] = useState<"form" | "preview">("form");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  /** What happened on submit: published straight away, turned down by the
   *  automatic check (with the reason), or waiting for a person. */
  const [submitResult, setSubmitResult] = useState<{
    outcome: "live" | "rejected" | "pending";
    message: string | null;
    creditsReturned: number;
  }>({ outcome: "pending", message: null, creditsReturned: 0 });
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

  const merchantCanTakeBookings = hasUsableBookingRoute({
    bookingUrl: merchant?.bookingUrl || null,
    phone: merchant?.phone || null,
    bookingEmail: merchant?.bookingEmail || null,
  });
  const bookingTermsConflict = bookingConflict(bookingRequirement, terms);

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
        // An existing deal stores terms as one rendered string with no
        // record of which boxes produced it, so the chips are recovered by
        // parsing — and parseTerms falls back to plain custom text unless
        // the split round-trips exactly, so nothing is ever reordered or
        // reinterpreted behind the merchant's back.
        const recovered = parseTerms(original.terms || "");
        setSelectedTerms(recovered.selectedIds);
        setCustomTerms(recovered.custom);
        setPriceNow(original.priceNow !== undefined ? String(original.priceNow) : "");
        setPriceWas(
          original.priceWas && original.priceWas !== original.priceNow
            ? String(original.priceWas)
            : ""
        );
        setIsFlash(Boolean(original.isFlash));
        setBookingRequirement(isBookingChoice(original.bookingRequirement) ? original.bookingRequirement : "");
        setDealCode(
          typeof original.dealCode === "string" && !original.dealCode.startsWith("MEGA-") ? original.dealCode : ""
        );
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
        // Only a draft. The route hands back any deal the caller owns, so
        // a submitted deal's id in ?draft= would otherwise load that deal
        // into the new-deal form — where saving is refused and the
        // merchant is left looking at a live listing in an editor that
        // won't accept it.
        if (item.status !== "Draft") {
          // Also forget the id, or the next save would target that
          // submitted deal and be refused — leaving the merchant unable to
          // save a form they are allowed to fill in. Blank id means the
          // save creates a new draft, which is the right outcome.
          setDraftId(null);
          return;
        }
        const draft = parseDraft(item);
        setDealName(draft.dealName);
        setCategory(draft.category);
        setDescription(draft.description);
        setSelectedTerms(draft.selectedTerms);
        setCustomTerms(draft.customTerms);
        setPriceNow(draft.priceNow);
        setPriceWas(draft.priceWas);
        setDurationDays(clampEverydayDays(draft.durationDays));
        setIsFlash(draft.isFlash);
        setDurationMinutes(clampFlashMinutes(draft.durationMinutes));
        setQuantityAvailable(draft.quantityAvailable);
        setBookingRequirement(draft.bookingRequirement);
        setDealCode(draft.dealCode);
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
    const bookingProblem = !isBookingChoice(bookingRequirement)
      ? "Choose whether customers need to book."
      : bookingConflict(bookingRequirement, terms) ||
        (bookingRequirement === "required" && !merchantCanTakeBookings
          ? "This deal needs a booking, but your profile has no booking link, phone number or booking email. Add one in your profile first."
          : null);
    if (bookingProblem) {
      setError(bookingProblem);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }
    const codeProblem = dealCode ? dealCodeError(normaliseDealCode(dealCode)) : null;
    if (codeProblem) {
      setDealCodeTouched(true);
      setError(`Deal code: ${codeProblem}`);
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
        media = await uploadPhoto(photo, dealName);
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
            bookingRequirement,
            dealCode,
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
        media = await uploadPhoto(photo, dealName);
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
          bookingRequirement,
          dealCode: normaliseDealCode(dealCode),
          photoUrl: media?.url || "",
          photoMediaId: media?.id || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong submitting your deal.");
      }
      setSubmitResult({
        outcome: data.outcome === "live" || data.outcome === "rejected" ? data.outcome : "pending",
        message: typeof data.message === "string" ? data.message : null,
        creditsReturned: typeof data.creditsReturned === "number" ? data.creditsReturned : 0,
      });
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
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <PortalAuthScreen
        title="Create a deal"
        intro="Sign in to your business account to write your next deal. Only your own account can create deals on it."
        redirectTo="/portal/new-deal"
      />
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
          className="mt-4 inline-block rounded-full bg-ember-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-700"
        >
          Sign up your business
        </Link>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        {submitResult.outcome === "live" ? (
          <>
            <span className="text-4xl">🎉</span>
            <h1 className="mt-3 text-xl font-bold text-slate-900">Your deal is live!</h1>
            <p className="mt-2 text-sm text-slate-600">
              It&apos;s been approved and customers can see it now. You can track views and
              clicks in your portal.
            </p>
          </>
        ) : submitResult.outcome === "rejected" ? (
          <>
            <span className="text-4xl">✏️</span>
            <h1 className="mt-3 text-xl font-bold text-slate-900">This deal needs a change</h1>
            <p className="mt-2 text-sm text-slate-600">
              {submitResult.message ||
                "It couldn't be approved as written. Please check the wording and photo and submit it again."}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {submitResult.creditsReturned > 0 && (
                <>The {creditsLabel(submitResult.creditsReturned)} it used {submitResult.creditsReturned === 1 ? "has" : "have"} been returned. </>
              )}
              Use <strong>Duplicate this deal</strong> in your portal to fix it and submit again.
            </p>
          </>
        ) : (
          <>
            <span className="text-4xl">🎉</span>
            <h1 className="mt-3 text-xl font-bold text-slate-900">Deal submitted!</h1>
            <p className="mt-2 text-sm text-slate-600">
              Your deal is now <strong>Pending Approval</strong>. We&apos;ll review
              it and create your live listing shortly — you can track its status
              anytime in your portal.
            </p>
          </>
        )}
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
  const creditsText = `${credits} credit${credits === 1 ? "" : "s"}`;
  // What this deal would cost and whether its type is open, once the
  // settings have loaded (null until then: no cost is shown rather than a
  // guessed one).
  const cost = platformSettings ? dealCreditCost(isFlash, platformSettings) : null;
  const typePaused = platformSettings ? dealTypeBlocked(isFlash, platformSettings) : null;
  // The cheapest deal there is: below that, no deal can be submitted.
  const cheapest = !platformSettings
    ? 1
    : platformSettings.chargeCredits
      ? Math.min(platformSettings.everydayCredits, platformSettings.flashCredits)
      : 0;
  // Only a business an admin has approved can submit deals (enforced in
  // /api/deals/create too); until then the form saves drafts, exactly as
  // it does before launch.
  const businessApproved = merchant.status === "Approved";
  const canSubmit = siteLaunched && businessApproved;
  // The exact problem with the code, if any. Too short and a hyphen at the
  // end are what a half-typed code looks like, so those wait until the
  // business leaves the box (or tries to continue).
  const dealCodeProblem = dealCode ? dealCodeError(normaliseDealCode(dealCode)) : null;
  const dealCodeMessage =
    dealCodeProblem &&
    (dealCodeTouched || !(dealCodeProblem.startsWith("Too short") || dealCode.endsWith("-")))
      ? dealCodeProblem
      : null;

  if (credits < cheapest) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <span className="text-4xl">💳</span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {credits === 0 ? "No deal credits left" : "Not enough credits for a deal"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {platformSettings ? dealCostsLine(platformSettings) : "Creating a deal uses credits."} You have{" "}
          {creditsText}. Contact us to top up your account.
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
        bookingRequirement,
        durationDays,
        durationMinutes,
        imageUrl: photoPreview,
        dealCode: normaliseDealCode(dealCode),
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
            <span className="rounded-full bg-ember-600 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white shadow-sm">
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
          <DealDetail deal={previewDeal} preview />
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
              {isFlash ? " (flash deal)" : ""}, from when it goes live
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

        {!siteLaunched ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            🚧 MegaDeal hasn&apos;t officially launched yet, so we&apos;re not
            able to accept deals for review. Save it for now — it&apos;s kept
            with your account, not just this browser, and you can submit it
            for approval the moment we go live.
          </p>
        ) : (
          !businessApproved && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⏳ We&apos;re still reviewing your business, so deals can&apos;t be
              submitted yet. Save this one as a draft — you can submit it as
              soon as you&apos;re approved, and we&apos;ll email you when that happens.
            </p>
          )
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="rounded-full border border-slate-200 px-6 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            ← Back to edit
          </button>
          {canSubmit ? (
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
        {/* Not enough for this type: the note by the Flash choice says so. */}
        {cost === null || credits < cost
          ? `You have ${creditsText}. `
          : cost === 0
            ? "Submitting a deal is free at the moment. "
            : `This ${dealTypeName(isFlash)} will use ${creditsLabel(cost)} of your ${creditsText}. `}
        Your deal goes live once we&apos;ve reviewed it.
      </p>
      {!siteLaunched ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          🚧 MegaDeal hasn&apos;t officially launched yet, so we&apos;re not
          accepting deals for review. Build your deal below and
          save it as a draft — you can submit it for approval the moment
          we go live, and we&apos;ll email you when that happens.
        </p>
      ) : (
        !businessApproved && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            ⏳ We&apos;re still reviewing your business. Build your deal below and
            save it as a draft — you can submit it as soon as you&apos;re approved
            (usually within 12 hours), and we&apos;ll email you when that happens.
          </p>
        )
      )}
      {duplicatedFrom && (
        <p className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          Prefilled from your previous deal — re-pick the category and photo,
          and choose how long this new run lasts. Nothing carries over from the
          old deal&apos;s dates: the new run starts when we approve it.
        </p>
      )}
      {draftRestored && (
        <p className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          📝 Picked up your saved draft, photo and all — carry on where you
          left off.
        </p>
      )}

      <form onSubmit={handleContinueToPreview} className="mt-6 space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        {/* The deal type first: it sets the cost, how long the deal can run
            and how the offer should be written. */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-slate-700">What kind of deal is it?</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([false, true] as const).map((flash) => {
              const selected = isFlash === flash;
              const typeCost = platformSettings ? dealCreditCost(flash, platformSettings) : null;
              const paused = platformSettings ? dealTypeBlocked(flash, platformSettings) !== null : false;
              const longest = flash
                ? FLASH_DURATIONS[FLASH_DURATIONS.length - 1].label
                : DURATIONS[DURATIONS.length - 1].label;
              return (
                <label
                  key={String(flash)}
                  className={`relative flex cursor-pointer gap-3 rounded-xl border-2 p-3.5 transition focus-within:ring-2 focus-within:ring-brand-400 focus-within:ring-offset-2 ${
                    selected ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="deal-type"
                    value={flash ? "flash" : "everyday"}
                    checked={selected}
                    onChange={() => setIsFlash(flash)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      selected ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"
                    }`}
                  >
                    {flash ? <ZapIcon className="h-5 w-5" /> : <CalendarIcon className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-bold text-slate-900">{flash ? "Flash deal" : "Everyday deal"}</span>
                      {paused && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          Paused
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                      {flash
                        ? "A short burst to fill quiet times, e.g. \u201c2-for-1 tonight only\u201d. Shows a FLASH badge."
                        : "A regular offer that runs for days or weeks."}
                    </span>
                    <span className="mt-1.5 block text-xs font-semibold text-slate-800">
                      Up to {longest}
                      {typeCost !== null && <> · {typeCost === 0 ? "Free" : creditsLabel(typeCost)}</>}
                    </span>
                  </span>
                  {selected && (
                    <CheckIcon aria-hidden className="absolute right-3 top-3 h-4 w-4 text-brand-600" />
                  )}
                </label>
              );
            })}
          </div>
          {typePaused ? (
            <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              {typePaused} You can still build it and save it as a draft.
            </p>
          ) : (
            cost !== null &&
            credits < cost && (
              <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                {dealTypeName(isFlash)}s use {creditsLabel(cost)} and you have {creditsText}.{" "}
                <Link href="/contact" className="underline">
                  Contact us to top up
                </Link>
                , or save it as a draft.
              </p>
            )
          )}
        </fieldset>
        <div>
          <label htmlFor="deal-name" className="mb-1 block text-sm font-medium text-slate-700">Deal name</label>
          <input
            id="deal-name"
            required
            value={dealName}
            maxLength={80}
            onChange={(e) => setDealName(e.target.value)}
            placeholder="e.g. 60-Minute Massage + Facial"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label htmlFor="deal-category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            id="deal-category"
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
          <label htmlFor="deal-description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            id="deal-description"
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
            <label htmlFor="deal-price" className="mb-1 block text-sm font-medium text-slate-700">Deal price ($)</label>
            <input
              id="deal-price"
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
            <label htmlFor="deal-price-was" className="mb-1 block text-sm font-medium text-slate-700">
              Original price ($) <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="deal-price-was"
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deal-duration" className="mb-1 block text-sm font-medium text-slate-700">
              How long it runs
            </label>
            {isFlash ? (
              <select
                id="deal-duration"
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
                id="deal-duration"
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
            <p className="mt-1 text-xs text-slate-500">
              {isFlash
                ? `Flash Deals run for up to ${FLASH_DURATIONS[FLASH_DURATIONS.length - 1].label}.`
                : `Deals run for up to ${DURATIONS[DURATIONS.length - 1].label}.`}{" "}
              The time starts
              when your deal goes live, not while it&apos;s being reviewed.
            </p>
          </div>
          <div>
            <label htmlFor="deal-quantity" className="mb-1 block text-sm font-medium text-slate-700">
              Quantity available <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="deal-quantity"
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
              className="block w-full min-w-0 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
        </div>

        {/* Asked outright rather than inferred: the public deal page shows
            different next steps for each answer (lib/booking.ts), and a
            missing booking link must never read as "no booking needed". */}
        <fieldset>
          <legend id="booking-requirement-label" className="mb-1 block font-display text-base font-bold text-slate-900">
            Do customers need to book?
            <span className="ml-1 font-sans text-sm font-normal text-ember-600">Required</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="booking-requirement-label">
            {BOOKING_CHOICES.map((choice) => {
              const on = bookingRequirement === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={choice.hint}
                  onClick={() => setBookingRequirement(choice.value)}
                  className={`rounded-full border-2 px-3.5 py-2 text-sm font-bold transition active:scale-95 ${
                    on
                      ? "border-brand-600 bg-brand-600 text-white shadow-card"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {choice.label}
                </button>
              );
            })}
          </div>
          {bookingRequirement && (
            <p className="mt-2 text-xs text-slate-500">
              {BOOKING_CHOICES.find((c) => c.value === bookingRequirement)?.hint}.
            </p>
          )}
          {bookingRequirement === "required" && merchant && !merchantCanTakeBookings && (
            <p className="mt-2 text-sm text-red-600">
              Your profile has no booking link, phone number or booking email yet, so customers
              couldn&apos;t book.{" "}
              <Link href="/portal/profile" className="font-semibold underline">
                Add one in your profile
              </Link>
              .
            </p>
          )}
        </fieldset>

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
          {bookingTermsConflict && <p className="mt-3 text-sm text-red-600">{bookingTermsConflict}</p>}
          {terms && (
            <p className="mt-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <span className="font-display font-bold">Customers will see: </span>
              {terms}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="deal-code" className="mb-1 block text-base font-bold text-slate-900">
            Your deal code <span className="font-sans text-sm font-normal text-slate-500">(optional)</span>
          </label>
          <p id="deal-code-help" className="mb-2 text-xs leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">Use your own promo code.</strong> If your
            website or booking system takes discount codes, set one up there and enter the same code
            here — customers will be told to enter it when they book online, so the discount applies
            automatically. They&apos;ll also quote it by phone or show it in person, so you can spot
            MegaDeal customers.
            <br />
            No code of your own? Leave this blank and we&apos;ll create one. Letters, numbers and
            hyphens, up to {DEAL_CODE_MAX} characters (e.g. SUMMER-20). It can&apos;t be changed once
            your deal is submitted.
          </p>
          <input
            id="deal-code"
            value={dealCode}
            // Room to type past the limit, so "too long" can be shown
            // rather than the box silently refusing keys.
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={dealCodeMessage ? "deal-code-help deal-code-error" : "deal-code-help"}
            aria-invalid={Boolean(dealCodeMessage)}
            // Shown the way it will be saved (capitals, hyphens for spaces).
            onChange={(e) =>
              setDealCode(e.target.value.normalize("NFKC").toUpperCase().replace(/\s/g, "-").slice(0, 40))
            }
            onBlur={() => setDealCodeTouched(true)}
            placeholder="e.g. SUMMER-20"
            className={`w-full rounded-xl border px-3 py-2 font-mono text-sm uppercase tracking-wider outline-none sm:max-w-xs ${
              dealCodeMessage ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-brand-400"
            }`}
          />
          <div className="mt-1 flex items-start justify-between gap-3 text-xs sm:max-w-xs">
            <p id="deal-code-error" role="status" className="text-red-600">
              {dealCodeMessage}
            </p>
            {dealCode && (
              <span className={`shrink-0 tabular-nums ${[...dealCode].length > DEAL_CODE_MAX ? "font-semibold text-red-600" : "text-slate-500"}`}>
                {[...dealCode].length}/{DEAL_CODE_MAX}
              </span>
            )}
          </div>
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
