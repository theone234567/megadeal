"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import PasswordField from "@/components/PasswordField";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/confirm-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't reset your password.");
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Couldn't reset your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-slate-600">
          This reset link is missing its code — it may have been copied incorrectly. Request a
          new one from the{" "}
          <a href="/portal" className="font-semibold text-brand-600 hover:underline">
            sign-in page
          </a>
          .
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-extrabold text-slate-900">Password updated ✓</h1>
        <p className="mt-2 text-sm text-slate-600">You can sign in with your new password now.</p>
        <a
          href="/portal"
          className="mt-5 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          Go to sign in
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-xl font-extrabold text-slate-900">Set a new password</h1>
      <p className="mt-1 text-sm text-slate-500">
        This link works once — once it&apos;s used, you&apos;ll need a fresh one from &quot;Forgot
        password&quot; if you need to change it again.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-slate-700">
            New password
          </label>
          <PasswordField
            id="reset-password"
            required
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            inputClassName={INPUT_CLASS}
          />
        </div>
        <div>
          <label
            htmlFor="reset-password-confirm"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Confirm new password
          </label>
          <PasswordField
            id="reset-password-confirm"
            required
            value={confirm}
            onChange={setConfirm}
            placeholder="Retype your new password"
            autoComplete="new-password"
            inputClassName={INPUT_CLASS}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Set new password"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
