"use client";

import { useEffect, useState } from "react";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" });

/**
 * Admin > Messages: what people sent through the contact form, newest
 * first. Each one is emailed too; this is the copy that's there even when
 * that email didn't arrive.
 */
export default function ContactMessagesPanel({ onSeen }: { onSeen?: () => void }) {
  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/admin/contact-messages")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 401 ? "Your admin session has expired — sign in again." : data.error || "Couldn't load the messages.");
        if (!live) return;
        const list: ContactMessage[] = data.items ?? [];
        setItems(list);
        // On screen now: mark them read (up to the newest shown), so Needs
        // attention stops counting them, on every device.
        if (list.length && data.unseen > 0) {
          const res = await fetch("/api/admin/contact-messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: list[0].id }),
          }).catch(() => null);
          if (res?.ok && live) onSeen?.();
        }
      })
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
    // onSeen only tells the dashboard; reloading for a new one isn't wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <p className="text-sm text-slate-600">
        Messages from the contact form, newest first (the latest 200). Each is emailed to you as well; anything whose
        email didn&apos;t arrive is still here.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {!error && items === null && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
      {items?.length === 0 && <p className="mt-4 text-sm text-slate-500">No messages yet.</p>}
      {items && items.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((m) => (
            <li key={m.id} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-semibold text-slate-900">
                  {m.name}{" "}
                  <a
                    href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent("Re: your message to MegaDeal")}`}
                    className="break-all font-normal text-brand-700 underline"
                  >
                    {m.email}
                  </a>
                </p>
                <p className="text-xs text-slate-500">{when(m.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
