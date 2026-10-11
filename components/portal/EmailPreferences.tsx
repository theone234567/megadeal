"use client";

import { useEffect, useState } from "react";

type Prefs = { news: boolean; announcements: boolean };

const CHOICES: { key: keyof Prefs; title: string; hint: string }[] = [
  { key: "news", title: "Business news and tips", hint: "Ideas for better deals, and what's new on MegaDeal." },
  { key: "announcements", title: "Announcements and reminders", hint: "Big MegaDeal news, and a nudge if your listing isn't finished." },
];

/**
 * Portal > Emails from MegaDeal: the business's own say over marketing
 * emails (app/api/merchants/email-preferences). Emails about the account
 * and deals aren't optional and aren't listed.
 */
export default function EmailPreferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState<keyof Prefs | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/merchants/email-preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && typeof d.news === "boolean" && setPrefs({ news: d.news, announcements: d.announcements }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function change(key: keyof Prefs, value: boolean) {
    if (!prefs) return;
    setSaving(key);
    setNote(null);
    try {
      const res = await fetch("/api/merchants/email-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't save that.");
      setPrefs({ news: d.news, announcements: d.announcements });
      setNote("Saved.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setSaving(null);
    }
  }

  if (!prefs) return null;

  return (
    <section aria-labelledby="email-prefs" className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h2 id="email-prefs" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Emails from MegaDeal
      </h2>
      <ul className="mt-3 space-y-3">
        {CHOICES.map((c) => (
          <li key={c.key}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={prefs[c.key]}
                disabled={saving !== null}
                onChange={(e) => change(c.key, e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-brand-600 focus:ring-brand-400"
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">{c.title}</span>
                <span className="block text-xs text-slate-600">{c.hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Emails about your account and your deals (sign-in codes, approvals, deal updates) always come.
      </p>
      <p role="status" className="mt-1 min-h-[1rem] text-xs font-semibold text-brand-700">
        {note}
      </p>
    </section>
  );
}
