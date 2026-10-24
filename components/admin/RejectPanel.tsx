"use client";

import { useState } from "react";
import { MAX_REJECT_NOTE, MIN_REJECT_NOTE, REJECT_PRESETS, rejectMessage } from "@/lib/dealRejectRules";

/**
 * Admin: "Reject" a deal (T242): final. The ticked reasons and the note
 * are what the business reads, on its portal card and by email, with a
 * button to start a new deal from this one. The credits it used come back.
 * "Send back for changes" (SendBackPanel) is the fixable outcome.
 */
export default function RejectPanel({
  dealId,
  wasLive,
  onRejected,
  onCancel,
}: {
  dealId: string;
  /** Live or paused now: rejecting takes it off the site. */
  wasLive: boolean;
  onRejected: (warning?: string) => void;
  onCancel: () => void;
}) {
  const [presets, setPresets] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = note.trim().length >= MIN_REJECT_NOTE;

  async function reject() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deals/${dealId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presets, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't reject it. Try again.");
      onRejected(data.warning);
    } catch (err: any) {
      setError(err?.message || "Couldn't reject it. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
      <p className="font-bold text-red-900">Reject this deal</p>
      <p className="mt-0.5 text-xs text-red-800">
        Final: it {wasLive ? "comes off MegaDeal and " : ""}can&apos;t be restarted, and the credits it used go back to the business. They
        see the reason in their portal and by email, with a button to start a new deal from this one. To let them fix this one
        instead, use Send back for changes.
      </p>
      <fieldset className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <legend className="sr-only">Why it can&apos;t be approved</legend>
        {REJECT_PRESETS.map((p) => (
          <label key={p.id} className="flex items-center gap-1.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={presets.includes(p.id)}
              onChange={(e) => setPresets((cur) => (e.target.checked ? [...cur, p.id] : cur.filter((x) => x !== p.id)))}
            />
            {p.label}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`reject-note-${dealId}`} className="mt-2 block text-xs font-semibold text-slate-700">
        Reason for the business (required)
      </label>
      <textarea
        id={`reject-note-${dealId}`}
        value={note}
        maxLength={MAX_REJECT_NOTE}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. The usual price of $40 doesn't match the menu on your website ($25)."
        className="mt-1 w-full rounded-lg border border-red-300 bg-white px-2 py-1.5 text-sm"
      />
      {ready && (
        <p className="mt-1 text-xs text-slate-600">
          <span className="font-semibold">They&apos;ll read:</span> {rejectMessage(presets, note)}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={reject}
          disabled={!ready || sending}
          className="rounded-full bg-red-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-40"
        >
          {sending ? "Rejecting…" : "Reject deal"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
          Cancel
        </button>
      </div>
    </div>
  );
}
