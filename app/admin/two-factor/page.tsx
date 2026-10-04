"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Setup {
  enabled: boolean;
  secret: string;
  uri: string;
}

/**
 * Turning on two-factor sign-in for the admin dashboard (lib/totp.ts).
 * Nothing changes until the secret is saved in Cloudflare as
 * ADMIN_TOTP_SECRET, and deleting it there turns it off again: the way
 * back in if the phone with the authenticator app is lost.
 */
export default function TwoFactorPage() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/two-factor", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) throw new Error("Sign in to the admin dashboard first.");
        if (!res.ok) throw new Error("Couldn't start the setup. Reload to try again.");
        setSetup(await res.json());
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setup.secret, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That code doesn't match.");
      setConfirmed(true);
    } catch (err: any) {
      setError(err?.message || "That code doesn't match.");
    } finally {
      setChecking(false);
    }
  }

  async function copySecret() {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // The secret is on screen to select by hand.
    }
  }

  const grouped = setup?.secret.match(/.{1,4}/g)?.join(" ") ?? "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to admin
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Two-factor sign-in</h1>
      <p className="mt-1 text-sm text-slate-600">
        After your password, admin sign-in will also ask for a 6-digit code from an authenticator app on your phone
        (Google Authenticator, Microsoft Authenticator, 1Password and others).
      </p>

      {loadError && (
        <p className="mt-6 text-sm text-red-600">
          {loadError}{" "}
          <Link href="/admin/login" className="font-semibold underline">
            Sign in
          </Link>
        </p>
      )}

      {setup && (
        <>
          <p
            className={`mt-5 inline-flex rounded-full px-3 py-1 text-sm font-bold ${
              setup.enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
            }`}
          >
            {setup.enabled ? "On: sign-in asks for a code" : "Off"}
          </p>
          {setup.enabled && (
            <p className="mt-2 text-sm text-slate-600">
              To use a new phone, follow the steps below and replace the secret in Cloudflare with the new one.
            </p>
          )}

          <ol className="mt-6 space-y-6">
            <li className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-slate-900">1. Add MegaDeal to your authenticator app</h2>
              <p className="mt-1 text-sm text-slate-600">
                On your phone, <a href={setup.uri} className="font-semibold text-brand-700 underline">tap here</a> to add it.
                Or, in the app, choose to enter a setup key and type this one (time-based):
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-base tracking-wider text-slate-900">
                  {grouped}
                </code>
                <button type="button" onClick={copySecret} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Account name: MegaDeal (admin). Keep this key private.</p>
            </li>

            <li className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-slate-900">2. Check it works</h2>
              <form onSubmit={confirm} className="mt-2 flex flex-wrap items-end gap-2">
                <div>
                  <label htmlFor="setup-code" className="mb-1 block text-sm text-slate-600">
                    Code the app shows now
                  </label>
                  <input
                    id="setup-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={7}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-36 rounded-xl border border-slate-200 px-3 py-2 text-center font-mono text-lg tracking-[0.25em] outline-none focus:border-brand-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checking || code.replace(/\s/g, "").length !== 6}
                  className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {checking ? "Checking…" : "Check code"}
                </button>
              </form>
              {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
              {confirmed && <p role="status" className="mt-2 text-sm font-semibold text-emerald-700">That works.</p>}
            </li>

            <li className={`rounded-2xl border p-5 ${confirmed ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white opacity-60"}`}>
              <h2 className="font-bold text-slate-900">3. Turn it on in Cloudflare</h2>
              {confirmed ? (
                <div className="mt-1 space-y-2 text-sm text-slate-700">
                  <p>
                    Cloudflare dashboard → Workers &amp; Pages → <strong>megadeal</strong> → Settings → Variables and
                    Secrets → Add → type <strong>Secret</strong>:
                  </p>
                  <p>
                    Name <code className="rounded bg-white px-1.5 py-0.5 font-mono">ADMIN_TOTP_SECRET</code>, value the key
                    above (<code className="rounded bg-white px-1.5 py-0.5 font-mono">{setup.secret}</code>). Deploy.
                  </p>
                  <p>Your next admin sign-in will ask for a code. You stay signed in on this browser until then.</p>
                  <p className="text-slate-600">
                    Lost your phone? Delete <code className="font-mono">ADMIN_TOTP_SECRET</code> in Cloudflare to sign in with
                    just your password, then set it up again.
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-600">Check a code first.</p>
              )}
            </li>
          </ol>
        </>
      )}
    </main>
  );
}
