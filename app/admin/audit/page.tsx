"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Entry {
  at: string;
  action: string;
  target?: string;
  detail?: string;
  ip?: string;
}

const when = new Intl.DateTimeFormat("en-NZ", {
  timeZone: "Pacific/Auckland",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** The admin audit trail: what was done in admin, newest first. */
export default function AdminAuditPage() {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) throw new Error("Sign in to the admin dashboard first.");
        if (!res.ok) throw new Error("Couldn't load the audit log.");
        setItems((await res.json()).items ?? []);
      })
      .catch((err) => setError(err.message));
  }, []);

  const q = query.toLowerCase().trim();
  const shown = (items ?? []).filter((e) => !q || [e.action, e.target, e.detail].some((v) => v?.toLowerCase().includes(q)));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to admin
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Audit log</h1>
      <p className="mt-1 text-sm text-slate-600">
        What was done in admin, newest first: sign-ins (including failed ones), approvals and edits, business and credit
        changes, deletions and settings. The last 500 entries are kept. NZ time.
      </p>

      {error && (
        <p className="mt-6 text-sm text-red-600">
          {error}{" "}
          <Link href="/admin/login" className="font-semibold underline">
            Sign in
          </Link>
        </p>
      )}

      {items && (
        <>
          <label className="mt-5 block max-w-sm">
            <span className="sr-only">Search the log</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search, e.g. a business or “Failed”"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">{items.length === 0 ? "Nothing logged yet." : "Nothing matches."}</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {shown.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
                  <time dateTime={e.at} className="shrink-0 text-xs font-semibold text-slate-500 sm:w-32 sm:pt-0.5">
                    {when.format(new Date(e.at))}
                  </time>
                  <div className="min-w-0 text-sm">
                    <p className={`font-semibold ${e.action.startsWith("Failed") ? "text-red-700" : "text-slate-900"}`}>
                      {e.action}
                      {e.target && <span className="font-normal text-slate-600"> · {e.target}</span>}
                    </p>
                    {e.detail && <p className="break-words text-slate-600">{e.detail}</p>}
                    {e.ip && <p className="text-xs text-slate-400">IP {e.ip}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
