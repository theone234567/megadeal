"use client";

import { useState } from "react";
import { useWix } from "@/context/WixProvider";
import { loginMember, submitVerificationCode, requestPasswordReset } from "@/lib/wixAuth";
import PasswordField from "@/components/PasswordField";

/**
 * On-brand sign-in, right here on megadeal.co.nz — the previous flow
 * bounced merchants off to a generic Wix-hosted login page and back via
 * /login-callback, which works but breaks the visual flow at exactly the
 * moment a returning merchant needs to trust the site. This calls Wix's
 * Custom Login API (client.auth.login) directly instead.
 */
export default function MerchantLoginForm({ redirectTo = "/portal" }: { redirectTo?: string }) {
  const { client } = useWix();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingState, setPendingState] = useState<unknown>(null);
  const [code, setCode] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const outcome = await loginMember(client, email, password);
      if (outcome.status === "success") {
        window.location.href = redirectTo;
      } else if (outcome.status === "verify") {
        setPendingState(outcome.pendingState);
      } else {
        setError(outcome.message);
      }
    } catch {
      setError("Couldn't sign you in. Please try again.");
    } finally {
      setSubmitting(false);
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
        {error && <p className="text-center text-sm text-ember-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Checking…" : "Verify & sign in"}
        </button>
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
