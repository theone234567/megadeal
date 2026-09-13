"use client";

import { useEffect, useRef, useState } from "react";
import { useWix } from "@/context/WixProvider";
import { loginMember, submitVerificationCode, requestPasswordReset } from "@/lib/wixAuth";
import { getInvisibleCaptchaToken, preloadCaptcha } from "@/lib/recaptcha";
import PasswordField from "@/components/PasswordField";
import RecaptchaCheckbox, { type RecaptchaCheckboxHandle } from "@/components/RecaptchaCheckbox";
import { AUTH_TIMEOUT_MS, withTimeout } from "@/lib/withTimeout";

/**
 * On-brand sign-in, right here on megadeal.co.nz — the previous flow
 * bounced merchants off to a generic Wix-hosted login page and back via
 * /login-callback, which works but breaks the visual flow at exactly the
 * moment a returning merchant needs to trust the site. This calls Wix's
 * Custom Login API (client.auth.login) directly instead.
 */
export default function MerchantLoginForm({ redirectTo = "/portal" }: { redirectTo?: string }) {
  // Warm reCAPTCHA while the visitor types, so obtaining the token adds
  // nothing to the wait after they press sign in.
  useEffect(() => {
    preloadCaptcha();
  }, []);

  const { client } = useWix();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingState, setPendingState] = useState<unknown>(null);
  const [code, setCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  /**
   * Sign-in uses INVISIBLE reCAPTCHA, which is the whole point: it scores
   * the attempt silently and only puts a challenge in front of someone it
   * finds suspicious. A returning merchant signing in normally never sees
   * anything — no checkbox, no interruption.
   *
   * The checkbox below appears only if Wix actually rejects the invisible
   * token, which is the one signal that this project requires the visible
   * variant here. Without that fallback a rejection is a dead end, and a
   * merchant locked out of their own portal has no way forward at all —
   * the same trap that made business signup impossible.
   */
  const [needsVisibleCaptcha, setNeedsVisibleCaptcha] = useState(false);
  const [visibleCaptchaToken, setVisibleCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<RecaptchaCheckboxHandle | null>(null);
  /** Seconds until another code can be requested. Same brake as signup:
   *  unthrottled on-demand email is how a sending domain ends up in junk
   *  folders for everyone. */
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (needsVisibleCaptcha && !visibleCaptchaToken) {
      setError("Please tick the \u201cI'm not a robot\u201d box below to continue.");
      return;
    }
    setSubmitting(true);
    try {
      // Which field the token goes in matters: Wix reads the visible
      // checkbox's token from `Recaptcha` and the silent one from
      // `InvisibleRecaptcha`. Naming the variant here rather than relying
      // on argument position is what stops them being swapped.
      // Timed, like registration already was. Obtaining a token can take
      // up to 8s to load the script plus 45s waiting on a challenge, and
      // the Wix call after it was previously unbounded — so a stalled
      // request could leave the button on "Signing in…" indefinitely with
      // nothing on screen to explain it.
      const attempt = async (useVisible: boolean) =>
        withTimeout(
          loginMember(
            client,
            email,
            password,
            useVisible
              ? { recaptchaToken: visibleCaptchaToken }
              : {
                  invisibleRecaptchaToken: await getInvisibleCaptchaToken(
                    (client.auth as { captchaInvisibleSiteKey?: string })
                      .captchaInvisibleSiteKey ?? ""
                  ),
                }
          ),
          AUTH_TIMEOUT_MS,
          "That took too long. Please check your connection and try again."
        );

      let outcome = await attempt(needsVisibleCaptcha);

      // A silent check asked for is a silent check answered — showing a
      // returning merchant a checkbox because Wix wanted another
      // background pass is friction for nothing. One retry first.
      if (!needsVisibleCaptcha && outcome.status === "captcha" && outcome.kind === "silent") {
        outcome = await attempt(false);
      }

      if (outcome.status === "success") {
        window.location.href = redirectTo;
      } else if (outcome.status === "verify") {
        setPendingState(outcome.pendingState);
      } else if (
        // Wix asked for a CAPTCHA outright — "user" means it judged this
        // attempt suspicious — or it refused the silent token we sent.
        // Either way the checkbox is the only thing that resolves it, so
        // show it rather than leave a merchant locked out of their portal.
        !needsVisibleCaptcha &&
        (outcome.status === "captcha" ||
          (outcome.status === "error" &&
            (outcome.errorCode === "missingCaptchaToken" ||
              outcome.errorCode === "invalidCaptchaToken")))
      ) {
        setNeedsVisibleCaptcha(true);
        setError("One more step — please tick the \u201cI'm not a robot\u201d box, then sign in again.");
      } else {
        setError(outcome.message);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message.startsWith("That took too long")
          ? err.message
          : "Couldn't sign you in. Please try again."
      );
    } finally {
      setSubmitting(false);
      // Tokens are single-use; a retry with a spent one fails as rejected
      // rather than missing, which is a confusing second failure.
      captchaRef.current?.reset();
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  /**
   * Sends a fresh verification code, the same way the signup form does.
   *
   * This SDK has no resend method, but Wix documents that authentication
   * returning EMAIL_VERIFICATION_REQUIRED sends a code automatically — so
   * signing in again while the email is unverified produces a new one
   * through Wix's own flow. The new pendingState must replace the old,
   * since the new code is validated against the new state token.
   */
  async function handleResendCode() {
    if (resendCooldown > 0 || submitting) return;

    setError(null);
    setResendNotice(null);
    setSubmitting(true);
    try {
      // Always the invisible variant, whatever registration was refused
      // for. This is a LOGIN call, and Wix documents login as taking the
      // invisible token; needsVisibleCaptcha records a decision about the
      // register endpoint, which is a different check.
      //
      // Carrying that flag here also could not work: the checkbox is only
      // rendered in the main form, and its token is cleared after every
      // attempt because tokens are single-use — so on this screen it was
      // always null, every resend went out empty, and Wix refused every
      // one. The resend could never succeed once the fallback was active.
      const captchaTokens = {
        invisibleRecaptchaToken: await getInvisibleCaptchaToken(
          (client.auth as { captchaInvisibleSiteKey?: string }).captchaInvisibleSiteKey ?? ""
        ),
      };

      const outcome = await withTimeout(
        loginMember(client, email, password, captchaTokens),
        AUTH_TIMEOUT_MS,
        "That took too long. Please check your connection and try again."
      );

      if (outcome.status === "verify") {
        setPendingState(outcome.pendingState);
        setResendNotice("New code sent. It can take a minute to arrive.");
        setResendCooldown(30);
      } else if (outcome.status === "success") {
        // Verified elsewhere in the meantime — just let them in.
        window.location.href = redirectTo;
      } else {
        setError(
          outcome.status === "error"
            ? outcome.message
            : "We couldn't send a new code just now. Please try again shortly."
        );
      }
    } catch {
      setError("We couldn't send a new code. Please try again.");
    } finally {
      setSubmitting(false);
      captchaRef.current?.reset();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const outcome = await submitVerificationCode(client, code, pendingState);
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
      await requestPasswordReset(client, email);
      setResetSent(true);
    } catch {
      setError("Couldn't send a reset email. Please try again.");
    }
  }

  if (pendingState) {
    return (
      <form onSubmit={handleVerify} className="mt-6 w-full max-w-xs space-y-3 text-left">
        <p className="text-center text-sm text-slate-500">
          Enter the code we just emailed to <strong>{email}</strong>.
        </p>
        <label htmlFor="login-verify-code" className="sr-only">
          Verification code
        </label>
        <input
          id="login-verify-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Verification code"
          autoFocus
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm tracking-widest outline-none focus:border-brand-400"
        />
        {resendNotice && (
          <p role="status" className="text-center text-sm font-semibold text-green-700">
            {resendNotice}
          </p>
        )}
        {error && <p className="text-center text-sm text-ember-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Checking…" : "Verify & sign in"}
        </button>

        {/* Without this, a merchant whose code never arrived is locked out
            of their own portal with nothing to click. */}
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
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 w-full max-w-xs space-y-3 text-left">
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
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
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
        inputClassName="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      {/* Hidden unless Wix has rejected an invisible token, so a normal
          sign-in shows no challenge at all. */}
      {needsVisibleCaptcha && (
        <RecaptchaCheckbox
          ref={captchaRef}
          siteKey={(client.auth as { captchaVisibleSiteKey?: string }).captchaVisibleSiteKey ?? ""}
          onChange={setVisibleCaptchaToken}
        />
      )}
      {error && <p className="text-sm text-ember-600">{error}</p>}
      {resetSent && <p className="text-sm text-green-700">Check your email for a reset link.</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={handleForgotPassword}
        className="w-full text-center text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        Forgot password?
      </button>
    </form>
  );
}
