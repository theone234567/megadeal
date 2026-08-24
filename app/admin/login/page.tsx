"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        This area is separate from merchant accounts and only accessible with
        the site owner&apos;s admin password.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 w-full space-y-3">
        <input
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
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
      <p className="mt-6 text-xs text-slate-400">
        Forgot it? There&apos;s no email reset — this password lives in your
        Vercel project&apos;s <code className="rounded bg-slate-100 px-1 py-0.5">ADMIN_PASSWORD</code>{" "}
        environment variable. Update it there and redeploy to change it.
      </p>
    </main>
  );
}
