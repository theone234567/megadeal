"use client";

import { useState } from "react";

export default function ContactForm() {
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
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          required
          name="name"
          type="text"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          required
          name="email"
          type="email"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          required
          name="message"
          rows={5}
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
