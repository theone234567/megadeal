"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/PasswordField";
import { useWix } from "@/context/WixProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isLoggedIn, member, logout } = useWix();
  const [signingOut, setSigningOut] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signOutBusiness() {
    setSigningOut(true);
    // Sends the visitor through Wix's own logout and straight back to this
    // exact page, ready to sign in as admin — the default target (site
    // origin) would otherwise strand them on the homepage mid-task.
    await logout(`${window.location.origin}/admin/login`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
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
            className="mt-3 rounded-full bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out of business account"}
          </button>
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-600 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Checking…" : "Sign in"}
          </button>
        </form>
      )}
      <p className="mt-6 text-xs text-slate-400">
        Forgot it? There&apos;s no email reset — this password lives in the
        Cloudflare Worker&apos;s{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">ADMIN_PASSWORD</code>{" "}
        runtime variable (Cloudflare dashboard → Workers &amp; Pages → this
        Worker → Settings → Variables and Secrets). Update it there and
        redeploy to change it.
      </p>
    </main>
  );
}
