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

/** Copies everything from Wix into the new database, as a rehearsal or for real (app/api/admin/import-from-wix). */
function ImportFromWix({ onDone }: { onDone: () => void }) {
  type Result = {
    mode: "rehearse" | "import";
    committed: boolean;
    failed: Record<string, string>;
    counts: Record<string, { exported: number; imported: number }>;
    issues: { record: string; field: string; problem: string }[];
    pausedDeals: { id: string; name: string; business: string }[];
  };
  const [running, setRunning] = useState<null | "rehearse" | "import">(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(mode: "rehearse" | "import") {
    if (mode === "import" && !window.confirm("Copy everything from Wix into the new database now? Anything an earlier run left there is replaced. Changes should be paused first.")) return;
    setRunning(mode);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/import-from-wix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "It stopped. Please try again.");
      setResult(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(null);
      onDone();
    }
  }

  const missing = result ? Object.entries(result.counts).filter(([, c]) => c.imported < c.exported) : [];

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-700">
        Copy the businesses, deals, subscribers and messages from Wix into the new database. Try a rehearsal first: it does the
        whole copy, checks every record and then undoes it, so it changes nothing. Import for real once changes are paused
        (switch-day step 1), then switch the database on.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => run("rehearse")}
          disabled={running !== null}
          className="rounded-lg border border-brand-600 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          {running === "rehearse" ? "Rehearsing…" : "Rehearse (changes nothing)"}
        </button>
        <button
          onClick={() => run("import")}
          disabled={running !== null}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {running === "import" ? "Copying…" : "Import for real"}
        </button>
      </div>
      <div aria-live="polite" className="mt-3 text-sm text-slate-700">
        {error && <p className="text-red-700">{error}</p>}
        {result && (
          <>
            <p className="font-semibold text-slate-900">
              {result.committed ? "Copied into the new database." : "Rehearsal finished: nothing was kept."}
              {missing.length === 0 && result.issues.length === 0 && " Every record came across."}
            </p>
            <table className="mt-2 w-full max-w-md text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1 font-semibold">In Wix</th>
                  <th className="py-1 text-right font-semibold">Found</th>
                  <th className="py-1 text-right font-semibold">Copied</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {Object.entries(result.counts).map(([name, c]) => (
                  <tr key={name} className="border-t border-slate-200">
                    <td className="py-1">{name}</td>
                    <td className="py-1 text-right">{c.exported}</td>
                    <td className={`py-1 text-right ${c.imported < c.exported ? "font-semibold text-amber-800" : ""}`}>{c.imported}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys(result.failed).length > 0 && (
              <p className="mt-2 text-red-700">Couldn&apos;t read in full: {Object.entries(result.failed).map(([k, v]) => `${k} (${v})`).join(", ")}.</p>
            )}
            {result.issues.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold text-slate-800">{result.issues.length} record{result.issues.length === 1 ? "" : "s"} to check</summary>
                <ul className="mt-2 space-y-1 text-slate-600">
                  {result.issues.map((i, n) => (
                    <li key={n}>
                      {i.record}: {i.problem} ({i.field})
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {result.pausedDeals.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold text-slate-800">
                  {result.pausedDeals.length} paused deal{result.pausedDeals.length === 1 ? "" : "s"}: re-pause any an admin paused
                </summary>
                <ul className="mt-2 space-y-1 text-slate-600">
                  {result.pausedDeals.map((d) => (
                    <li key={d.id}>
                      {d.name} ({d.business})
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Marks unsubscribed anyone who unsubscribed in Wix after the import (app/api/admin/carry-unsubscribes). */
function CarryUnsubscribes() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/carry-unsubscribes", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "It stopped. Please try again.");
      setMessage({
        ok: true,
        text: json.newlyUnsubscribed
          ? `${json.newlyUnsubscribed} unsubscribe${json.newlyUnsubscribed === 1 ? "" : "s"} brought over from Wix.`
          : "Nothing to bring over: everyone who unsubscribed in Wix is unsubscribed here too.",
      });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-700">
        Anyone who unsubscribed in Wix between the import and the switch is only recorded there. Press this once after switching
        (and again any time while Wix is kept): it only ever unsubscribes people, never adds anyone.
      </p>
      <button
        onClick={run}
        disabled={running}
        className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {running ? "Checking…" : "Bring over unsubscribes from Wix"}
      </button>
      {message && (
        <p aria-live="polite" className={`mt-2 text-sm ${message.ok ? "text-slate-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** Saves a copy of the database, or of everything in Wix, to the private backups bucket now (app/api/admin/save-copy). */
function SaveCopy({ database }: { database: boolean }) {
  const [running, setRunning] = useState<null | "database" | "wix">(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(what: "database" | "wix") {
    setRunning(what);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/save-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ what }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "It stopped. Please try again.");
      setMessage({
        ok: true,
        text: `Saved as ${json.saved} (${Math.max(1, Math.round(json.bytes / 1024))} KB) in the backups bucket. Copies there are deleted after 30 days; to keep one longer, download it from Cloudflare > R2 and store it somewhere private.`,
      });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-700">
        Save a copy to the private backups bucket now.{" "}
        {database
          ? "The database copy is the one the nightly backup takes: save one straight after switching. "
          : ""}
        Save a copy of Wix before ending the Wix subscription, in case a question about old data comes up later.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {database && (
          <button
            onClick={() => run("database")}
            disabled={running !== null}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {running === "database" ? "Saving…" : "Save a copy of the database"}
          </button>
        )}
        <button
          onClick={() => run("wix")}
          disabled={running !== null}
          className="rounded-lg border border-brand-600 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          {running === "wix" ? "Saving…" : "Save a copy of Wix"}
        </button>
      </div>
      {message && (
        <p aria-live="polite" className={`mt-2 break-words text-sm ${message.ok ? "text-slate-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** Emails each business without a login yet a link to set its password (app/api/admin/login-invites). */
function LoginInvites() {
  const [waiting, setWaiting] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ sent: number; alreadySent: number; failed: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const count = useCallback(() => {
    fetch("/api/admin/login-invites", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Couldn't check.");
        setWaiting(json.waiting);
      })
      .catch((err) => setError(err.message));
  }, []);
  useEffect(count, [count]);

  async function run() {
    if (!window.confirm(`Email ${waiting} business${waiting === 1 ? "" : "es"} a link to set a password for the new sign-in?`)) return;
    setRunning(true);
    setError(null);
    const total = { sent: 0, alreadySent: 0, failed: [] as string[] };
    try {
      // A batch at a time until none are left, or a batch sends nothing.
      for (let i = 0; i < 100; i++) {
        const res = await fetch("/api/admin/login-invites", { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Sending stopped. Try again.");
        total.sent += json.sent;
        total.alreadySent = json.alreadySent;
        total.failed = [...new Set([...total.failed, ...json.failed])];
        setDone({ ...total });
        if (json.remaining === 0 || json.sent === 0) break;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
      count();
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-700">
        {waiting === null
          ? "Checking which businesses still need a password…"
          : waiting === 0
            ? "Every business has set a password for the new sign-in."
            : `${waiting} business${waiting === 1 ? " hasn't" : "es haven't"} set a password for the new sign-in yet. Each can be emailed a link to set one (it works once, for 7 days); a business is emailed at most once a week.`}
      </p>
      {waiting !== null && waiting > 0 && (
        <button
          onClick={run}
          disabled={running}
          className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {running ? "Sending…" : "Email them a set-password link"}
        </button>
      )}
      <div aria-live="polite" className="mt-2 text-sm text-slate-700">
        {done && (
          <p>
            {done.sent} emailed.{done.alreadySent > 0 && ` ${done.alreadySent} already emailed this week.`}
            {done.failed.length > 0 && ` Couldn't email: ${done.failed.join(", ")}.`}
          </p>
        )}
        {error && <p className="text-red-700">{error}</p>}
      </div>
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
        each one needs is in place. Switch them on in this order. Nothing here changes anything except the copy and save buttons. The
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
                {s.id === "database" && !s.on && s.checks.some((c) => c.label === "Database answers" && c.state === "ok") && (
                  <ImportFromWix onDone={load} />
                )}
                {s.id === "database" && s.on && <CarryUnsubscribes />}
                {s.id === "database" && <SaveCopy database={s.on} />}
                {s.id === "logins" && s.on && <LoginInvites />}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
