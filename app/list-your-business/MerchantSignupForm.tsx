"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/context/SessionProvider";
import { currentPromo, promoForCode } from "@/lib/promo";
import { referralCreditsLabel } from "@/lib/referralBonus";
import { codeNotSentText, registerMember, resendCode, submitVerificationCode, waitText, type AuthOutcome } from "@/lib/siteAuth";
import { clearPendingSignup, readPendingSignup, savePendingSignup } from "@/lib/pendingSignup";
import { getTurnstileToken, preloadTurnstile } from "@/lib/turnstileClient";
import PasswordField from "@/components/PasswordField";
import { EyeOffIcon } from "@/components/icons";
import { trackMetaPixelEvent, trackMetaCustomEvent } from "@/lib/metaPixel";
import { getAttribution, getFbc, getFbp } from "@/lib/attribution";
import { AUTH_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";
import { NAME_MARKUP_MESSAGE, NO_MARKUP_PATTERN } from "@/lib/nameRules";
import { passwordRuleProblem } from "@/lib/passwordRules";

function RequiredTag() {
  return <span className="ml-1 font-normal text-ember-600">Required</span>;
}

/** A field that's only for MegaDeal, never shown on the site (same tag as
 *  the portal profile form). */
function PrivateTag() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-slate-600">
      <EyeOffIcon className="h-3 w-3" />
      Private
    </span>
  );
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

/** The redesigned form's messages, shown under the field they're about
 *  (keyed by input id, or name for a field without one). Anything not
 *  listed falls back to the browser's own message. */
/** Seconds between codes: the server's gap too (app/api/auth/resend-code). */
const RESEND_SECONDS = 60;

const FIELD_MESSAGES: Record<string, { missing: string; invalid?: string }> = {
  "signup-contactName": { missing: "Enter your name.", invalid: NAME_MARKUP_MESSAGE },
  "signup-email": { missing: "Enter your email address.", invalid: "Enter a valid email address, like you@business.co.nz." },
  "signup-password": { missing: "Create a password." },
  "signup-businessName": { missing: "Enter your business name.", invalid: NAME_MARKUP_MESSAGE },
  "signup-agreedToTerms": { missing: "Tick the box to agree to the terms and privacy policy." },
};

function fieldKey(el: Element): string {
  return el.id || el.getAttribute("name") || "";
}

/**
 * The sign-up asks only what creating the account needs: business name,
 * your name, email, a password and agreeing to the terms (10 Oct 2026,
 * the way Groupon and Shopify do it). Then the emailed code, then the
 * portal, where the listing is finished: phones, address, the legal
 * company name, photos (MerchantProfileForm, checked by
 * /api/merchants/profile before it goes for approval). The offer code is
 * applied for them and a referral comes from the ?ref= link; both can
 * still be typed behind "Have a code?".
 */


/**
 * Turns a thrown value into something safe to put in front of a business
 * owner.
 *
 * The catch blocks here used to render `err.message` verbatim, so a
 * failure showed the visitor raw internals like "Cannot read
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
  couponCode: string;
  referredByCode: string;
  honeypot: string;
  agreedToTerms: boolean;
  /** Ticked "Email me MegaDeal business news" (unticked to start). */
};

function readApplicationValues(formData: FormData): ApplicationValues {
  // The name customers know the business by: it's the public listing's
  // name. The legal / registered name, and the phones, are asked on the
  // listing page in the portal (MerchantProfileForm), required there
  // before the listing goes for approval; asking for the legal name here
  // put "Limited" on listings.
  return {
    businessName: String(formData.get("businessName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    couponCode: String(formData.get("couponCode") ?? ""),
    referredByCode: String(formData.get("referredByCode") ?? ""),
    honeypot: String(formData.get(HONEYPOT_FIELD) ?? ""),
    agreedToTerms: formData.get("agreedToTerms") === "on",
  };
}

/** Submits everything the /list-your-business form collected to create (or claim)
 *  the business application — called only once the account itself exists
 *  and its email is verified. Returns the Meta event
 *  ID the server generated for this conversion (see /api/merchants/apply
 *  and lib/metaCapi.ts), so the caller's browser-side Pixel event can
 *  share it — undefined when this was a resubmission, not a first signup. */
async function submitApplication(values: ApplicationValues): Promise<string | undefined> {
  const res = await fetch("/api/merchants/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: values.businessName,
      contactName: values.contactName,
      couponCode: values.couponCode,
      referredByCode: values.referredByCode,
      mg_contact_ref: values.honeypot,
      agreedToTerms: values.agreedToTerms,
      // First-touch ad attribution (see lib/attribution.ts) — carried
      // through to Meta's Conversions API as this conversion's custom_data
      // so ad campaigns can eventually be judged on actual registrations,
      // not just clicks.
      attribution: getAttribution() ?? undefined,
      fbp: getFbp(),
      fbc: getFbc(),
      eventSourceUrl: window.location.href,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Your account was created, but we couldn't save your business details. Please contact us so we can sort it out.");
  }
  const data = await res.json().catch(() => ({}));
  return typeof data.metaEventId === "string" ? data.metaEventId : undefined;
}

export default function MerchantSignupForm({
  /** SITE_LAUNCHED, from the server page: picks the current offer (WELCOME6
   *  before launch, WELCOME3 after — lib/promo.ts). The runtime flag isn't
   *  visible in the browser, so it's passed in. */
  launched = false,
  /** The redesigned page (LIST_BUSINESS_DESIGN=v2): the same fields and
   *  submit in its own type and spacing, with each problem shown under
   *  its field. */
  redesign = false,
}: {
  launched?: boolean;
  redesign?: boolean;
}) {
  const promo = currentPromo(launched);
  const { member, isLoggedIn, logout } = useSession();
  // The login service's rule (lib/authRoutes.ts).
  const minPassword = 10;
  const searchParams = useSearchParams();
  const referralPrefill = searchParams.get("ref") || "";
  const startedRef = useRef(false);
  /** Snapshot of the form taken at submit time — survives the verify-code
   *  screen unmounting the form (see ApplicationValues). */
  const applicationRef = useRef<ApplicationValues | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  /** Redesigned layout: problems found on submit, by field. Empty until
   *  then, so untouched fields never look wrong; a field's message clears
   *  as soon as it's edited. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  // SessionProvider starts with member === undefined and resolves it
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
      // A failed lookup resolves to null, which no longer re-opens
      // anything: being signed in is what closes the form, and this only
      // picks which wording to close it with. Leaving it unknown would
      // now strand a signed-in visitor on the loading skeleton forever
      // whenever this request failed.
      .catch(() => {
        if (!cancelled) setExistingBusiness(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authResolved, isLoggedIn]);
  // Pre-filled with the current offer's code. A referral (?ref= link, or
  // a code someone was given) has its own box: the two apply together
  // (lib/referralBonus.ts), so a referred business keeps its offer.
  const [couponCode, setCouponCode] = useState(promo.code);
  const [referredByCode, setReferredByCode] = useState(referralPrefill.trim().toUpperCase().slice(0, 20));
  /** The code boxes, folded away behind "Have a code?": the offer is
   *  already applied and a referral link fills its own. */
  const [showCodes, setShowCodes] = useState(false);
  /** Whether the referral code belongs to a business, checked as it's
   *  typed (or from the ?ref= link), so the bonus is only promised for a
   *  real one. "unknown" when the check couldn't run: the code is still
   *  sent, and approval checks it again either way. */
  const [referralCheck, setReferralCheck] = useState<{ code: string; status: "valid" | "invalid" | "unknown" } | null>(null);
  const trimmedReferral = referredByCode.trim();
  // The answer is for the code it was asked about; while a newer code is
  // waiting for its answer, it's "checking".
  const referralStatus = referralCheck?.code === trimmedReferral ? referralCheck.status : "checking";
  useEffect(() => {
    if (!trimmedReferral) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const done = (status: "valid" | "invalid" | "unknown") => {
        if (!cancelled) setReferralCheck({ code: trimmedReferral, status });
      };
      fetch(`/api/merchants/referral-check?code=${encodeURIComponent(trimmedReferral)}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => done(data ? (data.valid ? "valid" : "invalid") : "unknown"))
        .catch(() => done("unknown"));
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedReferral]);
  const referralNote = !trimmedReferral
    ? null
    : referralStatus === "valid"
      ? `Referral ${trimmedReferral} found: when you're approved, you and the business that referred you each get ${referralCreditsLabel}.`
      : referralStatus === "invalid"
        ? `We can't find referral code ${trimmedReferral}. Check it with the business that gave it to you.`
        : referralStatus === "unknown"
          ? `Referral ${trimmedReferral} added. We'll check it when we review your application.`
          : `Checking referral ${trimmedReferral}…`;

  // Which of the three things the promo field currently holds, so the help
  // text under it can say what will actually happen rather than always
  // promising the free-advertising offer. After launch, WELCOME6 still counts
  // (as the launch offer), the same rule approval uses.
  const trimmedCoupon = couponCode.trim().toUpperCase();
  const promoState: "welcome" | "other" | "empty" =
    promoForCode(trimmedCoupon, launched) ? "welcome" : trimmedCoupon === "" ? "empty" : "other";
  const beforeLaunch = launched ? "" : " if you're approved before launch";

  // One box with a show/hide eye, no "confirm password": the eye lets
  // them check it, with half the typing.
  const [password, setPassword] = useState("");

  // Set once the account needs its emailed code — the rest of
  // the form stays filled in underneath while this is shown, nothing is
  // lost, the verification code just has to clear before the application
  // itself gets submitted.
  const [pendingState, setPendingState] = useState<{ email: string } | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  /** Seconds left before another code can be requested. Sending email on
   *  demand needs a brake: without one an impatient visitor can fire off a
   *  dozen in a few seconds, which is a spam complaint waiting to happen
   *  and can get a sending domain thrown into junk folders for everyone. */
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  /** The code couldn't be emailed just now (T240): say so, not "we've sent". */
  const [codeNotSent, setCodeNotSent] = useState(false);
  const [code, setCode] = useState("");

  // Warm the robot check while the visitor is still filling the form, so
  // obtaining the token adds nothing to the wait after they submit.
  useEffect(() => {
    preloadTurnstile();
  }, []);

  /** The robot check's token (Turnstile: it only interrupts someone it
   *  finds suspicious). */
  const captchaToken = () => getTurnstileToken(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "");

  function trackFormStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    window.gtag?.("event", "form_start", { form_name: "merchant_signup" });
    // No standard Meta event fits "started the registration form" — it's
    // not a completed Lead and InitiateCheckout is a commerce term that
    // doesn't apply here, so this is a custom event (see
    // trackMetaCustomEvent in lib/metaPixel.ts) rather than one of
    // Meta's fixed standard ones.
    trackMetaCustomEvent("StartBusinessRegistration", { content_name: "business_signup" });
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
    const metaEventId = await submitApplication(values);
    clearPendingSignup();
    window.gtag?.("event", "form_complete", { form_name: "merchant_signup" });
    // The real conversion event for business-recruitment ad campaigns — a
    // completed application, not just a click or an email signup. Shares
    // metaEventId with the server-side Conversions API call the apply
    // route just made for the same conversion, so Meta dedupes the two
    // into one instead of double-counting (see lib/metaCapi.ts).
    trackMetaPixelEvent("CompleteRegistration", { content_name: "business_signup" }, metaEventId);
    window.gtag?.("event", "sign_up", { method: "merchant_signup" });
    window.location.href = "/portal";
  }

  async function handleOutcome(outcome: AuthOutcome) {
    if (outcome.status === "success") {
      await finishAfterAuth();
    } else if (outcome.status === "verify") {
      setPendingState(outcome.pendingState);
      setPendingEmail(outcome.email);
      // Never "we've sent" when it wasn't (T240): when Resend can try again.
      setCodeNotSent(!outcome.codeSent);
      setResendCooldown(outcome.codeSent ? RESEND_SECONDS : (outcome.retryAfterSec ?? RESEND_SECONDS));
      // So Refresh or Back doesn't lose the code screen (lib/pendingSignup.ts).
      savePendingSignup(outcome.email, applicationRef.current);
    } else {
      setSubmitError(outcome.message);
    }
  }

  /** Redesigned layout: the browser's own checks on the fields, as
   *  messages for each field that fails (the form is noValidate there, so
   *  they show under the field rather than as the browser's bubble). */
  function browserErrors(box: HTMLElement | null): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!box) return errors;
    const fields = box.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
    for (const el of Array.from(fields)) {
      if (el.name === HONEYPOT_FIELD || el.checkValidity()) continue;
      const key = fieldKey(el);
      const text = FIELD_MESSAGES[key];
      errors[key] = (el.validity.valueMissing ? text?.missing : text?.invalid) ?? el.validationMessage;
    }
    return errors;
  }

  /** The fields, then the password rule. */
  function formErrors(form: HTMLFormElement): Record<string, string> {
    const errors = browserErrors(form);
    if (!errors["signup-password"] && password.length < minPassword) {
      errors["signup-password"] = `Use at least ${minPassword} characters.`;
    }
    // The same rules as the server (lib/passwordRules.ts, T255), with the
    // business name the server doesn't see at this step.
    if (!errors["signup-password"] && password) {
      const field = (name: string) => String(new FormData(form).get(name) ?? "");
      const problem = passwordRuleProblem(password, { email: field("email"), businessName: field("businessName") });
      if (problem) errors["signup-password"] = problem;
    }
    return errors;
  }

  /** Shows the messages and focuses the first field with one (in page
   *  order). True when there are none. */
  function showFieldErrors(errors: Record<string, string>, box: HTMLElement | null): boolean {
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) return true;
    const first = Array.from(box?.querySelectorAll<HTMLElement>("input, select, textarea") ?? []).find(
      (el) => errors[fieldKey(el)]
    );
    first?.focus();
    return false;
  }

  function clearFieldError(target: EventTarget) {
    if (!(target instanceof Element)) return;
    const key = fieldKey(target);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /** The props an input needs while it has a message. */
  function errorProps(id: string) {
    return fieldErrors[id] ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};
  }

  function fieldError(id: string) {
    return fieldErrors[id] ? (
      <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-red-700">
        {fieldErrors[id]}
      </p>
    ) : null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    if (redesign && !showFieldErrors(formErrors(e.currentTarget), e.currentTarget)) return;

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

    // Only when an account is being created. A signed-in visitor has no
    // password field rendered, so `password` is "" and these would reject
    // the form on a credential they were never asked for — which is how
    // the already-signed-in path stayed broken despite being handled
    // further down.
    if (!isLoggedIn) {
      if (password.length < minPassword) {
        setSubmitError(`Your password needs to be at least ${minPassword} characters.`);
        return;
      }
      const form = new FormData(e.currentTarget);
      const passwordProblem = passwordRuleProblem(password, {
        email: String(form.get("email") ?? ""),
        businessName: String(form.get("businessName") ?? ""),
      });
      if (passwordProblem) {
        setSubmitError(passwordProblem);
        return;
      }
    }
    if (!agreedToTerms) {
      setSubmitError("You must agree to the Terms and Conditions to apply.");
      return;
    }

    // Snapshot the form NOW, while it's still mounted — finishAfterAuth may
    // not run until after the verify-code screen has replaced it.
    applicationRef.current = readApplicationValues(formData);

    // Already signed in: the account exists, so there is nothing to
    // register and the application is all that's missing. Without this the
    // page is a loop — the portal tells someone with no application on
    // file to "Sign up your business", and registering again answers
    // "you've already got an account, sign in instead", which is where
    // they just came from. Reachable in practice: any signup whose
    // verification timed out leaves exactly this state.
    // Unknown is not permission. Submitting here is what destroys data,
    // so it waits for a definite answer rather than assuming a safe one.
    if (!authResolved) {
      setSubmitError("Just checking your account — try again in a moment.");
      return;
    }

    // Signed in at all is the disqualifier, not "signed in and holding a
    // business record". Since listings are completed in the portal, a
    // member can legitimately be signed in with no Merchants row yet —
    // and the old guard read that absence as permission and opened the
    // whole form, which is the reported bug. Whichever side of that line
    // they're on, this form is the wrong place for them: with a business
    // it overwrites one, without a business the portal is already holding
    // their half-finished listing.
    if (isLoggedIn) {
      setSubmitError(
        existingBusiness
          ? `You're signed in as ${existingBusiness.businessName || "an existing business"}. Sending this form would replace that business's details rather than add a new one — sign out first to list a different business.`
          : "You're already signed in — finish your listing in your portal rather than starting a second signup. Sign out first to list a different business."
      );
      return;
    }

    setSubmitting(true);
    try {
      // The robot check first, on its own clock: a challenge shown to the
      // visitor can take a while, and timing it with the request blamed
      // their connection for a check they hadn't finished.
      const token = await captchaToken();
      const outcome = await withTimeout(
        registerMember(email, password, token),
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

  // Back on the code screen after a Refresh, or Back then Forward (T172):
  // the sign-up this tab was confirming. Not once signed in: then the
  // email is confirmed and the code screen has nothing left to do.
  useEffect(() => {
    if (!authResolved) return;
    if (isLoggedIn) {
      clearPendingSignup();
      return;
    }
    if (pendingState) return;
    const pending = readPendingSignup<ApplicationValues>();
    if (!pending) return;
    applicationRef.current = pending.application;
    setPendingState({ email: pending.email });
    setPendingEmail(pending.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authResolved, isLoggedIn]);

  /** Back to the form, to sign up with a different email. */
  function changeEmail() {
    clearPendingSignup();
    setPendingState(null);
    setPendingEmail("");
    setCode("");
    setSubmitError(null);
    setResendNotice(null);
    setCodeNotSent(false);
  }

  // Counts the cooldown down once a second while it is running.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  /** Sends a fresh verification code, by email address alone (T240): no
   *  password or robot check to go stale. */
  async function handleResendCode() {
    if (resendCooldown > 0 || submitting) return;

    setSubmitError(null);
    setResendNotice(null);
    setSubmitting(true);
    try {
      const res = await withTimeout(resendCode(pendingEmail), AUTH_TIMEOUT_MS, "That took too long. Please try again.");
      if (res.sent) {
        setCodeNotSent(false);
        setResendNotice(`New code sent to ${pendingEmail}. It can take a minute to arrive.`);
        setResendCooldown(RESEND_SECONDS);
      } else {
        setResendCooldown(res.retryAfterSec ?? RESEND_SECONDS);
        setSubmitError(res.message ?? codeNotSentText(res.retryAfterSec));
      }
    } catch (err: any) {
      setSubmitError(friendlyError(err, "We couldn't send a new code. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const outcome = await withTimeout(
        submitVerificationCode(code, pendingState, password),
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
      <div className="mx-auto max-w-sm rounded-2xl border border-brand-100 bg-brand-50 p-6 text-center">
        <h3 className="text-lg font-bold text-brand-800">Almost there — check your email</h3>
        <p className="mt-2 text-sm text-brand-700" role={codeNotSent ? "alert" : undefined}>
          {codeNotSent ? (
            <>
              We couldn&apos;t send the email to <strong className="[overflow-wrap:anywhere]">{pendingEmail}</strong> just now.{" "}
              {resendCooldown > 0 ? `Try Resend in ${waitText(resendCooldown)}.` : "Try Resend below."}
            </>
          ) : (
            <>
              We&apos;ve sent a verification code to <strong className="[overflow-wrap:anywhere]">{pendingEmail}</strong>.
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-brand-700">
          {codeNotSent ? "When it arrives, enter it below" : "Enter it below"}, then you&apos;ll finish your listing in your portal.
        </p>
        <form onSubmit={handleVerifySubmit} className="mx-auto mt-4 max-w-xs space-y-3">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Verification code from your email"
            autoComplete="one-time-code"
            inputMode="numeric"
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
            {submitting ? "Checking…" : "Confirm my email"}
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
          <button
            type="button"
            onClick={changeEmail}
            className="w-full text-center text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-800"
          >
            Use a different email
          </button>
          {/* One business per email: an address that already has an
              account gets a "sign in instead" email, not a code
              (app/api/auth/register). */}
          <p className="text-center text-xs text-slate-500">
            Already have an account with this email? We&apos;ll have emailed you how to{" "}
            <a href="/portal" className="font-semibold text-brand-700 underline">
              sign in
            </a>{" "}
            instead.
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
        className={
          redesign
            ? "scroll-mt-[140px] rounded-xl border border-[#E4E2E8] bg-white px-4 py-3.5 sm:p-5 lg:rounded-2xl lg:px-6 lg:py-4"
            : "scroll-mt-[140px] rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8"
        }
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

  // Signed in at all: don't show the form. Letting someone fill in twenty
  // fields and only then telling them it would overwrite their existing
  // business wastes their time, and the one time they ignore the warning
  // it costs them their listing. A signed-in member with no business yet
  // is the same story from the other end — their listing is waiting in
  // the portal, and a second signup here is not what they want either.
  if (isLoggedIn) {
    return (
      <div
        id="signup"
        className="scroll-mt-[140px] rounded-2xl border border-brand-100 bg-brand-50 p-6 shadow-card sm:p-8"
      >
        <h3 className="text-lg font-bold text-brand-900">
          You&apos;re already signed in
        </h3>
        {existingBusiness ? (
          <>
            <p className="mt-2 text-sm text-brand-800">
              This account is linked to{" "}
              <strong>{existingBusiness.businessName || "a business"}</strong>. You can manage it
              from your portal.
            </p>
            <p className="mt-2 text-sm text-brand-700/90">
              Listing a second, different business? Sign out first — otherwise this form would
              update the business above rather than create a new one.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-brand-800">
              Your account is all set — there&apos;s nothing left to do on this page. The last step
              is your business details, and that&apos;s waiting for you in your portal.
            </p>
            <p className="mt-2 text-sm text-brand-700/90">
              Listing a different business? Sign out first and sign up with that business&apos;s own
              email address.
            </p>
          </>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href="/portal"
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            {existingBusiness ? "Go to my portal →" : "Finish my listing →"}
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

  // Redesigned page: its own type, spacing and controls, from the
  // approved white design, made compact (17 Oct 2026) and again (24 Oct
  // 2026, "look easy to complete"): less padding, shorter controls (44px on
  // a phone, still a full-size touch target, and 16px text there so
  // iPhones don't zoom in; 38px on a computer), smaller print for the
  // notes, tighter gaps. Every field and word stays. The older page keeps
  // its existing look.
  const cardClass = redesign
    ? "scroll-mt-[140px] rounded-xl border border-[#E4E2E8] bg-white px-4 py-3.5 sm:p-5 lg:rounded-2xl lg:px-6 lg:py-4"
    : "scroll-mt-[140px] rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8";
  const labelClass = redesign
    ? "mb-1 block text-[13px] font-semibold leading-tight text-[#222126]"
    : "mb-1 block text-base font-medium text-slate-700";
  const inputClass = redesign
    ? "h-11 w-full rounded-[10px] border border-[#8F8999] bg-white px-3.5 text-base text-[#222126] outline-none lg:h-[38px] lg:text-[15px] transition placeholder:text-[#706B79] focus:border-brand-600 focus:ring-1 focus:ring-brand-600 aria-[invalid=true]:border-red-700 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-red-700"
    : "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400";
  const hintClass = redesign ? "mt-1 text-xs leading-snug text-[#625D6B] lg:leading-tight" : "mt-1 text-sm text-slate-500";
  const mutedClass = redesign ? "text-[#625D6B]" : "text-slate-500";
  // The business-name and password notes show once that field is in use
  // (24 Oct 2026, "box still too big"): until then the box is just the
  // fields. They stay once something's typed, so leaving the field doesn't
  // shrink the box and move the next tap's target. Still read out by
  // screen readers (aria-describedby), and a field's error message shows
  // whatever the focus.
  const hintWhileTyping = redesign
    ? "sr-only group-focus-within:not-sr-only group-focus-within:block group-has-[input:not(:placeholder-shown)]:not-sr-only group-has-[input:not(:placeholder-shown)]:block"
    : "";
  const primaryButtonClass = redesign
    ? "flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 lg:h-10 px-5 text-center text-base font-bold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    : "w-full rounded-full bg-brand-600 py-3.5 text-center font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 disabled:opacity-60";

  // Checked against lib/business.ts: the public listing is built from the
  // business name, phone, website and address only
  // (lib/businessPrivacy.test.ts).
  const privacyNote = (
    <p className={`flex items-start gap-2 ${redesign ? "mt-1.5 text-xs leading-snug" : "text-sm"} ${mutedClass}`}>
      <EyeOffIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>Your name and email are private: they&apos;re never shown on MegaDeal.</span>
    </p>
  );

  return (
    <div id="signup" className={cardClass}>
      <form
        onSubmit={handleSubmit}
        onChangeCapture={trackFormStarted}
        // Bubble phase, not capture: clearing a message re-renders the form,
        // and doing that before the field's own onChange had run reset a
        // controlled password box, losing a pasted or autofilled value.
        onInput={redesign ? (e) => clearFieldError(e.target) : undefined}
        noValidate={redesign}
        className={redesign ? "space-y-3 lg:space-y-2" : "space-y-4"}
      >
        {redesign && (
          <div>
            <h3 className="text-xl font-bold leading-tight text-[#222126]">
              Create your business account
            </h3>
            <p className="mt-0.5 text-[13px] leading-snug text-[#625D6B]">
              Takes a minute. We&apos;ll email you a code, then you finish your listing in your portal.
            </p>
          </div>
        )}

        {/* What's private and what isn't, up front: the business name is
            the public listing's name; your name and email are only for
            the account. */}
        <div className={redesign ? "grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 lg:gap-y-2" : "space-y-4"}>
          <div className={redesign ? "group sm:col-span-2" : undefined}>
            <label htmlFor="signup-businessName" className={labelClass}>
              Business name
              {!redesign && <RequiredTag />}
            </label>
            <input
              id="signup-businessName"
              required
              name="businessName"
              autoComplete="organization"
              type="text"
              maxLength={300}
              pattern={NO_MARKUP_PATTERN}
              placeholder="e.g. Harbourside Bistro"
              className={inputClass}
              aria-describedby="signup-businessName-hint"
              {...errorProps("signup-businessName")}
            />
            {fieldError("signup-businessName")}
            <p id="signup-businessName-hint" className={`${hintClass} ${hintWhileTyping}`}>
              The name customers know you by, shown on your listing. You&apos;ll add your registered
              company name (e.g. &ldquo;Harbourside Hospitality Limited&rdquo;) privately in your portal.
            </p>
          </div>

          <div>
            <label htmlFor="signup-contactName" className={labelClass}>
              Your name
              {!redesign && <RequiredTag />}
              {!redesign && <PrivateTag />}
            </label>
            <input
              id="signup-contactName"
              required
              name="contactName"
              autoComplete="name"
              type="text"
              maxLength={300}
              pattern={NO_MARKUP_PATTERN}
              placeholder="Full name"
              className={inputClass}
              {...errorProps("signup-contactName")}
            />
            {fieldError("signup-contactName")}
          </div>

          <div>
            <label htmlFor="signup-email" className={labelClass}>
              {redesign ? "Email address" : "Email"}
              {!redesign && <RequiredTag />}
              {!redesign && <PrivateTag />}
            </label>
            <input
              id="signup-email"
              required
              name="email"
              type="email"
              autoComplete="email"
              placeholder={redesign ? "you@business.co.nz" : "you@yourbusiness.co.nz"}
              className={inputClass}
              {...errorProps("signup-email")}
            />
            {fieldError("signup-email")}
          </div>

          <div className={redesign ? "group sm:col-span-2" : undefined}>
            <label htmlFor="signup-password" className={labelClass}>
              Password
              {!redesign && <RequiredTag />}
            </label>
            <PasswordField
              id="signup-password"
              required
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder="Create a password"
              inputClassName={inputClass}
              invalid={Boolean(fieldErrors["signup-password"])}
              describedBy={fieldErrors["signup-password"] ? "signup-password-error" : "signup-password-hint"}
            />
            {fieldError("signup-password")}
            <p id="signup-password-hint" className={`${hintClass} ${hintWhileTyping}`}>
              At least {minPassword} characters. Tap the eye to check what you typed.
            </p>
            {redesign && privacyNote}
          </div>
        </div>

        {!redesign && privacyNote}

        {/* The offer that's applied at approval (app/api/admin/merchants/
            [id]/route.ts) is in the hidden field below unless they change
            it, and a ?ref= link fills the referral. Both boxes are behind
            "Have a code?", so most people never see them. */}
        <div className={redesign ? "rounded-[10px] bg-[#F6F5F8] px-3 py-2 text-[13px] leading-snug text-[#37343D] lg:py-1.5 lg:text-xs" : "rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"}>
          {promoState === "welcome" && (
            <p className={redesign ? "inline" : undefined}>
              🎁 <strong>{trimmedCoupon}</strong> applied: up to {promo.months} months free advertising{beforeLaunch}.
            </p>
          )}
          {promoState === "other" && (
            <p>
              <strong>{couponCode.trim()}</strong> isn&apos;t a current offer code.{" "}
              <button type="button" onClick={() => setCouponCode(promo.code)} className="font-semibold text-brand-700 underline hover:no-underline">
                Use {promo.code}
              </button>{" "}
              for up to {promo.months} months free advertising{beforeLaunch}.
            </p>
          )}
          {promoState === "empty" && (
            <p>
              No offer code.{" "}
              <button type="button" onClick={() => setCouponCode(promo.code)} className="font-semibold text-brand-700 underline hover:no-underline">
                Add {promo.code}
              </button>{" "}
              for up to {promo.months} months free advertising{beforeLaunch}.
            </p>
          )}
          {referralNote && !showCodes && (
            <p className={`mt-1 ${referralStatus === "invalid" ? "font-medium text-red-700" : ""}`} aria-live="polite">
              {referralStatus === "valid" ? "🤝 " : ""}
              {referralNote}
            </p>
          )}
          {!showCodes && (
            <button
              type="button"
              onClick={() => setShowCodes(true)}
              aria-expanded={false}
              aria-controls="signup-codes"
              className={`font-semibold text-brand-700 underline hover:no-underline ${redesign && promoState === "welcome" ? "ml-1 inline" : "mt-1"}`}
            >
              Have a different code?
            </button>
          )}
          {!showCodes && <input type="hidden" name="couponCode" value={couponCode} />}
          {!showCodes && <input type="hidden" name="referredByCode" value={referredByCode} />}
          {showCodes && (
            <div id="signup-codes" className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-couponCode" className={labelClass}>
                  Offer code <span className={`font-normal ${mutedClass}`}>(optional)</span>
                </label>
                <input
                  id="signup-couponCode"
                  name="couponCode"
                  autoComplete="off"
                  type="text"
                  maxLength={50}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="signup-referredByCode" className={labelClass}>
                  Referral code <span className={`font-normal ${mutedClass}`}>(optional)</span>
                </label>
                <input
                  id="signup-referredByCode"
                  name="referredByCode"
                  autoComplete="off"
                  type="text"
                  maxLength={20}
                  value={referredByCode}
                  onChange={(e) => setReferredByCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MD1A2B3C"
                  className={inputClass}
                />
                <p className={`${hintClass} ${referralStatus === "invalid" ? "font-medium !text-red-700" : ""}`} aria-live="polite">
                  {referralNote ?? "Referred by another business? Enter their code."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={redesign ? "space-y-2 lg:space-y-1.5" : "space-y-4"}>
        <div>
          <label className={`flex items-start gap-2 ${redesign ? "text-sm leading-snug text-[#37343D] lg:text-[13px]" : "text-base text-slate-600"}`}>
            <input
              required
              id="signup-agreedToTerms"
              type="checkbox"
              name="agreedToTerms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              /* 20px, not 16px: below 24px this is a hard target to tap on a
                 phone (WCAG 2.2 SC 2.5.8). The wrapping <label> already makes
                 the text tappable too. */
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              {...errorProps("signup-agreedToTerms")}
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
          {fieldError("signup-agreedToTerms")}
        </div>

        {/* One email choice (owner's decision, 25 Oct 2026): a business is
            subscribed to news and updates, said here and in the Terms
            (section 3), and can unsubscribe any time in its portal or from
            any of those emails (lib/businessEmailChoices.ts). */}
        <p className={redesign ? "text-xs leading-snug text-[#6B6773]" : "text-sm text-slate-500"}>
          We&apos;ll email you about your account and deals, plus MegaDeal news and tips. Unsubscribe from news any time.
        </p>
        </div>

        {/* Where Turnstile shows a challenge, if it ever needs one. Hidden
            while empty, so it doesn't add a gap above the button. */}
        <div data-turnstile-slot className="empty:hidden" />

        {submitError && (
          <p role="alert" className={redesign ? "text-sm font-medium text-red-700" : "text-sm text-ember-600"}>
            {submitError}
          </p>
        )}

        <div>
          <button type="submit" disabled={submitting} aria-busy={submitting || undefined} className={primaryButtonClass}>
            {submitting ? "Creating your account…" : redesign ? "Create account" : "Claim my free advertising →"}
          </button>
          <p className={`text-center ${redesign ? "mt-1.5 text-[13px] lg:mt-1 lg:text-xs" : "mt-4 text-sm"} ${mutedClass}`}>
            No credit card required • No obligation
          </p>
          <p className={`text-center ${redesign ? "mt-1 text-[13px] lg:text-xs" : "mt-4 text-sm"} ${mutedClass}`}>
            Already signed up?{" "}
            <a href="/portal" className="font-semibold text-brand-600 hover:underline">
              Sign in to your business portal
            </a>
          </p>
        </div>

        {/*
          Honeypot — a bot that fills every input in the markup trips it.
          Inside a display:none wrapper (inline style, so no stylesheet can
          undo it): browsers and password managers don't autofill a field
          that can't be focused. It used to sit 1px off-screen instead,
          which still counts as fillable, and an owner's own browser
          autofilled it on the live form (4 Oct 2026), blocking the signup.
          Kept last in the DOM as well.
        */}
        <div aria-hidden="true" style={{ display: "none" }}>
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </div>
      </form>
    </div>
  );
}
