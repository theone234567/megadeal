"use client";

import { useEffect, useState } from "react";

/**
 * Portal > Emails from MegaDeal: the business's one email choice, news
 * and updates from MegaDeal on or off (app/api/merchants/email-preferences,
 * lib/businessEmailChoices.ts). Emails about the account and deals aren't
 * optional and aren't listed.
 */
export default function EmailPreferences() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/merchants/email-preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && typeof d.subscribed === "boolean" && setSubscribed(d.subscribed))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function change(value: boolean) {
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch("/api/merchants/email-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't save that.");
      setSubscribed(d.subscribed);
      setNote("Saved.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  }

  if (subscribed === null) return null;

  return (
    <section aria-labelledby="email-prefs" className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h2 id="email-prefs" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Emails from MegaDeal
      </h2>
      <label className="mt-3 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={subscribed}
          disabled={saving}
          onChange={(e) => change(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-brand-600 focus:ring-brand-400"
        />
        <span>
          <span className="block text-sm font-bold text-slate-900">News and updates from MegaDeal</span>
          <span className="block text-xs text-slate-600">
            Tips for better deals, MegaDeal news and announcements, and a reminder if your listing isn&apos;t finished.
          </span>
        </span>
      </label>
      <p className="mt-3 text-xs text-slate-500">
        Emails about your account and your deals (sign-in codes, approvals, deal updates) always come.
      </p>
      <p role="status" className="mt-1 min-h-[1rem] text-xs font-semibold text-brand-700">
        {note}
      </p>
    </section>
  );
}
