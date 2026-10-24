"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTurnstileToken, preloadTurnstile, turnstileProblemMessage } from "@/lib/turnstileClient";
import type { AdminSignInMode } from "@/lib/adminSignIn";
import PasswordField from "@/components/PasswordField";
import { useSession } from "@/context/SessionProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isLoggedIn, member, logout } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [password, setPassword] = useState("");
  // Two-factor sign-in, once the server asks for it (lib/totp.ts).
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** What sign-in asks for (lib/adminSignIn.ts): the code field shows from
   *  the start when two-factor is on, so the password is never checked
   *  on its own. */
  const [mode, setMode] = useState<AdminSignInMode | null>(null);

  useEffect(() => {
    preloadTurnstile();
    fetch("/api/admin/login", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const m = data?.mode;
        if (m === "password" || m === "password-and-code" || m === "setup-needed") {
          setMode(m);
          if (m === "password-and-code") setNeedsCode(true);
        }
      })
      .catch(() => {});
  }, []);

  async function signOutBusiness() {
    setSigningOut(true);
    // Signs the business out and comes straight back to this
    // exact page, ready to sign in as admin — the default target (site
    // origin) would otherwise strand them on the homepage mid-task.
    await logout(`${window.location.origin}/admin/login`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
      const captchaToken = await getTurnstileToken(siteKey);
      if (siteKey && !captchaToken) {
        setError(turnstileProblemMessage());
        return;
      }
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          ...(needsCode ? { code } : {}),
          captchaToken,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.needsCode) {
          setNeedsCode(true);
          setCode("");
        }
        if (data.setupNeeded) setMode("setup-needed");
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <span className="text-4xl">🔐</span>
      <h1 className="mt-3 text-xl font-bold text-slate-900">Admin dashboard</h1>
      <p className="mt-2 text-sm text-slate-500">
        This area is separate from business accounts and only accessible with
        the site owner&apos;s admin password.
      </p>
      {isLoggedIn ? (
        <div className="mt-6 w-full rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-left">
          <p className="text-sm font-bold text-amber-900">
            ⚠️ You&apos;re signed in as a business{member?.email ? ` (${member.email})` : ""}
          </p>
          <p className="mt-1.5 text-sm text-amber-800">
            The admin dashboard and a business account are two different logins — being in both
            at once gets confusing about which one you&apos;re acting as. Sign out of the
            business account first, then sign in here as admin.
          </p>
          <button
            onClick={signOutBusiness}
            disabled={signingOut}
            className="mt-3 rounded-full bg-amber-700 px-5 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out of business account"}
          </button>
        </div>
      ) : mode === "setup-needed" ? (
        <div role="status" className="mt-6 w-full rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
          <p className="font-bold">Admin sign-in needs two-factor sign-in set up first.</p>
          <p className="mt-1.5">
            It takes a few minutes with an authenticator app on your phone.{" "}
            <Link href="/admin/two-factor" className="font-bold underline">
              Set it up
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 w-full space-y-3">
          <label htmlFor="admin-password" className="sr-only">
            Admin password
          </label>
          <PasswordField
            id="admin-password"
            required
            autoFocus
            value={password}
            onChange={setPassword}
            placeholder="Admin password"
            inputClassName="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
          {needsCode && (
            <div className="text-left">
              <label htmlFor="admin-code" className="mb-1 block text-sm font-semibold text-slate-700">
                Code from your authenticator app
              </label>
              <input
                id="admin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={7}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123 456"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-brand-400"
              />
            </div>
          )}
          {/* Where Turnstile shows a challenge, if it ever needs one. */}
          <div data-turnstile-slot />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-600 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Checking…" : "Sign in"}
          </button>
        </form>
      )}
      {/* How to reset the password used to be spelled out here, naming the
          runtime variable it lives in: anyone could read it (security pack
          T152). The owner's notes have it instead. */}
      <p className="mt-6 text-xs text-slate-500">
        Forgot the password or lost your phone? The site owner can reset both.
      </p>
    </main>
  );
}
