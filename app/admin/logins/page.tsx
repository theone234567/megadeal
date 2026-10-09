"use client";

import { useState } from "react";
import Link from "next/link";
import type { LoginInfo } from "@/lib/authSession";

const when = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" });
const at = (iso: string | null) => (iso ? when.format(new Date(iso)) : "never");

/** What the state means, and what to do about it. */
function verdict(info: LoginInfo): { tone: "good" | "warn" | "bad"; text: string } {
  if (!info.exists)
    return {
      tone: "bad",
      text: "No login with this email. They may have signed up with a different email, or not finished signing up. They can sign up again.",
    };
  if (!info.confirmed)
    return {
      tone: "warn",
      text: "Signed up but never entered the emailed code. Signing in shows the code screen again (or they can sign up again with the same email to get a new code).",
    };
  if (!info.hasPassword)
    return {
      tone: "warn",
      text: "No password set yet (a business brought over from Wix). Send them a set-password link from their business page, or they can use “Forgot password”.",
    };
  return {
    tone: "good",
    text: "Login is fine. If their password isn't accepted they typed a different one: they can use “Forgot password” to set a new one.",
  };
}

const TONE = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-900",
};

/**
 * Admin > Check a login: for "my password doesn't work". Shows whether an
 * email has a login and its state, never the password (it's stored hashed).
 */
export default function LoginCheckPage() {
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<LoginInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/login-check?email=${encodeURIComponent(email.trim())}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("Sign in to the admin dashboard first.");
      if (!res.ok) throw new Error(json.error || "Couldn't check that. Please try again.");
      setInfo(json.info);
    } catch (err: any) {
      setError(err?.message || "Couldn't check that.");
    } finally {
      setChecking(false);
    }
  }

  const v = info ? verdict(info) : null;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to admin
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Check a login</h1>
      <p className="mt-1 text-sm text-slate-600">
        For &ldquo;my password doesn&apos;t work&rdquo;: whether an email has a business login, and what state it&apos;s in. Passwords
        are stored scrambled, so nobody can see one, including you.
      </p>
      <form onSubmit={check} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="login-check-email" className="sr-only">
          Email address
        </label>
        <input
          id="login-check-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@business.co.nz"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={checking}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {checking ? "Checking…" : "Check"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {info && v && (
        <section className="mt-5 space-y-3" aria-live="polite">
          <p className={`rounded-xl border px-4 py-3 text-sm font-medium ${TONE[v.tone]}`}>{v.text}</p>
          {info.exists && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Signed up</dt>
                <dd className="font-medium text-slate-800">{at(info.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email confirmed (code entered)</dt>
                <dd className="font-medium text-slate-800">{info.confirmed ? at(info.confirmedAt) : "not yet"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Password set</dt>
                <dd className="font-medium text-slate-800">{info.hasPassword ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last signed in</dt>
                <dd className="font-medium text-slate-800">{at(info.lastSignInAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Signed in now on</dt>
                <dd className="font-medium text-slate-800">
                  {info.openSessions} device{info.openSessions === 1 ? "" : "s"}
                </dd>
              </div>
            </dl>
          )}
        </section>
      )}
    </main>
  );
}
