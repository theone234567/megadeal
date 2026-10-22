"use client";

import { useEffect, useRef, useState } from "react";
import { getTurnstileToken, preloadTurnstile, turnstileProblemMessage } from "@/lib/turnstileClient";

// Cloudflare's robot check, once its keys are set (lib/turnstile.ts).
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

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
  // A business asking MegaDeal to change one of its submitted deals, from
  // the portal. Same rule as the report below: only an id survives.
  const changeId = (params.get("change") || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
  if (changeId) {
    return `I'd like to request a change to one of my deals.\n\nDeal ID: ${changeId}\n\nWhat should change:\n`;
  }
  const slug = (params.get("deal") || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 120);
  if (!slug) return "";
  return `I'd like to report a problem with a MegaDeal offer.\n\nDeal: ${slug}\n\nWhat happened:\n`;
}

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkSlotRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Seeds the message from ?deal= or ?change= once the page is on screen,
  // read here rather than with useSearchParams: that made the whole form
  // render only in the browser, so the page arrived without it and then
  // jumped by about 300px when it appeared (a layout shift of 0.16,
  // Lighthouse mobile, Oct 2026). Now the form is in the page as sent.
  // Only into an empty box, so nothing anyone has typed is replaced.
  useEffect(() => {
    const prefill = reportPrefill(new URLSearchParams(window.location.search));
    if (prefill && messageRef.current && !messageRef.current.value) messageRef.current.value = prefill;
  }, []);

  if (sent) {
    return (
      <p role="status" className="rounded-2xl bg-brand-50 p-4 font-medium text-brand-700">
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
          const captchaToken = TURNSTILE_SITE_KEY
            ? await getTurnstileToken(TURNSTILE_SITE_KEY, 30_000, checkSlotRef.current)
            : undefined;
          // The check didn't run in this browser: say why, not "didn't pass".
          if (TURNSTILE_SITE_KEY && !captchaToken) throw new Error(turnstileProblemMessage());
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: String(formData.get("name") ?? ""),
              email: String(formData.get("email") ?? ""),
              message: String(formData.get("message") ?? ""),
              captchaToken,
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
      onFocus={() => TURNSTILE_SITE_KEY && preloadTurnstile()}
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
          // Uncontrolled: seeded once (above), then the person can rewrite
          // any of it.
          ref={messageRef}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <div ref={checkSlotRef} className="empty:hidden" />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
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
