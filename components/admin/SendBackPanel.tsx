"use client";

import { useState } from "react";
import { MAX_SEND_BACK_NOTE, MIN_SEND_BACK_NOTE, SEND_BACK_PRESETS, sendBackMessage } from "@/lib/dealSendBackRules";

/**
 * Admin: "Send back for changes" on a deal waiting for review (T181). The
 * ticked reasons and the note are what the business reads, in its portal
 * and by email; the deal goes back to its drafts with its credits.
 */
export default function SendBackPanel({
  dealId,
  suggestedNote,
  onSent,
  onCancel,
}: {
  dealId: string;
  /** The automatic check's note to the business, when it left one. */
  suggestedNote?: string | null;
  onSent: (warning?: string) => void;
  onCancel: () => void;
}) {
  const [presets, setPresets] = useState<string[]>([]);
  const [note, setNote] = useState(suggestedNote?.trim() ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = note.trim().length >= MIN_SEND_BACK_NOTE;

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deals/${dealId}/send-back`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presets, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send it back. Try again.");
      onSent(data.warning);
    } catch (err: any) {
      setError(err?.message || "Couldn't send it back. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
      <p className="font-bold text-amber-900">Send back for changes</p>
      <p className="mt-0.5 text-xs text-amber-800">
        It goes back to the business&apos;s drafts with its credits, the same deal and code. They see this in their portal and by
        email, then fix it and resubmit.
      </p>
      <fieldset className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <legend className="sr-only">What to change</legend>
        {SEND_BACK_PRESETS.map((p) => (
          <label key={p.id} className="flex items-center gap-1.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={presets.includes(p.id)}
              onChange={(e) => setPresets((cur) => (e.target.checked ? [...cur, p.id] : cur.filter((x) => x !== p.id)))}
            />
            {p.label.charAt(0).toUpperCase() + p.label.slice(1)}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`send-back-note-${dealId}`} className="mt-2 block text-xs font-semibold text-slate-700">
        Note to the business (required)
      </label>
      <textarea
        id={`send-back-note-${dealId}`}
        value={note}
        maxLength={MAX_SEND_BACK_NOTE}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Please use a photo of the scone itself, not the shop front."
        className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm"
      />
      {ready && (
        <p className="mt-1 text-xs text-slate-600">
          <span className="font-semibold">They&apos;ll read:</span> {sendBackMessage(presets, note)}
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
          onClick={send}
          disabled={!ready || sending}
          className="rounded-full bg-amber-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send back"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
          Cancel
        </button>
      </div>
    </div>
  );
}
