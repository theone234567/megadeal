"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWix } from "@/context/WixProvider";
import type { DealStatus } from "@/lib/types";
import DealManageCard, { type DealRecord } from "@/components/portal/DealManageCard";
import MerchantProfileForm from "@/components/portal/MerchantProfileForm";
import MerchantLoginForm from "@/components/portal/MerchantLoginForm";
import ReferralCard from "@/components/portal/ReferralCard";
import ActivityFeed from "@/components/portal/ActivityFeed";
import NotificationPreferences from "@/components/portal/NotificationPreferences";
import ExportDealsButton from "@/components/portal/ExportDealsButton";

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
  emailVerified?: boolean;
  referralCode?: string;
  notifyReferralBonus?: boolean;
  [key: string]: any;
}

export default function PortalPage() {
  const { client, member, isLoggedIn, logout } = useWix();
  const [merchant, setMerchant] = useState<MerchantRecord | null | undefined>(undefined);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [logoError, setLogoError] = useState<string | null>(null);

  const loadDeals = useCallback(
    (email: string) => {
      client.items
        .query("Deals")
        .eq("merchantEmail", email)
        .find()
        .then((dealsResult: any) => setDeals(dealsResult.items ?? []))
        .catch(() => setDeals([]));
    },
    [client]
  );

  useEffect(() => {
    if (member === undefined) return; // still resolving auth state
    if (!isLoggedIn) {
      setMerchant(null);
      return;
    }

    let cancelled = false;
    setMerchant(undefined);

    // Goes through a server route rather than querying the Merchants
    // collection directly: a business can apply before ever signing in
    // (see /list-your-business), so their record may have no owner yet — this route
    // claims it for the signed-in member on first access by matching email.
    fetch("/api/merchants/me")
      .then((res) => (res.ok ? res.json() : { item: null }))
      .then(({ item: record }) => {
        if (cancelled) return;
        setMerchant(record ?? null);
        if (record?.email) loadDeals(record.email);
      })
      .catch(() => {
        if (!cancelled) setMerchant(null);
      });

    return () => {
      cancelled = true;
    };
  }, [member, isLoggedIn, loadDeals]);

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

  async function handleChangeLogo(dataUrl: string) {
    if (!merchant) return;
    setLogoError(null);
    try {
      const res = await fetch("/api/merchants/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save your logo.");
      }
      const { item: updated } = await res.json();
      setMerchant(updated);
    } catch (err: any) {
      setLogoError(err?.message || "Couldn't save your logo. Please try again.");
      throw err;
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
        <h1 className="mt-3 text-xl font-bold text-slate-900">Business portal</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to view your business details, deal credits and active
          deals. Only you can see your own account.
        </p>
        <MerchantLoginForm />
        <p className="mt-4 text-sm text-slate-500">
          New here?{" "}
          <Link href="/list-your-business#signup" className="font-semibold text-brand-600 hover:underline">
            Sign up your business
          </Link>
        </p>
      </main>
    );
  }

  // Address and category are what make a listing findable — a deal with
  // neither can't be shown on a map or in a category page, so they are the
  // bar for "set up" rather than a nice-to-have. Same test the header
  // badge uses. It also decides whether the listing form is still on
  // screen: once these are saved the application is in, and the form is
  // replaced by its status rather than left sitting there inviting a
  // resubmit.
  const profileComplete = Boolean(merchant?.address && merchant?.category);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Business portal</h1>
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          Sign out
        </button>
      </div>

      {!merchant ? (
        <>
        <div className="mt-6 rounded-2xl border-2 border-ember-200 bg-ember-50/50 p-8 text-center">
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
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <MerchantProfileForm
            merchant={{} as MerchantRecord}
            createMode
            startEditing
            onSaved={(created) => setMerchant(created)}
          />
        </div>
        </>
      ) : (
        <>
          {/* Order follows what the merchant still has to do.
              Until the profile has an address and a category, finishing it
              is the job — a deal without them can't appear on a map or in
              a category, so "Create a new deal" first was pointing at a
              dead end, and the form that mattered sat below five other
              sections at the bottom of the page. Once it's complete the
              page leads with the deal button again, which is then the
              genuinely useful action. */}
          {!profileComplete ? (
            <section
              id="finish-setup"
              className="mt-6 rounded-2xl border-2 border-ember-200 bg-ember-50/50 p-6 shadow-card"
            >
              <h2 className="text-lg font-extrabold text-slate-900">
                Finish your listing
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                We&apos;ve kept everything you gave us at signup. Add your address, category and
                opening hours so customers can find you.
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Saving sends your listing to us for approval.
              </p>
              <div className="mt-5 rounded-2xl bg-white p-5">
                <MerchantProfileForm
                  merchant={merchant}
                  onSaved={(updated) => setMerchant(updated)}
                  startEditing
                  onLogoConfirm={handleChangeLogo}
                  logoError={logoError}
                />
              </div>
            </section>
          ) : (
            <>
              {/* A complete listing that is still Pending is with us for
                  review. Saying nothing left merchants watching a status
                  word with no idea whether anything was happening, or how
                  long to wait. The caveat is deliberately understated: it
                  has to be true — not every business is a fit — without
                  reading as a warning to someone who has just signed up. */}
              {(merchant.status || "Pending") === "Pending" && (
                <section className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-6">
                  <h2 className="text-lg font-extrabold text-brand-900">
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
                </section>
              )}

              <Link
                href="/portal/new-deal"
                className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-ember-500 px-6 py-4 text-center text-base font-bold text-white shadow-card transition hover:bg-ember-600"
              >
                + Create a new deal
              </Link>
            </>
          )}

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
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
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
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
              {/* No "verify your email" prompt here. Reaching the portal at
                  all means the code from the signup email was already
                  entered and accepted by Wix, so prompting for it again —
                  and offering a sign-out-and-back-in to resend it — asked
                  merchants to redo a step they had just finished. The
                  badge below is confirmation, not a task. */}
              {member?.loginEmailVerified && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                  ✓ Email verified
                </p>
              )}
            </div>
          </div>

          <ReferralCard referralCode={merchant.referralCode} />

          <ActivityFeed />

          <NotificationPreferences notifyReferralBonus={merchant.notifyReferralBonus} />

          {/* Only once, and only here when it isn't already leading the
              page above — two live copies of the same form would fight
              over the same record, and whichever was saved last would
              quietly overwrite the other. The card goes with it: with the
              logo field moved inside the form, an incomplete listing was
              left rendering an empty white box here. */}
          {profileComplete && (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <MerchantProfileForm
                merchant={merchant}
                onSaved={(updated) => setMerchant(updated)}
                onLogoConfirm={handleChangeLogo}
                logoError={logoError}
              />
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Your deals</h2>
              <ExportDealsButton deals={deals} />
            </div>
            {deals.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                {/* The create-deal button is hidden until the listing has
                    an address and a category, so "above" pointed at
                    nothing for exactly the merchants most likely to read
                    this line. */}
                {profileComplete
                  ? "No deals yet — create your first one above."
                  : "No deals yet. Finish your listing above and you can create your first deal."}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {deals.map((deal) => (
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
        </>
      )}
    </main>
  );
}
