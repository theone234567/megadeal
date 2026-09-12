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
 * Honeypot field name. Deliberately NOT anything Chrome's autofill
 * recognises: it used to be "website2", which Chrome happily autofilled
 * with the business name for real visitors, tripping the bot branch and
 * wedging the form on "Submitting…" forever. Anything resembling a real
 * field label (website, url, company, address…) is unsafe here.
 */
const HONEYPOT_FIELD = "mg_contact_ref";

/** How long the fake-success bot branch waits before releasing the form.
 *  A real visitor should never see this, but if the honeypot ever gets a
 *  false positive again, the page recovers instead of hanging forever. */
const HONEYPOT_RESET_MS = 2000;

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

/** How long to wait on a Wix auth call before giving up. Without this the
 *  SDK call can hang indefinitely on a flaky connection and the form sits
 *  on "Submitting…" with no error and no way forward. */
const AUTH_TIMEOUT_MS = 30_000;

/** Rejects if `promise` hasn't settled within `ms`. The underlying request
 *  isn't cancelled (the Wix SDK gives us no signal to do that) — we just
 *  stop waiting on it so the visitor gets an error they can act on. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Turns a thrown value into something safe to put in front of a business
 * owner.
 *
 * The catch blocks here used to render `err.message` verbatim, so a Wix
 * SDK failure showed the visitor raw internals like "Cannot read
 * properties of undefined (reading 'validationError')" — meaningless to
 * them, and it exposes how the integration is wired. Messages we wrote
 * ourselves still pass through unchanged; runtime/programming errors are
 * replaced with the caller's fallback and logged instead.
 */
function friendlyError(err: unknown, fallback: string): string {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  // Keep the real error reachable for debugging without showing it.
  console.error("[merchant signup]", err);
  if (!message) return fallback;
  const looksInternal =
    err instanceof TypeError ||
    /cannot read propert|is not a function|is not defined|undefined|\bnull\b|[{}<>]/i.test(message);
  return looksInternal ? fallback : message;
}

/**
 * Everything the form collected, captured up front.
 *
 * These used to be read back off the live <form> element at submit time,
 * which broke the email-verification path: showing the verify-code screen
 * unmounts the form, so by the time the code cleared, formRef.current was
 * null and the whole application was silently dropped — the visitor got an
 * account but no business record, and no error to tell them.
 */
type ApplicationValues = {
  businessName: string;
  contactName: string;
  contactPhone: string;
  legalBusinessName: string;
  couponCode: string;
  honeypot: string;
  agreedToTerms: boolean;
};

function readApplicationValues(formData: FormData): ApplicationValues {
  return {
    businessName: String(formData.get("businessName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    legalBusinessName: String(formData.get("legalBusinessName") ?? ""),
    couponCode: String(formData.get("couponCode") ?? ""),
    honeypot: String(formData.get(HONEYPOT_FIELD) ?? ""),
    agreedToTerms: formData.get("agreedToTerms") === "on",
  };
}

/** Submits everything the /list-your-business form collected to create (or claim)
 *  the business application — called only once the account itself exists
 *  and, if Wix required it, its email is verified. */
async function submitApplication(values: ApplicationValues) {
  const res = await fetch("/api/merchants/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: values.businessName,
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      legalBusinessName: values.legalBusinessName,
      phone: values.contactPhone,
      couponCode: values.couponCode,
      mg_contact_ref: values.honeypot,
      agreedToTerms: values.agreedToTerms,
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
  const startedRef = useRef(false);
  /** Snapshot of the form taken at submit time — survives the verify-code
   *  screen unmounting the form (see ApplicationValues). */
  const applicationRef = useRef<ApplicationValues | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // Pre-filled with WELCOME6 (or a real ?ref= referral code, if that's how
  // the visitor arrived) — same default as before, just visible and
  // editable now instead of a hidden field, so someone who wants to swap
  // in a different referral code they were given can actually do that.
  const [couponCode, setCouponCode] = useState(referralPrefill || "WELCOME6");

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
    // Captured in handleSubmit, before the verify-code screen can unmount
    // the form. If this is somehow empty we must NOT carry on silently —
    // the account already exists at this point, so a dropped application
    // means a business that thinks it applied and never hears back.
    const values = applicationRef.current;
    if (!values) {
      setSubmitError(
        "Your account was created, but we couldn't save your business details. Please sign in to your portal and finish your profile, or contact us and we'll sort it out."
      );
      return;
    }
    await submitApplication(values);
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

    // Honeypot — positioned off-screen, so only a bot filling every field
    // should set this. Pretend to succeed so a bot isn't tipped off it was
    // caught, but release the form after a moment: this branch used to
    // latch `submitting` on forever with no way out, so a single false
    // positive (which is exactly what Chrome autofill caused) left the
    // button stuck on "Submitting…" permanently.
    if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        setSubmitError(
          "We couldn't verify that submission. Please refresh the page and try again, or contact us if it keeps happening."
        );
      }, HONEYPOT_RESET_MS);
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
    if (!client?.auth) {
      setSubmitError(
        "We couldn't reach our sign-up service. Please refresh the page and try again."
      );
      return;
    }

    // Snapshot the form NOW, while it's still mounted — finishAfterAuth may
    // not run until after the verify-code screen has replaced it.
    applicationRef.current = readApplicationValues(formData);

    setSubmitting(true);
    try {
      const outcome = await withTimeout(
        registerMember(client, email, password, businessName),
        AUTH_TIMEOUT_MS,
        "That took too long. Please check your connection and try again — if your account was created, you can sign in to your portal instead."
      );
      await handleOutcome(outcome);
    } catch (err: any) {
      setSubmitError(
        friendlyError(err, "Something went wrong submitting your application. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!client?.auth) {
      setSubmitError(
        "We couldn't reach our sign-up service. Please refresh the page and try again."
      );
      return;
    }
    setSubmitting(true);
    try {
      const outcome = await withTimeout(
        submitVerificationCode(client, code, pendingState),
        AUTH_TIMEOUT_MS,
        "That took too long. Please check your connection and try entering your code again."
      );
      if (outcome.status === "success") {
        await finishAfterAuth();
      } else if (outcome.status === "error") {
        setSubmitError(outcome.message);
      } else {
        setSubmitError("That code isn't right — check your email and try again.");
      }
    } catch (err: any) {
      setSubmitError(friendlyError(err, "That code isn't right. Please try again."));
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
      <form onSubmit={handleSubmit} onChangeCapture={trackFormStarted} className="space-y-4">
        <div>
          <label htmlFor="signup-businessName" className="mb-1 block text-base font-medium text-slate-700">
            Business name
            <RequiredTag />
          </label>
          <input
            id="signup-businessName"
            required
            name="businessName"
            autoComplete="organization"
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
            autoComplete="name"
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
            autoComplete="tel"
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
            autoComplete="organization"
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

        {/* Visible and pre-filled with WELCOME6 (or a real ?ref= referral
            code) by default — this is what actually triggers the "up to 6
            months free" offer at admin-approval time (see PROMO_CODE in
            app/api/admin/merchants/[id]/route.ts), so an empty value here
            would silently apply no offer at all. Editable so someone with
            a different referral code can swap it in. */}
        <div>
          <label htmlFor="signup-couponCode" className="mb-1 block text-base font-medium text-slate-700">
            Promo code
          </label>
          <input
            id="signup-couponCode"
            name="couponCode"
            autoComplete="off"
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400"
          />
          <p className="mt-1 text-sm text-slate-500">
            🎁 WELCOME6 gets you up to 6 months free advertising if you&apos;re approved before launch.
          </p>
        </div>

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

        {/*
          Honeypot — last in the DOM so password managers and Chrome's
          "fill the whole form" heuristic have already finished with the
          real fields before they reach it, and positioned off-screen with
          inline styles rather than utility classes so it can't be undone
          by a Tailwind purge, a cascade collision, or a stylesheet that
          fails to load. A bot that fills every input still trips it.
        */}
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "auto",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            opacity: 0,
          }}
        />
      </form>
    </div>
  );
}
