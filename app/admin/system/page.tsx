"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { firstProblem } from "@/lib/systemFirstProblem";

type CheckState = "ok" | "missing" | "warning" | "info";
interface Check {
  label: string;
  state: CheckState;
  detail: string;
}
interface Section {
  id: string;
  title: string;
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
  return s.ready ? { text: "All good", className: "bg-emerald-700 text-white" } : { text: "Something's missing", className: "bg-red-600 text-white" };
}

/**
 * What to say when a button's request fails. With no message from the site
 * itself, Cloudflare cut the request off: usually it ran out of processing
 * time (error 1102), which the free Workers plan allows little of.
 */
function failure(res: Response, json: { error?: string }, fallback: string): string {
  if (json.error) return json.error;
  if (res.status >= 500) {
    return "Cloudflare stopped it before it finished, which usually means it needed more processing time than the free Workers plan allows. It's safe to run again; on Workers Paid it has the time it needs.";
  }
  return fallback;
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
        if (!res.ok) throw new Error(failure(res, json, "Copying stopped. Try again."));
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
        {left} photo{left === 1 ? " is" : "s are"} still loaded from Wix&apos;s servers. Copying is safe to stop and run again; each
        business and deal switches to its copy only once it&apos;s stored.
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

/** Applies database updates the site ships with (app/api/admin/apply-migrations). */
function ApplyUpdates({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/apply-migrations", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(failure(res, json, "It didn't apply. Nothing was changed; please try again."));
      const n = (json.applied ?? []).length;
      setMessage({ ok: true, text: n ? `Applied ${n} update${n === 1 ? "" : "s"}. The database is up to date.` : "Nothing to apply: the database is up to date." });
      onDone();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
      <p className="text-sm text-slate-700">
        The site has a database update waiting. Applying it is safe at any time: each update applies whole or not at all, and
        your businesses, deals and subscribers are kept.
      </p>
      <button
        onClick={run}
        disabled={running}
        className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {running ? "Applying…" : "Apply database updates"}
      </button>
      {message && (
        <p aria-live="polite" className={`mt-2 text-sm ${message.ok ? "text-slate-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** Saves a copy of the database to the private backups bucket now (app/api/admin/save-copy). */
function SaveCopy() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/save-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ what: "database" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(failure(res, json, "It stopped. Please try again."));
      setMessage({
        ok: true,
        text: `Saved as ${json.saved} (${Math.max(1, Math.round(json.bytes / 1024))} KB) in the backups bucket. Copies there are deleted after 30 days; to keep one longer, download it from Cloudflare > R2 and store it somewhere private.`,
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
        Save a copy of the database to the private backups bucket now: the same copy the nightly backup takes. Worth doing before
        any big change.
      </p>
      <button
        onClick={run}
        disabled={running}
        className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {running ? "Saving…" : "Save a copy of the database"}
      </button>
      {message && (
        <p aria-live="polite" className={`mt-2 break-words text-sm ${message.ok ? "text-slate-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/**
 * Puts a nightly copy back into a new, empty database: for after a
 * disaster (app/api/admin/restore-backup). It refuses a database that
 * already has data, so it can't overwrite anything.
 */
function RestoreBackup() {
  type Copy = { key: string; uploaded: string; size: number };
  const [copies, setCopies] = useState<Copy[] | null>(null);
  const [key, setKey] = useState("");
  const [running, setRunning] = useState<null | "rehearse" | "restore">(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const date = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" });

  function load() {
    if (copies) return;
    fetch("/api/admin/restore-backup", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(failure(res, json, "Couldn't list the backups."));
        setCopies(json.backups);
        setKey(json.backups[0]?.key ?? "");
      })
      .catch((err) => setMessage({ ok: false, text: err.message }));
  }

  async function run(mode: "rehearse" | "restore") {
    if (mode === "restore" && !window.confirm("Restore this backup into the database? It only works on a new, empty database.")) return;
    setRunning(mode);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/restore-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, mode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(failure(res, json, "It stopped. Please try again."));
      const counts = Object.entries(json.counts as Record<string, number>)
        .filter(([, n]) => n > 0)
        .map(([t, n]) => `${t.replace(/_/g, " ")} ${n}`)
        .join(", ");
      const relink = json.loginsToRelink
        ? ` ${json.loginsToRelink} business${json.loginsToRelink === 1 ? "'s login isn't" : "es' logins aren't"} in this database: each owner sets a password again (Business logins > Email them a set-password link) and their business is theirs when they sign in.`
        : "";
      setMessage({
        ok: true,
        text: `${json.restored ? "Restored" : "Rehearsal finished, nothing was kept"}: the copy from ${date.format(new Date(json.takenAt))} (${counts || "empty"}).${relink}`,
      });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setRunning(null);
    }
  }

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" onToggle={(e) => e.currentTarget.open && load()}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">Restore from a backup (if the database is ever lost)</summary>
      <p className="mt-2 text-sm text-slate-700">
        Puts a nightly copy back into a new, empty database: set one up with the setup script, point Hyperdrive at it, then
        restore here. It refuses a database that already has data, so it can&apos;t overwrite anything. Rehearse first.
      </p>
      {copies && copies.length === 0 && <p className="mt-2 text-sm text-slate-700">No backups yet.</p>}
      {copies && copies.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-700" htmlFor="restore-copy">
            Copy
          </label>
          <select
            id="restore-copy"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
          >
            {copies.map((c) => (
              <option key={c.key} value={c.key}>
                {date.format(new Date(c.uploaded))} ({Math.max(1, Math.round(c.size / 1024))} KB)
              </option>
            ))}
          </select>
          <button
            onClick={() => run("rehearse")}
            disabled={running !== null || !key}
            className="rounded-lg border border-brand-600 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
          >
            {running === "rehearse" ? "Rehearsing…" : "Rehearse (changes nothing)"}
          </button>
          <button
            onClick={() => run("restore")}
            disabled={running !== null || !key}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {running === "restore" ? "Restoring…" : "Restore"}
          </button>
        </div>
      )}
      {message && (
        <p aria-live="polite" className={`mt-2 break-words text-sm ${message.ok ? "text-slate-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </details>
  );
}

/** Emails each business without a login yet a link to set its password (app/api/admin/login-invites). */
function LoginInvites() {
  const [waiting, setWaiting] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ sent: number; alreadySent: number; failed: string[]; waiting: number; quotaReached: boolean } | null>(null);
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
    const total = { sent: 0, alreadySent: 0, failed: [] as string[], waiting: 0, quotaReached: false };
    try {
      // A batch at a time until none are left to try, the email service's
      // daily limit is reached, or a batch gets nowhere. Addresses that
      // fail are passed over by the next batch, so they can't stop it.
      for (let i = 0; i < 100; i++) {
        const res = await fetch("/api/admin/login-invites", { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(failure(res, json, "Sending stopped. Try again."));
        total.sent += json.sent;
        total.alreadySent = json.alreadySent;
        total.failed = [...new Set([...total.failed, ...json.failed])];
        total.waiting = json.waiting;
        total.quotaReached = json.quotaReached;
        setDone({ ...total });
        if (json.remaining === 0 || json.quotaReached || (json.sent === 0 && json.failed.length === 0)) break;
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
            {done.failed.length > 0 && ` Couldn't email: ${done.failed.join(", ")} (tried again if you press this in an hour or more).`}
            {done.quotaReached && " The email service's daily sending limit was reached: press this again tomorrow to email the rest. Nobody is emailed twice."}
          </p>
        )}
        {error && <p className="text-red-700">{error}</p>}
      </div>
    </div>
  );
}

/** Admin: whether the database, photos, email and logins have everything they need, checked live (lib/systemChecks.ts). */
export default function SystemChecksPage() {
  const [data, setData] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/system", { cache: "no-store" })
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
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">System checks</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Checks, live, that the database, photos, email and business logins have everything they need. Nothing here changes
        anything except the buttons.
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

      {data && firstProblem(data) && (
        <div className="mt-6 rounded-2xl border-2 border-red-600 bg-red-50 p-4" role="status">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Needs fixing</p>
          <p className="mt-1 text-sm text-slate-900">{firstProblem(data)}</p>
        </div>
      )}

      {data && (
        <ul className="mt-6 space-y-5">
          {data.sections.map((s) => {
            const st = status(s);
            return (
              <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{s.title}</h2>
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
                {s.id === "photos" && data.wixPhotosLeft != null && data.wixPhotosLeft > 0 && (
                  <CopyPhotos left={data.wixPhotosLeft} onDone={load} />
                )}
                {s.id === "database" && s.checks.some((c) => c.label === "Tables up to date" && c.state === "missing") && (
                  <ApplyUpdates onDone={load} />
                )}
                {s.id === "database" && <SaveCopy />}
                {s.id === "database" && <RestoreBackup />}
                {s.id === "logins" && <LoginInvites />}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
