"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWix } from "@/context/WixProvider";
import type { DealStatus } from "@/lib/types";
import DealManageCard, { type DealRecord } from "@/components/portal/DealManageCard";
import MerchantProfileForm from "@/components/portal/MerchantProfileForm";
import PortalAuthScreen from "@/components/portal/PortalAuthScreen";
import ReferralCard from "@/components/portal/ReferralCard";
import ActivityFeed from "@/components/portal/ActivityFeed";
import ExportDealsButton from "@/components/portal/ExportDealsButton";
import { parseBusinessPhotos } from "@/lib/businessPhotos";
import { StoreIcon, MapPinIcon, MailIcon, ReceiptIcon, CreditCardIcon } from "@/components/icons";

interface MerchantRecord {
  _id: string;
  businessName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postcode?: string;
  bio?: string;
  businessHours?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  priceRange?: string;
  amenities?: string;
  couponCode?: string;
  creditsBalance?: number;
  status?: string;
  logoUrl?: string;
  photos?: string;
  emailVerified?: boolean;
  referralCode?: string;
  notifyReferralBonus?: boolean;
  [key: string]: any;
}

/** "3 minutes ago" beats a timestamp here: the only question a merchant
 *  has about a draft is whether it holds the work they just did. */
function formatSavedAt(iso?: string): string {
  if (!iso) return "just now";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "just now";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function PortalPage() {
  const { member, isLoggedIn } = useWix();
  const [merchant, setMerchant] = useState<MerchantRecord | null | undefined>(undefined);
  // Separate from `merchant` on purpose: `merchant === null` means "we
  // asked Wix and confirmed there's no business on this account," which
  // is what puts someone on the restart-signup screen. A failed request
  // (a dropped connection, a transient 500, a brief hiccup right after
  // the heavy writes a deal-create does) is not that, and was being
  // silently folded into the same `null` — telling a merchant with a
  // complete, paid-up business to redo their signup because one fetch
  // hiccuped. This flag keeps that failure a retry, not a false "you
  // have nothing on file".
  const [merchantLoadError, setMerchantLoadError] = useState(false);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [photosError, setPhotosError] = useState<string | null>(null);
  // Mirrors the same check /admin does in reverse — being signed into
  // both an admin session and a business account in the same browser is
  // confusing about which one a given click is acting as.
  const [adminAlsoActive, setAdminAlsoActive] = useState(false);
  const [signingOutAdmin, setSigningOutAdmin] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    fetch("/api/admin/session")
      .then((res) => (res.ok ? res.json() : { isAdmin: false }))
      .then(({ isAdmin }) => {
        if (!cancelled) setAdminAlsoActive(Boolean(isAdmin));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  async function handleSignOutAdmin() {
    setSigningOutAdmin(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setAdminAlsoActive(false);
    } finally {
      setSigningOutAdmin(false);
    }
  }

  // Server-side now: this query used to run in the browser with the
  // member's own Wix tokens, which is one of the two reasons those tokens
  // had to be readable by script. The route scopes results to the email
  // Wix verified for the caller, so it no longer needs an argument.
  const loadDeals = useCallback(() => {
    fetch("/api/deals/mine")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then(({ items }) => setDeals(items ?? []))
      .catch(() => setDeals([]));
  }, []);

  const loadMerchant = useCallback(() => {
    let cancelled = false;
    setMerchant(undefined);
    setMerchantLoadError(false);

    // Goes through a server route rather than querying the Merchants
    // collection directly: a business can apply before ever signing in
    // (see /list-your-business), so their record may have no owner yet — this route
    // claims it for the signed-in member on first access by matching email.
    //
    // A non-2xx here (or the fetch itself throwing) is a failed request,
    // not evidence the merchant has no record — thrown explicitly so the
    // catch below can tell the two apart instead of both landing on
    // `{ item: null }`.
    fetch("/api/merchants/me")
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then(({ item: record }) => {
        if (cancelled) return;
        setMerchant(record ?? null);
        loadDeals();
      })
      .catch(() => {
        if (!cancelled) setMerchantLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [loadDeals]);

  useEffect(() => {
    if (member === undefined) return; // still resolving auth state
    if (!isLoggedIn) {
      setMerchant(null);
      setMerchantLoadError(false);
      return;
    }
    return loadMerchant();
  }, [member, isLoggedIn, loadMerchant]);

  async function handleChangeDealStatus(deal: DealRecord, target: DealStatus) {
    // Goes through a server route rather than a direct client write: the
    // route re-verifies who's calling and only allows the specific status
    // transitions our state machine permits, so a merchant can never
    // self-approve a deal out of "Pending Approval" no matter what request
    // they craft — that check can't be bypassed from the browser.
    const res = await fetch(`/api/deals/${deal._id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't update this deal.");
    }
    const { item: updated } = await res.json();
    setDeals((prev) => prev.map((d) => (d._id === deal._id ? updated : d)));
  }

  async function handleChangeDealPhoto(deal: DealRecord, dataUrl: string) {
    const res = await fetch(`/api/deals/${deal._id}/photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: dataUrl }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Couldn't save that photo.");
    }
    const { item: updated } = await res.json();
    setDeals((prev) => prev.map((d) => (d._id === deal._id ? updated : d)));
  }

  async function handleDeleteDraft(draft: DealRecord) {
    if (!window.confirm(`Delete "${draft.dealName || "this draft"}"? This can't be undone.`)) {
      return;
    }
    const res = await fetch(`/api/deals/${draft._id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Couldn't delete that draft.");
      return;
    }
    setDeals((prev) => prev.filter((d) => d._id !== draft._id));
  }

  async function handleChangePhotos(photos: string[]) {
    if (!merchant) return;
    setPhotosError(null);
    try {
      const res = await fetch("/api/merchants/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save your photos.");
      }
      const { item: updated } = await res.json();
      setMerchant(updated);
    } catch (err: any) {
      setPhotosError(err?.message || "Couldn't save your photos. Please try again.");
      throw err;
    }
  }

  if (member === undefined || (merchant === undefined && !merchantLoadError)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (merchantLoadError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-bold text-slate-900">Couldn&apos;t load your account</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Your business and deals are fine — this page just couldn&apos;t reach them. Please try
          again.
        </p>
        <button
          onClick={loadMerchant}
          className="mt-5 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          Try again
        </button>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <PortalAuthScreen
        title="Business portal"
        intro="Your deals, your credits and your listing — all in one place."
      />
    );
  }

  // Address is what makes a listing findable — a deal with none can't be
  // shown on a map, so it's the bar for "set up" rather than a
  // nice-to-have. Same test the header badge uses. It also decides
  // whether the listing form is still on screen: once it's saved the
  // application is in, and the form is replaced by its status rather than
  // left sitting there inviting a resubmit. At least one photo is
  // required for the same reason — a listing with no photo isn't one a
  // customer would trust enough to click. Category isn't part of this:
  // it's chosen per deal (see app/portal/new-deal/NewDealForm.tsx), not
  // once for the whole business, so the profile form no longer collects
  // it at all.
  const profileComplete = Boolean(
    merchant?.address && parseBusinessPhotos(merchant?.photos).length > 0
  );

  // A draft has never been reviewed, never been public and never cost a
  // credit, so it doesn't belong in the same list as deals that have. It
  // is also excluded from the CSV export, which reports performance —
  // something a draft has none of.
  const drafts = deals.filter((d) => d.status === "Draft");
  const submittedDeals = deals.filter((d) => d.status !== "Draft");

  return (
    <div className="space-y-6">
      {adminAlsoActive && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">⚠️ You&apos;re also signed in as admin</p>
          <p className="mt-1 text-sm text-amber-800">
            Being signed into both at once gets confusing about which account you&apos;re acting
            as. Worth signing out of admin while you&apos;re only using this business portal.
          </p>
          <button
            onClick={handleSignOutAdmin}
            disabled={signingOutAdmin}
            className="mt-2 rounded-full border-2 border-amber-600 px-4 py-1.5 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
          >
            {signingOutAdmin ? "Signing out…" : "Sign out of admin"}
          </button>
        </div>
      )}

      {!merchant ? (
        <>
          <div className="rounded-2xl border-2 border-ember-200 bg-ember-50/50 p-8 text-center">
            {/* Framed as finishing, not starting. Reaching this screen means
                the account was created but the business details never saved —
                usually a signup that dropped part-way. "We don't have an
                application on file" states the system's problem and reads as
                "begin again", which is discouraging and wrong: nothing they
                did was lost, there is simply one step left. */}
            <h2 className="text-xl font-extrabold text-slate-900">
              One step left — finish your signup
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Your account is all set up. We just need your business details to get your listing
              ready — it only takes a minute, and you won&apos;t need to create another password.
            </p>
          </div>

          {/* The form lives here rather than back on /list-your-business.
              That page is the marketing pitch with the short signup, which
              they have already been through — sending them there asks them
              to repeat work and offers none of the fields still missing.
              This is the full set (address, hours, socials, bio, price
              range), and createMode posts it to /api/merchants/apply, the
              only route that creates rather than updates. */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <MerchantProfileForm
              merchant={{} as MerchantRecord}
              createMode
              startEditing
              onSaved={(created) => setMerchant(created)}
            />
          </div>
        </>
      ) : !profileComplete ? (
        /* Order follows what the merchant still has to do. Until the
           profile has an address and at least one photo, finishing it is
           the job — a deal without them can't appear on a map or look
           trustworthy enough to click, so the dashboard below (deals,
           credits) sits behind this rather than above a dead end. */
        <section id="overview" className="rounded-2xl border-2 border-ember-200 bg-ember-50/50 p-6 shadow-card">
          <h2 className="text-xl font-extrabold text-slate-900">
            Almost there — finish your listing
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            We&apos;ve kept everything you gave us at signup. Add your address and photos so
            customers can find and trust you.
          </p>
          <div className="mt-5 rounded-2xl bg-white p-5">
            <MerchantProfileForm
              merchant={merchant}
              onSaved={(updated) => setMerchant(updated)}
              startEditing
              onPhotosConfirm={handleChangePhotos}
              photosError={photosError}
            />
          </div>
        </section>
      ) : (
        <>
          <section id="overview" className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Business overview
                </p>
                <h1 className="mt-1 text-[28px] font-extrabold leading-tight text-slate-900 sm:text-[32px]">
                  {merchant.businessName || "Your business"}
                </h1>
              </div>
              <Link
                href="/portal/new-deal"
                className="shrink-0 rounded-full bg-ember-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-ember-700 active:scale-95"
              >
                + Create a deal
              </Link>
            </div>

            {/* A complete listing that is still Pending is with us for
                review. Saying nothing left merchants watching a status
                word with no idea whether anything was happening, or how
                long to wait. The caveat is deliberately understated: it
                has to be true — not every business is a fit — without
                reading as a warning to someone who has just signed up. */}
            {(merchant.status || "Pending") === "Pending" && (
              <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
                <h2 className="text-base font-extrabold text-brand-900">
                  Thanks — your application is in 🎉
                </h2>
                <p className="mt-1.5 text-sm text-brand-800">
                  It&apos;s with our team now. Most businesses are approved within 12 hours, and
                  we&apos;ll email you the moment you&apos;re live — there&apos;s nothing else
                  you need to do.
                </p>
                <p className="mt-2 text-sm text-brand-700/90">
                  We read every listing to check it&apos;s a genuine New Zealand business, so
                  now and then we&apos;ll come back with a question first.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <CreditCardIcon className="h-4 w-4" />
                  Available credits
                </p>
                <p className="mt-1 text-3xl font-extrabold text-brand-700">
                  {merchant.creditsBalance ?? 0}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  1 credit = 1 deal listing.{" "}
                  <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
                    Contact us to top up.
                  </Link>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <ReceiptIcon className="h-4 w-4" />
                  Deals
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{submittedDeals.length}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {drafts.length > 0
                    ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} in progress`
                    : "Live and past deals"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Application status
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {merchant.status || "Pending"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {(merchant.status || "Pending") === "Approved"
                    ? "You're approved — you can list deals whenever you're ready."
                    : "We'll email you as soon as you're approved, usually within 12 hours."}
                </p>
              </div>
            </div>
          </section>

          <section id="deals" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Drafts sit above submitted deals and in their own card.
                  They are the merchant's unfinished work, so the useful
                  actions are "carry on" and "throw away" — not the
                  pause/cancel controls a submitted deal carries, none of
                  which mean anything for something that was never
                  reviewed and never public. */}
              {drafts.length > 0 && (
                <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">
                      Drafts
                    </span>
                    {drafts.length > 1 && (
                      <span className="text-sm font-bold text-brand-700">{drafts.length} saved</span>
                    )}
                  </div>
                  <h2 className="mt-3 font-display text-xl font-bold text-brand-900">
                    Work in progress ✏️
                  </h2>
                  <p className="mt-1 text-sm text-brand-800/80">
                    Saved to your account, not just this browser. Nothing here is public,
                    and none of it has used a credit.
                  </p>
                  <ul className="mt-4 space-y-3">
                    {drafts.map((draft) => (
                      <li
                        key={draft._id}
                        className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-card"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-200">
                          {draft.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={draft.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xl">🏷️</span>
                          )}
                        </div>
                        {/* basis keeps the name from collapsing to nothing at
                            phone width, where flex-1 alone let the buttons
                            squeeze it out and the row became a thumbnail next
                            to two buttons with the deal's name nowhere. Below
                            that width the buttons wrap to their own line. */}
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="truncate font-display text-base font-bold text-slate-900">
                            {draft.dealName || "Untitled deal"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Last saved {formatSavedAt(draft._updatedDate)}
                          </p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <Link
                            href={`/portal/new-deal?draft=${draft._id}`}
                            className="rounded-full bg-ember-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition hover:bg-ember-700 active:scale-95"
                          >
                            Keep going →
                          </Link>
                          <button
                            onClick={() => handleDeleteDraft(draft)}
                            className="rounded-full border-2 border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 active:scale-95"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {drafts.length === 0 && submittedDeals.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-card">
                  <h2 className="text-lg font-bold text-slate-900">Your first deal starts here</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
                    Give locals a reason to choose your business. Add an offer you&apos;d like to
                    promote on MegaDeal.
                  </p>
                  <Link
                    href="/portal/new-deal"
                    className="mt-5 inline-flex items-center justify-center rounded-full bg-ember-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-ember-700 active:scale-95"
                  >
                    Create your first deal
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">My deals</h2>
                    <ExportDealsButton deals={submittedDeals} />
                  </div>
                  {submittedDeals.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      No deals yet — create your first one above.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {submittedDeals.map((deal) => (
                        <DealManageCard
                          key={deal._id}
                          deal={deal}
                          onChangeStatus={handleChangeDealStatus}
                          onChangePhoto={handleChangeDealPhoto}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Compact profile summary — the full grouped edit form lives
                on its own route (requirement 5) so it doesn't compete with
                the deals list for primacy here. Category is deliberately
                left off: it was removed from this form entirely (chosen
                per deal instead), so there is nothing to show. */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card lg:col-span-1">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <StoreIcon className="h-5 w-5 text-brand-600" />
                Business profile
              </div>
              <p className="mt-3 break-words text-base font-semibold text-slate-900">
                {merchant.businessName}
              </p>
              {(merchant.address || merchant.city) && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{[merchant.address, merchant.city].filter(Boolean).join(", ")}</span>
                </p>
              )}
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                <MailIcon className="h-4 w-4 shrink-0" />
                {member?.loginEmailVerified ? "Email verified" : "Email not verified"}
              </p>
              <Link
                href="/portal/profile"
                className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Manage profile
              </Link>
            </div>
          </section>

          {/* Deal credits used to sit in a 2-column grid beside Application
              status, with "Recent activity" as an unrelated box further
              down the page — two disconnected views of the same balance.
              This is the merchant's actual credit ledger: balance and
              top-up info up top, the history of what earned or spent each
              credit embedded right below it in the same card, the way a
              bank statement pairs a balance with its transactions instead
              of filing them separately. */}
          <section id="credits" className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Deal credits
              </p>
              <p className="mt-1 text-4xl font-extrabold text-brand-700">
                {merchant.creditsBalance ?? 0}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                1 credit = 1 deal listing.{" "}
                <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
                  Contact us to top up.
                </Link>
              </p>
              <ActivityFeed />
            </div>

            <ReferralCard referralCode={merchant.referralCode} />
          </section>
        </>
      )}
    </div>
  );
}
