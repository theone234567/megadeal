"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type CheckState = "ok" | "missing" | "warning" | "info";
interface Check {
  label: string;
  state: CheckState;
  detail: string;
}
interface Section {
  id: string;
  title: string;
  switchName: string;
  on: boolean;
  ready: boolean;
  checks: Check[];
}
interface Readiness {
  checkedAt: string;
  sections: Section[];
  wixPhotosLeft: number | null;
}

const when = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", second: "2-digit" });

const MARK: Record<CheckState, { sign: string; text: string; className: string }> = {
  ok: { sign: "✓", text: "Done", className: "bg-emerald-100 text-emerald-800" },
  missing: { sign: "✕", text: "Needed", className: "bg-red-100 text-red-800" },
  warning: { sign: "!", text: "Check", className: "bg-amber-100 text-amber-900" },
  info: { sign: "i", text: "Note", className: "bg-slate-100 text-slate-700" },
};

function status(s: Section): { text: string; className: string } {
  if (s.on && s.ready) return { text: "Switched on", className: "bg-emerald-700 text-white" };
  if (s.on) return { text: "Switched on, but something's missing", className: "bg-red-600 text-white" };
  if (s.ready) return { text: "Ready to switch on", className: "bg-brand-600 text-white" };
  return { text: "Not ready yet", className: "bg-slate-200 text-slate-700" };
}

/** Copies the photos still on Wix, a batch at a time (app/api/admin/copy-photos). */
function CopyPhotos({ left, onDone }: { left: number; onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ copied: number; remaining: number } | null>(null);
  const [failed, setFailed] = useState<{ url: string; reason: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setFailed([]);
    let skip = 0;
    let copied = 0;
    const failures: { url: string; reason: string }[] = [];
    try {
      // `remaining` counts photos not yet tried; failed ones are skipped
      // on the next batch. Stops when none are left, or a batch does
      // nothing, so it can't loop for ever.
      for (let i = 0; i < 500; i++) {
        const res = await fetch("/api/admin/copy-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skip }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Copying stopped. Try again.");
        copied += json.copied;
        failures.push(...json.failed);
        skip = json.skip;
        setProgress({ copied, remaining: json.remaining });
        setFailed([...failures]);
        if (json.remaining === 0 || (json.copied === 0 && json.failed.length === 0)) break;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
      onDone();
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-700">
        {left} photo{left === 1 ? " is" : "s are"} still on Wix. Copying is safe to stop and run again; each business and deal
        switches to its copy only once it's stored.
      </p>
      <button
        onClick={run}
        disabled={running}
        className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {running ? "Copying…" : "Copy photos from Wix"}
      </button>
      <div aria-live="polite" className="mt-2 text-sm text-slate-700">
        {progress && (
          <p>
            {progress.copied} copied, {progress.remaining} left to try.{" "}
            {failed.length > 0 && `${failed.length} couldn't be copied.`}
          </p>
        )}
        {error && <p className="text-red-700">{error}</p>}
      </div>
      {failed.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-700">Photos that couldn't be copied</summary>
          <ul className="mt-2 space-y-1 break-all text-slate-600">
            {failed.map((f) => (
              <li key={f.url}>
                {f.reason}: <span className="text-xs">{f.url}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Admin: how ready each step off Wix is, checked live (lib/migrationReadiness.ts). */
export default function MoveOffWixPage() {
  const [data, setData] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/move-off-wix", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) throw new Error("Sign in to the admin dashboard first.");
        if (!res.ok) throw new Error("The checks couldn't run. Please try again.");
        setData(await res.json());
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to admin
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Moving off Wix</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Each part of the site that moves off Wix has its own switch, set in Cloudflare. This page checks, live, whether everything
        each one needs is in place. Switch them on in this order. Nothing here changes anything except the photo copy button. The
        full plan is in docs/WIX-MIGRATION.md.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-brand-400 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Check again"}
        </button>
        {data && <span className="text-xs text-slate-500">Checked at {when.format(new Date(data.checkedAt))}</span>}
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600">
          {error}{" "}
          <Link href="/admin/login" className="font-semibold underline">
            Sign in
          </Link>
        </p>
      )}

      {data && (
        <ol className="mt-6 space-y-5">
          {data.sections.map((s, i) => {
            const st = status(s);
            return (
              <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {i + 1}. {s.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Switch: <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">{s.switchName}</code>
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.className}`}>{st.text}</span>
                </div>
                <ul className="mt-4 divide-y divide-slate-100">
                  {s.checks.map((c) => {
                    const m = MARK[c.state];
                    return (
                      <li key={c.label} className="flex gap-3 py-2.5">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.className}`}
                          aria-hidden="true"
                        >
                          {m.sign}
                        </span>
                        <div className="min-w-0 text-sm">
                          <p className="font-semibold text-slate-900">
                            <span className="sr-only">{m.text}: </span>
                            {c.label}
                          </p>
                          <p className="break-words text-slate-600">{c.detail}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {s.id === "photos" && s.on && data.wixPhotosLeft != null && data.wixPhotosLeft > 0 && (
                  <CopyPhotos left={data.wixPhotosLeft} onDone={load} />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
