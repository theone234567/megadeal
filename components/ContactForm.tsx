"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Composes the opening of a "this deal wasn't honoured" report from the
 * link on a deal page, so the message arrives naming the deal instead of
 * as "a deal I saw didn't work", which costs an email round-trip before
 * anything can be looked into.
 *
 * Deliberately NOT a free-text ?message= parameter. That would let anyone
 * put arbitrary prose in front of a visitor under MegaDeal's own branding
 * and invite them to send it. Only a slug is accepted, only the characters
 * a slug can contain survive, and the sentence around it is written here.
 * The person still reads and edits the whole thing before sending.
 */
function reportPrefill(params: URLSearchParams): string {
  const slug = (params.get("deal") || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 120);
  if (!slug) return "";
  return `I'd like to report a problem with a MegaDeal offer.\n\nDeal: ${slug}\n\nWhat happened:\n`;
}

export default function ContactForm() {
  const searchParams = useSearchParams();
  const prefill = reportPrefill(new URLSearchParams(searchParams?.toString() ?? ""));
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <p className="rounded-2xl bg-brand-50 p-4 font-medium text-brand-700">
        Thanks — we&apos;ve got your message and will get back to you soon.
      </p>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
          const formData = new FormData(e.currentTarget);
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: String(formData.get("name") ?? ""),
              email: String(formData.get("email") ?? ""),
              message: String(formData.get("message") ?? ""),
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Something went wrong sending your message.");
          }
          setSent(true);
        } catch (err: any) {
          setError(err?.message || "Something went wrong sending your message. Please try again.");
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          id="contact-name"
          required
          name="name"
          type="text"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="contact-email"
          required
          name="email"
          type="email"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          name="message"
          rows={5}
          // defaultValue, not value: this seeds the box and then gets out
          // of the way, so the person can rewrite any of it.
          defaultValue={prefill}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
