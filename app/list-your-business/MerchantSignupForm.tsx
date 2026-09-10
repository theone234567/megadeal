"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { registerMember, submitVerificationCode, type AuthOutcome } from "@/lib/wixAuth";
import PasswordField from "@/components/PasswordField";
import { trackMetaPixelEvent } from "@/lib/metaPixel";

function RequiredTag() {
  return <span className="ml-1 font-normal text-ember-600">Required</span>;
}

/**
 * CRO EXPERIMENT — short initial signup (easy to revert): the form used to
 * also collect legal business name's NZBN, referral code as a visible
 * field, and the full public-profile block (business phone, address,
 * city, category) inline. Those are now either dropped (NZBN, removed
 * earlier), collected silently (referral code, via the ?ref= URL param —
 * no visible field), or deferred to the portal's "complete your profile"
 * step (address, city, phone, category — same place bio/hours/website/
 * social already go), so the initial ask is business name, contact name,
 * email, password, and mobile — the minimum needed to create the account
 * and start a review.
 */

/** Submits everything the /list-your-business form collected to create (or claim)
 *  the business application — called only once the account itself exists
 *  and, if Wix required it, its email is verified. */
async function submitApplication(formEl: HTMLFormElement) {
  const formData = new FormData(formEl);
  const res = await fetch("/api/merchants/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: String(formData.get("businessName") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      legalBusinessName: String(formData.get("legalBusinessName") ?? ""),
      phone: String(formData.get("contactPhone") ?? ""),
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
  const startedRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Set once Wix comes back with EMAIL_VERIFICATION_REQUIRED — the rest of
  // the form stays filled in underneath while this is shown, nothing is
  // lost, the verification code just has to clear before the application
  // itself gets submitted.
  const [pendingState, setPendingState] = useState<unknown>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");

  function trackFormStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    window.gtag?.("event", "form_start", { form_name: "merchant_signup" });
  }

  async function finishAfterAuth() {
    if (!formRef.current) return;
    await submitApplication(formRef.current);
    window.gtag?.("event", "form_complete", { form_name: "merchant_signup" });
    // The real conversion event for business-recruitment ad campaigns — a
    // completed application, not just a click or an email signup.
    trackMetaPixelEvent("CompleteRegistration", { content_name: "business_signup" });
    window.gtag?.("event", "sign_up", { method: "merchant_signup" });
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
    <div id="signup" className="scroll-mt-[140px] rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
      <form ref={formRef} onSubmit={handleSubmit} onChangeCapture={trackFormStarted} className="space-y-4">
        {/* Honeypot — hidden from real visitors via CSS, so only a bot filling every field would set this. */}
        <input
          type="text"
          name="website2"
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          aria-hidden="true"
        />
        {/* Referral tracking stays silent — no visible field, just carried
            through from the ?ref= link someone arrived on. Defaults to
            WELCOME6 otherwise (same as the old visible field's default)
            — this is what actually triggers the "up to 6 months free"
            offer at admin-approval time (see PROMO_CODE in
            app/api/admin/merchants/[id]/route.ts), so dropping the
            default here would silently apply the offer to no one who
            didn't arrive via a referral link. */}
        <input type="hidden" name="couponCode" value={referralPrefill || "WELCOME6"} />
        {/* Marketing everywhere else on the site says "use code WELCOME6 at
            signup" — without this, there was nothing on the actual form
            confirming that's happening, since the field above is hidden by
            design. Only claims the WELCOME6 offer specifically when that's
            really what's being applied (not a referral code). */}
        {referralPrefill ? (
          <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-700">
            🎉 Signing up via a referral link — thanks!
          </p>
        ) : (
          <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-700">
            🎁 Promo code <strong>WELCOME6</strong> applied — up to 6 months free advertising if you&apos;re approved before launch.
          </p>
        )}

        <div>
          <label htmlFor="signup-businessName" className="mb-1 block text-base font-medium text-slate-700">
            Business name
            <RequiredTag />
          </label>
          <input
            id="signup-businessName"
            required
            name="businessName"
            type="text"
            placeholder="e.g. Harbourside Bistro"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label htmlFor="signup-contactName" className="mb-1 block text-base font-medium text-slate-700">
            Your name
            <RequiredTag />
          </label>
          <input
            id="signup-contactName"
            required
            name="contactName"
            type="text"
            placeholder="Full name"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-1 block text-base font-medium text-slate-700">
            Email
            <RequiredTag />
          </label>
          <input
            id="signup-email"
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.co.nz"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="signup-password" className="mb-1 block text-base font-medium text-slate-700">
              Password
              <RequiredTag />
            </label>
            <PasswordField
              id="signup-password"
              required
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              inputClassName="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="signup-confirmPassword" className="mb-1 block text-base font-medium text-slate-700">
              Confirm password
              <RequiredTag />
            </label>
            <PasswordField
              id="signup-confirmPassword"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Same password again"
              inputClassName="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-contactPhone" className="mb-1 block text-base font-medium text-slate-700">
            Mobile
            <RequiredTag />
          </label>
          <input
            id="signup-contactPhone"
            required
            name="contactPhone"
            type="tel"
            placeholder="021 234 5678"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label htmlFor="signup-legalBusinessName" className="mb-1 block text-base font-medium text-slate-700">
            Legal / registered business name
            <RequiredTag />
          </label>
          <input
            id="signup-legalBusinessName"
            required
            name="legalBusinessName"
            type="text"
            placeholder="e.g. Harbourside Bistro Limited"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400"
          />
          <p className="mt-1 text-sm text-slate-500">
            Must be a New Zealand registered Limited company — we
            don&apos;t currently accept sole traders or partnerships.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          📍 Address, hours, photos and more — you&apos;ll add those next,
          once you&apos;re in your portal.
        </p>

        <label className="flex items-start gap-2 text-base text-slate-600">
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
          className="w-full rounded-full bg-brand-600 py-3.5 text-center font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "CLAIM MY FREE ADVERTISING →"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Takes about 60 seconds • No credit card required • No obligation
        </p>

        <p className="text-center text-sm text-slate-500">
          Already applied?{" "}
          <a href="/portal" className="font-semibold text-brand-600 hover:underline">
            Sign in to your business portal
          </a>
        </p>
      </form>
    </div>
  );
}
