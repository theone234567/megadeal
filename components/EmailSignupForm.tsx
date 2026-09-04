"use client";

import { useState } from "react";
import { trackMetaPixelEvent } from "@/lib/metaPixel";

interface EmailSignupFormProps {
  audience: "customer" | "merchant";
  source?: string;
  placeholder?: string;
  buttonLabel?: string;
  accent?: "brand" | "ember";
  /** "onColor" (default) is for a colored/dark background (e.g. a gradient hero);
   * "plain" is for an ordinary light background (e.g. the footer). */
  surface?: "onColor" | "plain";
}

export default function EmailSignupForm({
  audience,
  source = "coming-soon",
  placeholder = "you@example.com",
  buttonLabel = "Count me in",
  accent = "brand",
  surface = "onColor",
}: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !consent) return;
    setState("saving");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/email-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, audience, source, consent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setState("done");
      trackMetaPixelEvent("Lead", { content_name: `email-signup-${audience}`, content_category: audience });
    } catch (err: any) {
      setErrorMessage(err?.message || "Something went wrong — please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p
        className={`rounded-2xl px-5 py-3 text-center text-sm font-bold shadow-card ${
          surface === "plain" ? "bg-brand-50 text-brand-700" : "bg-white/90 text-brand-700"
        }`}
      >
        📬 Almost there — check your email to confirm!
      </p>
    );
  }

  const buttonClass =
    accent === "ember"
      ? "bg-ember-500 hover:bg-ember-600"
      : "bg-brand-600 hover:bg-brand-700";

  const inputClass =
    surface === "plain"
      ? "border border-slate-200 bg-white text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400"
      : "border border-white/40 bg-white/95 text-slate-800 outline-none placeholder:text-slate-400 focus:border-white";

  const mutedTextClass = surface === "plain" ? "text-slate-500" : "text-white/80";
  const linkClass =
    surface === "plain"
      ? "underline hover:text-brand-700"
      : "underline hover:text-white";

  return (
    <div>
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className={`w-full min-w-0 rounded-full px-4 py-3 text-sm ${inputClass}`}
          />
          <button
            type="submit"
            disabled={state === "saving" || !consent}
            className={`shrink-0 rounded-full px-5 py-3 text-sm font-bold text-white shadow-card transition active:scale-95 disabled:opacity-60 ${buttonClass}`}
          >
            {state === "saving" ? "Joining…" : buttonLabel}
          </button>
        </div>
        <label className={`mt-2 flex items-start gap-2 text-xs ${mutedTextClass}`}>
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300"
          />
          <span>
            I agree to receive deal emails from MegaDeal and have read the{" "}
            <a href="/terms" className={linkClass}>
              terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className={linkClass}>
              privacy policy
            </a>
            . I can unsubscribe anytime.
          </span>
        </label>
      </form>
      {state === "error" && (
        <p className={`mt-2 text-xs ${surface === "plain" ? "text-red-600" : "text-red-100"}`}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
