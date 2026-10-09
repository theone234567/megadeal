"use client";

import { useId, useRef, useState } from "react";
import { trackMetaPixelEvent } from "@/lib/metaPixel";
import { getTurnstileToken, preloadTurnstile, turnstileProblemMessage } from "@/lib/turnstileClient";

// Cloudflare's robot check, once its keys are set (lib/turnstile.ts):
// invisible to nearly everyone; a challenge, if shown, appears in the form.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

interface EmailSignupFormProps {
  audience: "customer" | "merchant";
  source?: string;
  placeholder?: string;
  buttonLabel?: string;
  accent?: "brand" | "ember";
  /** "onColor" (default) is for a colored/dark background (e.g. a gradient hero);
   * "plain" is for an ordinary light background (e.g. the footer). */
  surface?: "onColor" | "plain";
  /** Centers the consent checkbox + text as a block, for use inside an
   *  already text-centered layout (e.g. a hero CTA) — everywhere else the
   *  form sits in a left-aligned card/column, where centering just this
   *  one row would look wrong instead of right. */
  center?: boolean;
  /** "responsive" (default): the button under the email box on phones,
   *  beside it from 640px, so on a phone the box gets the full width (side
   *  by side it was squeezed to where a real address scrolled out of view
   *  while typing). "stacked": always under. "row": always beside. */
  layout?: "row" | "stacked" | "responsive";
  /** "pill" (default) or "rounded": 8px corners, 52px-high controls, 14px
   *  consent text and 12px spacing, for the coming-soon design. Look only;
   *  behaviour is identical. */
  shape?: "pill" | "rounded";
  /** A visible label for the email box (it then names the box for screen
   *  readers too). Without it the box keeps its hidden "Email address". */
  label?: string;
}

export default function EmailSignupForm({
  audience,
  source = "coming-soon",
  placeholder = "you@example.com",
  buttonLabel = "Count me in",
  accent = "brand",
  surface = "onColor",
  center = false,
  layout = "responsive",
  shape = "pill",
  label,
}: EmailSignupFormProps) {
  const rounded = shape === "rounded";
  const corners = rounded ? "min-h-[52px] rounded-lg" : "rounded-full";
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  // Set when someone presses the button without ticking the consent box.
  // The button used to stay disabled (and faded) until the box was ticked,
  // which looked broken and never said why.
  const [consentMissing, setConsentMissing] = useState(false);
  const consentRef = useRef<HTMLInputElement>(null);
  const consentErrorId = useId();
  const checkSlotRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (!consent) {
      setConsentMissing(true);
      consentRef.current?.focus();
      return;
    }
    setState("saving");
    setErrorMessage(null);
    try {
      const captchaToken = TURNSTILE_SITE_KEY
        ? await getTurnstileToken(TURNSTILE_SITE_KEY, 30_000, checkSlotRef.current)
        : undefined;
      // The check didn't run in this browser: say why, not "didn't pass".
      if (TURNSTILE_SITE_KEY && !captchaToken) throw new Error(turnstileProblemMessage());
      const res = await fetch("/api/email-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, audience, source, consent, captchaToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setState("done");
      trackMetaPixelEvent("Lead", { content_name: `email-signup-${audience}`, content_category: audience });
      // Remembers the signup, so any future "join our list" prompt can skip
      // people who already joined — a signup via any form on the site counts.
      try {
        localStorage.setItem("megadeal-email-subscribed", "1");
      } catch {
        // Private browsing / blocked storage — fine, just means a prompt
        // might ask again later. Not worth failing the signup over.
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Something went wrong — please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p
        role="status"
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
      ? "bg-ember-600 hover:bg-ember-700"
      : "bg-brand-600 hover:bg-brand-700";

  // The "rounded" shape sits on the coming-soon page's soft-grey panel:
  // its colours come from that design (charcoal label, #625D6B supporting
  // text, purple links, a slightly firmer grey border, no button shadow).
  const inputClass =
    rounded
      ? "border border-[#D6D3DC] bg-white text-[#37343D] outline-none placeholder:text-[#625D6B] focus:border-brand-400"
      : surface === "plain"
      ? "border border-slate-200 bg-white text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400"
      : "border border-white/40 bg-white/95 text-slate-800 outline-none placeholder:text-slate-400 focus:border-white";

  const mutedTextClass = rounded ? "text-[#625D6B]" : surface === "plain" ? "text-slate-600" : "text-white/80";
  const linkClass = rounded
    ? "font-semibold text-brand-600 underline hover:text-brand-700"
    : surface === "plain"
      ? "underline hover:text-brand-700"
      : "underline hover:text-white";

  return (
    <div>
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        {label && (
          <label htmlFor={emailId} className={`block font-bold ${rounded ? "text-[#222126]" : "text-[#0F172A]"} ${rounded ? "mb-3 text-base sm:text-lg" : "mb-2 text-sm"}`}>
            {label}
          </label>
        )}
        <div
          className={
            layout === "stacked"
              ? "flex flex-col gap-2"
              : layout === "responsive"
                ? "flex flex-col gap-2 sm:flex-row"
                : "flex gap-2"
          }
        >
          <input
            id={emailId}
            type="email"
            required
            // The placeholder disappears once typing starts and isn't a
            // name screen readers can rely on, so the box carries its own
            // (or the visible label above names it).
            aria-label={label ? undefined : "Email address"}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            // Loaded once someone starts, not on every page with a footer.
            onFocus={() => TURNSTILE_SITE_KEY && preloadTurnstile()}
            placeholder={placeholder}
            // 16px on phones: iOS zooms the page into any smaller input.
            className={`w-full min-w-0 ${corners} px-4 py-3 text-base ${rounded ? "" : "sm:text-sm"} ${inputClass}`}
          />
          <button
            type="submit"
            disabled={state === "saving"}
            aria-busy={state === "saving" || undefined}
            className={`${corners} py-3 ${rounded ? "px-6 text-base" : "px-5 text-sm"} font-bold text-white ${rounded ? "" : "shadow-card"} transition active:scale-95 disabled:opacity-60 ${
              layout === "stacked" ? "w-full" : layout === "responsive" ? "w-full sm:w-auto sm:shrink-0" : "shrink-0"
            } ${buttonClass}`}
          >
            {state === "saving" ? "Joining…" : buttonLabel}
          </button>
        </div>
        <label
          className={`flex items-start gap-2 ${rounded ? "mt-3 text-sm leading-relaxed" : "mt-2 text-xs"} ${
            center ? "mx-auto max-w-xl" : ""
          } ${mutedTextClass}`}
        >
          <input
            ref={consentRef}
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (e.target.checked) setConsentMissing(false);
            }}
            aria-invalid={consentMissing || undefined}
            aria-describedby={consentMissing ? consentErrorId : undefined}
            /* 20px, up from 14px, which was genuinely hard to hit on a
               phone. It is the wrapping <label> rather than the box itself
               that satisfies the 24px minimum target size (WCAG 2.2 SC
               2.5.8) — the whole consent line toggles it, so the box stays
               visually modest without the target being small. */
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300"
          />
          <span>
            I agree to receive {audience === "merchant" ? "launch updates for businesses" : "deal emails"} from MegaDeal and have read the{" "}
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
        {consentMissing && (
          <p
            id={consentErrorId}
            role="alert"
            className={`mt-2 text-xs font-semibold ${surface === "plain" ? "text-red-600" : "text-red-100"}`}
          >
            Please tick the box to agree to emails first.
          </p>
        )}
        <div ref={checkSlotRef} className="empty:hidden" />
      </form>
      {state === "error" && (
        <p role="alert" className={`mt-2 ${rounded ? "text-sm" : "text-xs"} ${surface === "plain" ? "text-red-600" : "text-red-100"}`}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
