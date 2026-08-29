"use client";

import { useState } from "react";

export default function NotificationPreferences({
  notifyReferralBonus,
}: {
  notifyReferralBonus?: boolean;
}) {
  const [checked, setChecked] = useState(notifyReferralBonus !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: boolean) {
    const previous = checked;
    setChecked(value);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/merchants/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyReferralBonus: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setChecked(previous);
      setError("Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold text-slate-900">Notification preferences</h2>
      <label className="mt-3 flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={checked}
          disabled={saving}
          onChange={(e) => handleChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
        />
        <span>Email me when I earn referral bonus credits</span>
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
