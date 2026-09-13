"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { loginMember, registerMember, submitVerificationCode, type AuthOutcome } from "@/lib/wixAuth";
import PasswordField from "@/components/PasswordField";
import { trackMetaPixelEvent } from "@/lib/metaPixel";
import { getInvisibleCaptchaToken, preloadCaptcha } from "@/lib/recaptcha";
import RecaptchaCheckbox, { type RecaptchaCheckboxHandle } from "@/components/RecaptchaCheckbox";
import { AUTH_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";

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
  const { client, member, isLoggedIn, logout } = useWix();
  const searchParams = useSearchParams();
  const referralPrefill = searchParams.get("ref") || "";
  const startedRef = useRef(false);
  /** Snapshot of the form taken at submit time — survives the verify-code
   *  screen unmounting the form (see ApplicationValues). */
  const applicationRef = useRef<ApplicationValues | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  /** Token from the visible reCAPTCHA checkbox. Single-use and
   *  expires after ~2 minutes, so it is cleared after every attempt. */
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<RecaptchaCheckboxHandle | null>(null);
  /**
   * The business already attached to the signed-in account, if any.
   * undefined while unknown, null once we know there is none.
   *
   * This decides whether submitting is safe. /api/merchants/apply updates
   * the signed-in member's existing record rather than adding a second
   * one — so a merchant signed in as one business, filling this form in
   * for another, would not create it: they would overwrite the business
   * they already have, name, address, phone and all, and send it back to
   * Pending. Nothing on screen warned them.
   */
  const [existingBusiness, setExistingBusiness] = useState<
    { businessName?: string } | null | undefined
  >(undefined);

  // WixProvider starts with member === undefined and resolves it
  // asynchronously, so isLoggedIn is false on the first render for a
  // signed-in visitor too. Acting on that was the whole bug: the effect
  // recorded "no business" before anyone had looked, the form rendered,
  // and submitting overwrote the very record the guard existed to
  // protect. Nothing may be concluded until member has resolved.
  const authResolved = member !== undefined;

  useEffect(() => {
    if (!authResolved) return;
    if (!isLoggedIn) {
      setExistingBusiness(null);
      return;
    }
    let cancelled = false;
    fetch("/api/merchants/me")
      .then((res) => (res.ok ? res.json() : { item: null }))
      .then(({ item }) => {
        if (!cancelled) setExistingBusiness(item ?? null);
      })
      // A failed lookup stays unknown. It used to resolve to null, which
      // meant one flaky request re-opened the overwrite path silently —
      // the opposite of what a guard should do when it can't see.
      .catch(() => {
        if (!cancelled) setExistingBusiness(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [authResolved, isLoggedIn]);
  /**
   * Whether the visible checkbox has been revealed.
   *
   * Starts false and normally stays false: the invisible check runs
   * silently on submit and only interrupts someone reCAPTCHA finds
   * suspicious. The checkbox appears only if Wix rejects that token —
   * which tells us this project requires the visible variant — and from
   * then on this session uses it.
   */
  const [needsVisibleCaptcha, setNeedsVisibleCaptcha] = useState(false);
  // Pre-filled with WELCOME6 (or a real ?ref= referral code, if that's how
  // the visitor arrived) — same default as before, just visible and
  // editable now instead of a hidden field, so someone who wants to swap
  // in a different referral code they were given can actually do that.
  const [couponCode, setCouponCode] = useState(referralPrefill || "WELCOME6");

  // Which of the three things the promo field currently holds, so the help
  // text under it can say what will actually happen rather than always
  // promising the WELCOME6 offer.
  const trimmedCoupon = couponCode.trim().toUpperCase();
  const promoState: "welcome" | "referral" | "empty" =
    trimmedCoupon === "WELCOME6" ? "welcome" : trimmedCoupon === "" ? "empty" : "referral";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Set once Wix comes back with EMAIL_VERIFICATION_REQUIRED — the rest of
  // the form stays filled in underneath while this is shown, nothing is
  // lost, the verification code just has to clear before the application
  // itself gets submitted.
  const [pendingState, setPendingState] = useState<unknown>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  /** Seconds left before another code can be requested. Sending email on
   *  demand needs a brake: without one an impatient visitor can fire off a
   *  dozen in a few seconds, which is a spam complaint waiting to happen
   *  and can get a sending domain thrown into junk folders for everyone. */
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Warm reCAPTCHA while the visitor is still filling the form, so
  // obtaining the token adds nothing to the wait after they submit.
  useEffect(() => {
    preloadCaptcha();
  }, []);

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

    // Only when an account is being created. A signed-in visitor has no
    // password field rendered, so `password` is "" and these would reject
    // the form on a credential they were never asked for — which is how
    // the already-signed-in path stayed broken despite being handled
    // further down.
    if (!isLoggedIn) {
      if (password.length < 8) {
        setSubmitError("Your password needs to be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setSubmitError("Those passwords don't match.");
        return;
      }
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

    // Only once the checkbox is actually showing. Before that the
    // invisible check runs inside the submit below and there is nothing
    // for anyone to tick.
    if (needsVisibleCaptcha && !captchaToken) {
      setSubmitError("Please tick the \u201cI'm not a robot\u201d box below to continue.");
      return;
    }

    // Snapshot the form NOW, while it's still mounted — finishAfterAuth may
    // not run until after the verify-code screen has replaced it.
    applicationRef.current = readApplicationValues(formData);

    // Already signed in: the Wix account exists, so there is nothing to
    // register and the application is all that's missing. Without this the
    // page is a loop — the portal tells someone with no application on
    // file to "Sign up your business", and registering again answers
    // "you've already got an account, sign in instead", which is where
    // they just came from. Reachable in practice: any signup whose
    // verification timed out leaves exactly this state.
    // Unknown is not permission. Submitting here is what destroys data,
    // so it waits for a definite answer rather than assuming a safe one.
    if (!authResolved || (isLoggedIn && existingBusiness === undefined)) {
      setSubmitError("Just checking your account — try again in a moment.");
      return;
    }

    if (isLoggedIn && existingBusiness) {
      setSubmitError(
        `You're signed in as ${existingBusiness.businessName || "an existing business"}. Sending this form would replace that business's details rather than add a new one — sign out first to list a different business.`
      );
      return;
    }

    if (isLoggedIn) {
      setSubmitting(true);
      try {
        await finishAfterAuth();
      } catch (err: any) {
        setSubmitError(
          friendlyError(err, "Something went wrong saving your business details. Please try again.")
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      // Invisible first, so a normal visitor never sees a challenge at
      // all — reCAPTCHA only interrupts someone it finds suspicious,
      // which is the whole point of the invisible variant on a page whose
      // job is conversions. The visible checkbox is used only once Wix has
      // told us, by rejecting a token, that it insists on that variant.
      const tokens = needsVisibleCaptcha
        ? { recaptchaToken: captchaToken }
        : {
            invisibleRecaptchaToken: await getInvisibleCaptchaToken(
              (client.auth as { captchaInvisibleSiteKey?: string }).captchaInvisibleSiteKey ?? ""
            ),
          };

      const outcome = await withTimeout(
        registerMember(client, email, password, businessName, tokens),
        AUTH_TIMEOUT_MS,
        "That took too long. Please check your connection and try again — if your account was created, you can sign in to your portal instead."
      );

      // Wix refused the invisible token. Rather than dead-end someone who
      // filled the whole form in, reveal the checkbox and let them finish
      // — their answers are all still on screen, and this is the one
      // outcome that proves the visible variant is required here.
      if (
        !needsVisibleCaptcha &&
        // Wix asking for a CAPTCHA outright is the same situation as it
        // refusing our silent token: the checkbox is what resolves both.
        // "user" specifically means Wix judged this attempt suspicious —
        // which is exactly when a challenge should appear, and previously
        // dead-ended with "try again in a moment", something no amount of
        // retrying could clear.
        (outcome.status === "captcha" ||
          (outcome.status === "error" &&
            (outcome.errorCode === "missingCaptchaToken" ||
              outcome.errorCode === "invalidCaptchaToken")))
      ) {
        setNeedsVisibleCaptcha(true);
        setSubmitError(
          "One more step — please tick the \u201cI'm not a robot\u201d box below, then submit again."
        );
        return;
      }

      await handleOutcome(outcome);
    } catch (err: any) {
      setSubmitError(
        friendlyError(err, "Something went wrong submitting your application. Please try again.")
      );
    } finally {
      setSubmitting(false);
      // reCAPTCHA tokens are single-use. Whatever happened above, this one
      // is spent — leaving it in state would make the next attempt fail
      // with a rejected token rather than a missing one.
      captchaRef.current?.reset();
    }
  }

  // Counts the cooldown down once a second while it is running.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  /**
   * Sends a fresh verification code.
   *
   * There is no resend method in this SDK. Wix documents
   * resendVerificationCodeEmail() only for the Velo / frontend members
   * module, and @wix/auto_sdk_identity_verification exports just `start`
   * and `verifyDuringAuthentication` — the /auth/resend path appears in
   * its routing metadata but nothing wraps it.
   *
   * So this uses documented behaviour instead of an undocumented endpoint:
   * Wix states that when authentication returns EMAIL_VERIFICATION_REQUIRED
   * "an email with a verification code is sent automatically". Signing in
   * with the credentials just used to register returns exactly that state
   * for an account whose email is not yet verified — so the code arrives,
   * and the fresh pendingState replaces the old one, which matters because
   * the previous state token is what the new code is checked against.
   *
   * https://dev.wix.com/docs/go-headless/develop-your-project/self-managed-headless/authentication/members/custom-login-page/custom-login/custom-login-using-the-js-sdk
   */
  async function handleResendCode() {
    if (resendCooldown > 0 || submitting || !client?.auth) return;

    setSubmitError(null);
    setResendNotice(null);
    setSubmitting(true);
    try {
      const captchaTokens = needsVisibleCaptcha
        ? { recaptchaToken: captchaToken }
        : {
            invisibleRecaptchaToken: await getInvisibleCaptchaToken(
              (client.auth as { captchaInvisibleSiteKey?: string }).captchaInvisibleSiteKey ?? ""
            ),
          };

      const outcome = await withTimeout(
        loginMember(client, pendingEmail, password, captchaTokens),
        AUTH_TIMEOUT_MS,
        "That took too long. Please check your connection and try again."
      );

      if (outcome.status === "verify") {
        // Swap in the new state token — the fresh code is checked against
        // this one, so keeping the old would reject a perfectly good code.
        setPendingState(outcome.pendingState);
        setResendNotice(`New code sent to ${pendingEmail}. It can take a minute to arrive.`);
        setResendCooldown(30);
      } else if (outcome.status === "success") {
        // Already verified in another tab or on another device — nothing
        // left to enter, so finish the application rather than sit on a
        // code screen that can no longer be satisfied.
        await finishAfterAuth();
      } else {
        setSubmitError(
          outcome.status === "error"
            ? outcome.message
            : "We couldn't send a new code just now. Please try again shortly."
        );
      }
    } catch (err: any) {
      setSubmitError(friendlyError(err, "We couldn't send a new code. Please try again."));
    } finally {
      setSubmitting(false);
      captchaRef.current?.reset();
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
          {resendNotice && (
            <p role="status" className="text-sm font-semibold text-green-700">
              {resendNotice}
            </p>
          )}
          {submitError && <p className="text-sm text-ember-600">{submitError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Verify & finish signing up"}
          </button>

          {/* Codes go missing — spam folders, typo'd addresses, slow mail.
              Without this the only way out was abandoning the signup, and
              the account already exists by this point, so starting again
              with the same address just returns "you already have an
              account". A dead end at the last step of the funnel. */}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={submitting || resendCooldown > 0}
            className="w-full text-center text-sm font-semibold text-brand-700 underline underline-offset-2 transition hover:text-brand-800 disabled:no-underline disabled:opacity-60"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't get the code? Send it again"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Check your spam folder too — it sometimes lands there.
          </p>
        </form>
      </div>
    );
  }

  // Don't show a form we might have to refuse. While the account is still
  // resolving, a signed-in visitor would otherwise see every field live
  // and fillable, type the lot, and only then be told it can't be sent —
  // which is both the reported complaint and the window the overwrite
  // happened in.
  if (!authResolved || (isLoggedIn && existingBusiness === undefined)) {
    return (
      <div
        id="signup"
        className="scroll-mt-[140px] rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8"
      >
        <p className="text-sm font-semibold text-slate-500">Checking your account…</p>
        <div aria-hidden className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  // Signed in with a business already attached: don't show the form at
  // all. Letting someone fill in twenty fields and only then telling them
  // it would overwrite their existing business wastes their time, and the
  // one time they ignore the warning it costs them their listing.
  if (isLoggedIn && existingBusiness) {
    return (
      <div
        id="signup"
        className="scroll-mt-[140px] rounded-2xl border border-brand-100 bg-brand-50 p-6 shadow-card sm:p-8"
      >
        <h3 className="text-lg font-bold text-brand-900">
          You&apos;re already signed in
        </h3>
        <p className="mt-2 text-sm text-brand-800">
          This account is linked to{" "}
          <strong>{existingBusiness.businessName || "a business"}</strong>. You can manage it from
          your portal.
        </p>
        <p className="mt-2 text-sm text-brand-700/90">
          Listing a second, different business? Sign out first — otherwise this form would update
          the business above rather than create a new one.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href="/portal"
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Go to my portal →
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex h-11 items-center justify-center rounded-full border border-brand-300 px-6 text-sm font-bold text-brand-700 transition hover:bg-white"
          >
            Sign out to list another business
          </button>
        </div>
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

        {/* Credentials are only asked for when there is no account yet.
            Someone already signed in has one — asking again would be odd,
            and the fields being `required` would block the form outright
            on values they have no reason to retype. */}
        {isLoggedIn ? (
          <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            You&rsquo;re already signed in, so we just need your business details below — no new
            password required.
          </div>
        ) : (
          <>
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
          </>
        )}

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
          {/*
            The promo code and peer referral codes share this one field, and
            the approval logic treats them as mutually exclusive (see the
            `if (promo) ... else if (referral)` branches in
            app/api/admin/merchants/[id]/route.ts). Someone arriving on a
            ?ref= link therefore has the referrer's code pre-filled here
            while the rest of the page advertises the 6-month offer — so
            without this they would have quietly forfeited the much larger
            offer they came for, and only found out after approval.
          */}
          {promoState === "welcome" && (
            <p className="mt-1 text-sm text-slate-500">
              🎁 WELCOME6 gets you up to 6 months free advertising if you&apos;re approved before launch.
            </p>
          )}
          {promoState === "referral" && (
            <p className="mt-1 text-sm text-slate-600">
              You&apos;re using referral code{" "}
              <span className="font-semibold">{couponCode.trim()}</span>. A referral code and the
              WELCOME6 launch offer can&apos;t be combined — only one applies.{" "}
              <button
                type="button"
                onClick={() => setCouponCode("WELCOME6")}
                className="font-semibold text-brand-600 underline hover:no-underline"
              >
                Use WELCOME6 instead
              </button>{" "}
              for up to 6 months free advertising.
            </p>
          )}
          {promoState === "empty" && (
            <p className="mt-1 text-sm text-slate-600">
              No promo code applied.{" "}
              <button
                type="button"
                onClick={() => setCouponCode("WELCOME6")}
                className="font-semibold text-brand-600 underline hover:no-underline"
              >
                Add WELCOME6
              </button>{" "}
              for up to 6 months free advertising if you&apos;re approved before launch.
            </p>
          )}
        </div>

        <label className="flex items-start gap-2 text-base text-slate-600">
          <input
            required
            type="checkbox"
            name="agreedToTerms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            /* 20px, not 16px: below 24px this is a hard target to tap on a
               phone (WCAG 2.2 SC 2.5.8). The wrapping <label> already makes
               the text tappable too. */
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

        {/* Hidden unless Wix has rejected an invisible token, so the usual
            signup shows no challenge at all. Wix verifies the token, so the
            site key must be Wix's own — it comes off the SDK client. */}
        {needsVisibleCaptcha && (
          <RecaptchaCheckbox
            ref={captchaRef}
            siteKey={(client?.auth as { captchaVisibleSiteKey?: string } | undefined)?.captchaVisibleSiteKey ?? ""}
            onChange={setCaptchaToken}
          />
        )}

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
