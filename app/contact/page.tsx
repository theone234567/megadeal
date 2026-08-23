"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <PageShell
      title="Contact us"
      subtitle="Questions about an order, a deal, or listing your business — we're happy to help."
    >
      {sent ? (
        <p className="rounded-2xl bg-brand-50 p-4 font-medium text-brand-700">
          Thanks — we&apos;ve got your message and will get back to you soon.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              required
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
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Send message
          </button>
        </form>
      )}
    </PageShell>
  );
}
