"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ChecklistItem, ChecklistSection, ItemState } from "@/lib/launchChecklist";

const when = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" });

const MARK: Record<ItemState, { sign: string; text: string; className: string }> = {
  done: { sign: "✓", text: "Done", className: "bg-emerald-100 text-emerald-800" },
  todo: { sign: "○", text: "To do", className: "bg-slate-100 text-slate-600" },
  warning: { sign: "!", text: "Check", className: "bg-amber-100 text-amber-900" },
  info: { sign: "i", text: "Note", className: "bg-slate-100 text-slate-700" },
};

/**
 * Admin > Launch checklist (docs/LAUNCH-DAY.md as a page). What the site
 * can check is ticked for it; the rest are ticked here by hand, saved on
 * the server so they hold on every device. Opening it changes nothing.
 */
export default function LaunchChecklistPage() {
  const [sections, setSections] = useState<ChecklistSection[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/launch-checklist", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("Sign in to the admin dashboard first.");
        if (!res.ok) throw new Error(json.error || "The checklist couldn't load. Please try again.");
        setSections(json.sections);
        setCheckedAt(json.checkedAt);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const setTick = (id: string, done: boolean, tickedAt: string | null) =>
    setSections((all) =>
      all?.map((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, state: done ? "done" : "todo", tickedAt } : i)) })) ?? null
    );

  async function tick(item: ChecklistItem, done: boolean) {
    // Shown at once; put back if it doesn't save.
    const before = { done: item.state === "done", tickedAt: item.tickedAt ?? null };
    setTick(item.id, done, done ? new Date().toISOString() : null);
    setError(null);
    try {
      const res = await fetch("/api/admin/launch-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, done }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't save that tick. Please try again.");
      setTick(item.id, done, json.tickedAt ?? null);
    } catch (err: any) {
      setTick(item.id, before.done, before.tickedAt);
      setError(err?.message || "Couldn't save that tick.");
    }
  }

  const all = sections?.flatMap((s) => s.items) ?? [];
  const done = all.filter((i) => i.state === "done").length;
  // Notes are information, not jobs.
  const total = all.filter((i) => i.state !== "info").length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to admin
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Launch checklist</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Everything to do to open MegaDeal to the public, in order. Items the site can check tick themselves; tick the rest here when
        they&apos;re done. Opening this page changes nothing. The same steps, in more detail, are in docs/LAUNCH-DAY.md.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-brand-400 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Check again"}
        </button>
        {checkedAt && <span className="text-xs text-slate-500">Checked {when.format(new Date(checkedAt))}</span>}
        {sections && (
          <span className="ml-auto rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700" role="status">
            {done} of {total} done
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {error}
        </p>
      )}

      {sections && (
        <ol className="mt-6 space-y-5">
          {sections.map((s) => (
            <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{s.title}</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {s.items.map((item) => {
                  const m = MARK[item.state];
                  const titleId = `item-${item.id}`;
                  return (
                    <li key={item.id} className="flex gap-3 py-3">
                      {item.manual ? (
                        <input
                          type="checkbox"
                          checked={item.state === "done"}
                          onChange={(e) => tick(item, e.target.checked)}
                          aria-labelledby={titleId}
                          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600"
                        />
                      ) : (
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.className}`}
                          aria-hidden="true"
                        >
                          {m.sign}
                        </span>
                      )}
                      <div className="min-w-0 text-sm">
                        <p id={titleId} className={`font-semibold ${item.state === "done" ? "text-slate-500" : "text-slate-900"}`}>
                          {!item.manual && <span className="sr-only">{m.text}: </span>}
                          {item.title}
                          {item.manual && <span className="ml-2 text-xs font-normal text-slate-400">tick when done</span>}
                        </p>
                        <p className="break-words text-slate-600">{item.detail}</p>
                        {(item.link || (item.manual && item.tickedAt)) && (
                          <p className="mt-1 flex flex-wrap gap-x-4 text-xs">
                            {item.link && (
                              <Link href={item.link.href} className="font-semibold text-brand-700 hover:underline">
                                {item.link.label} →
                              </Link>
                            )}
                            {item.manual && item.tickedAt && <span className="text-slate-400">Ticked {when.format(new Date(item.tickedAt))}</span>}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
