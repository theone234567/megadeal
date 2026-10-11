"use client";

import { useEffect, useState } from "react";

interface Candidate {
  id: string;
  businessName: string;
  email: string;
  missing: string[];
}

/**
 * Admin: businesses that signed up over a day ago but haven't finished
 * their listing, and a button to email them a "finish your listing"
 * reminder (app/api/admin/listing-reminders). Hidden when there's no one
 * to remind. Each business gets at most two, a week apart.
 */
export default function ListingRemindersPanel() {
  const [list, setList] = useState<Candidate[] | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function fetchList(): Promise<Candidate[]> {
    const res = await fetch("/api/admin/listing-reminders").catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    return Array.isArray(data?.candidates) ? data.candidates : [];
  }

  useEffect(() => {
    let live = true;
    fetchList().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, []);

  async function send() {
    if (!list?.length) return;
    if (!window.confirm(`Email ${list.length === 1 ? "this business" : `these ${list.length} businesses`} a reminder to finish their listing?`)) return;
    setSending(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/listing-reminders", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sending failed.");
      setNote(
        `${data.sent} sent.${data.failed?.length ? ` Couldn't send to ${data.failed.join(", ")}.` : ""}${data.remaining ? ` ${data.remaining} more: press again.` : ""}`
      );
      setList(await fetchList());
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Sending failed.");
    } finally {
      setSending(false);
    }
  }

  if (!list || (list.length === 0 && !note)) return null;

  return (
    <section aria-labelledby="listing-reminders" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 id="listing-reminders" className="text-sm font-bold text-amber-900">
        {list.length === 1 ? "1 business hasn't" : `${list.length} businesses haven't`} finished their listing
      </h2>
      {list.length > 0 && (
        <>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {list.slice(0, 8).map((c) => (
              <li key={c.id}>
                <a href={`/admin/businesses/${c.id}`} className="font-semibold underline-offset-2 hover:underline">
                  {c.businessName || c.email}
                </a>
                <span className="text-amber-800"> · needs {c.missing.map((m) => m.replace(/^(your|a) /, "")).join(", ")}</span>
              </li>
            ))}
            {list.length > 8 && <li className="text-amber-800">and {list.length - 8} more</li>}
          </ul>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="mt-3 rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {sending ? "Sending…" : `Email ${list.length === 1 ? "them" : `all ${list.length}`} a reminder`}
          </button>
          <p className="mt-2 text-xs text-amber-800">
            A friendly &ldquo;your listing is nearly ready&rdquo; email naming what&apos;s missing, with a link to their
            portal. At most two per business, a week apart.
          </p>
        </>
      )}
      {note && (
        <p role="status" className="mt-2 text-sm font-semibold text-amber-900">
          {note}
        </p>
      )}
    </section>
  );
}
