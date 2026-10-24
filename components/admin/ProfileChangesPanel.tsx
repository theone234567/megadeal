"use client";

import { useState } from "react";
import { PROFILE_FIELD_LABELS, REVIEWED_PROFILE_FIELDS, type ReviewedField } from "@/lib/profileReviewRules";

/**
 * Admin: an approved business's profile changes waiting for a check
 * (security pack T161): what each field says now and would say, why it
 * was held, and approve or decline (with a note the business reads).
 */
export default function ProfileChangesPanel({
  merchantId,
  current,
  pending,
  review,
  onDone,
}: {
  merchantId: string;
  current: Record<string, any>;
  pending: Record<string, string>;
  review: { reason?: string | null; review?: { reasons?: string[] } | null } | null;
  onDone: (approved: Record<string, string> | null) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fields = (Object.keys(pending) as ReviewedField[]).filter((f) => (REVIEWED_PROFILE_FIELDS as readonly string[]).includes(f));

  async function decide(decision: "approve" | "decline") {
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}/profile-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      onDone(decision === "approve" ? pending : null);
    } catch (err: any) {
      setError(err?.message || "Couldn't save that. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const reasons = [review?.reason, ...(review?.review?.reasons ?? [])].filter((r, i, all): r is string => Boolean(r) && all.indexOf(r) === i);

  return (
    <section className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 sm:col-span-2" aria-labelledby="profile-changes">
      <h2 id="profile-changes" className="text-sm font-bold text-amber-900">
        Profile changes waiting for you
      </h2>
      <p className="mt-1 text-xs text-amber-800">Customers still see the current version until you approve these.</p>
      {reasons.length > 0 && <p className="mt-2 text-sm text-amber-900">Why they&apos;re held: {reasons.join("; ")}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="py-1 pr-3 font-semibold">Field</th>
              <th className="py-1 pr-3 font-semibold">Now</th>
              <th className="py-1 font-semibold">Would become</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f} className="align-top">
                <td className="py-1.5 pr-3 font-semibold text-slate-800">{PROFILE_FIELD_LABELS[f]}</td>
                <td className="max-w-xs whitespace-pre-wrap break-words py-1.5 pr-3 text-slate-500">{String(current[f] ?? "") || "(empty)"}</td>
                <td className="max-w-xs whitespace-pre-wrap break-words py-1.5 text-slate-900">{pending[f] || "(empty)"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label htmlFor="profile-decline-note" className="mt-3 block text-xs font-semibold text-slate-700">
        Note to the business, if you decline
      </label>
      <input
        id="profile-decline-note"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Please describe your business in the About text."
        className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("approve")}
          disabled={busy !== null}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy === "approve" ? "Approving…" : "Approve changes"}
        </button>
        <button
          type="button"
          onClick={() => decide("decline")}
          disabled={busy !== null || note.trim().length < 5}
          className="rounded-full border border-amber-400 px-4 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {busy === "decline" ? "Declining…" : "Decline"}
        </button>
      </div>
    </section>
  );
}
