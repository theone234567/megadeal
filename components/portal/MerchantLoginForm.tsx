"use client";

import { useEffect, useState } from "react";
import { codeNotSentText, loginMember, resendCode, submitVerificationCode, waitText } from "@/lib/siteAuth";
import { getTurnstileToken, preloadTurnstile } from "@/lib/turnstileClient";
import PasswordField from "@/components/PasswordField";
import { AUTH_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";

/**
 * Business sign-in (lib/siteAuth.ts), with Cloudflare Turnstile as the
 * robot check: it runs in the background and only shows a challenge when
 * it needs one.
 */
/**
 * Fields sized for what this form is: the gate to someone's business
 * account, usually opened on a phone. They were 36px tall with a hairline
 * border and no focus ring beyond a border tint — small to hit, and hard
 * to tell apart from the page. A visible ring also means keyboard focus
 * is actually apparent, which a border colour change alone barely is.
 */
/** Seconds between codes: the server's gap too (app/api/auth/resend-code). */
const RESEND_SECONDS = 60;

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export default function MerchantLoginForm({ redirectTo = "/portal" }: { redirectTo?: string }) {
  // Warm the robot check while the visitor types, so obtaining the token
  // adds nothing to the wait after they press sign in.
  useEffect(() => {
    preloadTurnstile();
  }, []);

  const captchaToken = () => getTurnstileToken(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingState, setPendingState] = useState<{ email: string } | null>(null);
  const [code, setCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  /** Seconds until another code can be requested. Same brake as signup:
   *  unthrottled on-demand email is how a sending domain ends up in junk
   *  folders for everyone. */
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  /** The code couldn't be emailed just now (T240): say so, not "we've emailed". */
  const [codeNotSent, setCodeNotSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Timed: obtaining a token can take a while if Turnstile shows a
      // challenge, and a stalled request mustn't leave the button on
      // "Signing in…" with nothing on screen to explain it.
      const outcome = await withTimeout(
        (async () => loginMember(email, password, await captchaToken()))(),
        AUTH_TIMEOUT_MS,
        "That took too long. Please check your connection and try again."
      );

      if (outcome.status === "success") {
        window.location.href = redirectTo;
      } else if (outcome.status === "verify") {
        // An account whose email was never confirmed: a new code, or why
        // it couldn't go out (T240).
        setPendingState(outcome.pendingState);
        setCodeNotSent(!outcome.codeSent);
        setResendCooldown(outcome.codeSent ? RESEND_SECONDS : (outcome.retryAfterSec ?? RESEND_SECONDS));
      } else {
        setError(outcome.message);
      }
    } catch (err) {
      setError(
        err instanceof Error && (err.message.startsWith("That took too long") || err.message.startsWith("We couldn't reach"))
          ? err.message
          : "Couldn't sign you in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  /** Sends a fresh verification code, by email address alone (T240): no
   *  password or robot check to go stale. */
  async function handleResendCode() {
    if (resendCooldown > 0 || submitting) return;

    setError(null);
    setResendNotice(null);
    setSubmitting(true);
    try {
      const res = await withTimeout(resendCode(email), AUTH_TIMEOUT_MS, "That took too long. Please check your connection and try again.");
      if (res.sent) {
        setCodeNotSent(false);
        setResendNotice("New code sent. It can take a minute to arrive.");
        setResendCooldown(RESEND_SECONDS);
      } else {
        setResendCooldown(res.retryAfterSec ?? RESEND_SECONDS);
        setError(res.message ?? codeNotSentText(res.retryAfterSec));
      }
    } catch {
      setError("We couldn't send a new code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const outcome = await submitVerificationCode(code, pendingState, password);
      if (outcome.status === "success") {
        window.location.href = redirectTo;
      } else if (outcome.status === "error") {
        setError(outcome.message);
      } else {
        setError("That code isn't right — check your email and try again.");
      }
    } catch {
      setError("That code isn't right. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above first, then tap "Forgot password".');
      return;
    }
    setError(null);
    try {
      // Our own reset flow (app/reset-password, lib/passwordResetTokens.ts).
      // Always resolves the same way whether or not the email matches an
      // account, so this can't be used to find out which addresses have
      // signed up.
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The robot check, as sign-in uses.
        body: JSON.stringify({ email, captchaToken: await captchaToken() }),
      });
      if (!res.ok) {
        // The route's own sentence (too many tries, say) when it gave one.
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : "Couldn't send a reset email. Please try again.");
      }
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message || "Couldn't send a reset email. Please try again.");
    }
  }

  if (pendingState) {
    return (
      <form onSubmit={handleVerify} className="w-full space-y-3 text-left">
        <p className="text-center text-sm text-slate-500" role={codeNotSent ? "alert" : undefined}>
          {codeNotSent ? (
            <>
              Your email isn&apos;t confirmed yet, and we couldn&apos;t send the code to <strong className="[overflow-wrap:anywhere]">{email}</strong> just now.{" "}
              {resendCooldown > 0 ? `Try Resend in ${waitText(resendCooldown)}.` : "Try Resend below."}
            </>
          ) : (
            <>
              Enter the code we just emailed to <strong className="[overflow-wrap:anywhere]">{email}</strong>.
            </>
          )}
        </p>
        <label htmlFor="login-verify-code" className="sr-only">
          Verification code
        </label>
        <input
          id="login-verify-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
            aria-label="Verification code from your email"
            autoComplete="one-time-code"
            inputMode="numeric"
          placeholder="Verification code"
          autoFocus
          className={`${INPUT_CLASS} text-center tracking-[0.3em]`}
        />
        {resendNotice && (
          <p role="status" className="rounded-xl bg-green-50 px-3 py-2.5 text-center text-sm font-semibold text-green-800">
            {resendNotice}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 py-3.5 text-base font-extrabold text-white shadow-card transition hover:bg-brand-700 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
        >
          {submitting ? "Checking…" : "Verify & sign in"}
        </button>

        {/* Without this, a merchant whose code never arrived is locked out
            of their own portal with nothing to click. */}
        <button
          type="button"
          onClick={handleResendCode}
          disabled={submitting || resendCooldown > 0}
          className="w-full rounded-lg py-2 text-center text-sm font-semibold text-brand-700 underline underline-offset-2 transition hover:text-brand-800 disabled:no-underline disabled:opacity-60"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : "Didn't get the code? Send it again"}
        </button>

        <p className="text-center text-xs text-slate-500">
          Check your spam folder too — it sometimes lands there.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2.5 text-left">
      <label htmlFor="login-email" className="sr-only">
        Email
      </label>
      <input
        id="login-email"
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourbusiness.co.nz"
        autoComplete="email"
        className={INPUT_CLASS}
      />
      <label htmlFor="login-password" className="sr-only">
        Password
      </label>
      <PasswordField
        id="login-password"
        required
        value={password}
        onChange={setPassword}
        placeholder="Password"
        autoComplete="current-password"
        inputClassName={INPUT_CLASS}
      />
      {/* Where Turnstile shows a challenge, if it ever needs one. */}
      <div data-turnstile-slot />
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {resetSent && (
        <p className="rounded-xl bg-green-50 px-3 py-2.5 text-sm font-medium text-green-800">
          Check your email for a reset link.
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-brand-600 py-3.5 text-base font-extrabold text-white shadow-card transition hover:bg-brand-700 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={handleForgotPassword}
        className="w-full rounded-lg py-2 text-center text-sm font-medium text-slate-500 transition hover:text-brand-700"
      >
        Forgot password?
      </button>
    </form>
  );
}
