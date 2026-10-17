"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CopyIcon } from "@/components/icons";

/**
 * "Get deal code" in the price card. The button turns into the code, in
 * place, and it stays there (no pop-up): for the rest of this visit the
 * code is shown on the deal page straight away, even after a reload. It's
 * the deal's one fixed code, the same for everyone; nothing is copied or
 * opened by itself. The code isn't in the page's HTML until it's asked for.
 *
 * "Reveal code & booking options" does the same and scrolls to Contact &
 * booking. On a phone, a bar with the price and the button stays at the
 * bottom of the screen while the price card is out of view; once the code
 * is shown, the bar shows the code.
 */

const EVENT = "megadeal:code-revealed";
const key = (slug: string) => `md_code_${slug}`;

function useRevealed(slug: string, preview: boolean): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(EVENT, onChange);
      return () => window.removeEventListener(EVENT, onChange);
    },
    () => {
      if (preview) return false;
      try {
        return sessionStorage.getItem(key(slug)) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
}

export default function DealCodeReveal({
  slug,
  code,
  instruction,
  note,
  ownWords,
  businessName,
  price,
  preview,
  onReveal,
  onCopied,
}: {
  slug: string;
  code: string | null;
  /** How to use the code (lib/dealContact.ts). */
  instruction: string;
  /** "A code is not a confirmed booking." and the like. */
  note: string | null;
  /** The business's own note on using the deal. */
  ownWords: string | null;
  businessName: string | null;
  price: { now: string; was: string | null };
  preview: boolean;
  /** "main" from the price card (or its link), "sticky" from the phone's bar. */
  onReveal: (source: "main" | "sticky") => void;
  onCopied: () => void;
}) {
  const stored = useRevealed(slug, preview);
  // A preview reveals for this view only, and remembers nothing.
  const [shownHere, setShownHere] = useState(false);
  const revealed = stored || shownHere;
  const [copied, setCopied] = useState<"" | "Copied" | "failed">("");
  const cardRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLSpanElement>(null);

  function reveal(source: "main" | "sticky") {
    if (!revealed) onReveal(source);
    setShownHere(true);
    if (!preview) {
      try {
        sessionStorage.setItem(key(slug), "1");
      } catch {
        // Private browsing: shown for this page only.
      }
      window.dispatchEvent(new Event(EVENT));
    }
  }

  async function copy() {
    if (!code) return;
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(code);
      setCopied("Copied");
      onCopied();
    } catch {
      // Selected instead, to copy by hand. Not counted as a copy.
      const el = codeRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      setCopied("failed");
    }
  }
  useEffect(() => {
    if (copied !== "Copied") return;
    const t = setTimeout(() => setCopied(""), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  // The phone's bar: while the price card is out of view, until the end
  // of the deal (#deal-end) so it never covers the footer.
  const [cardInView, setCardInView] = useState(true);
  const [pastEnd, setPastEnd] = useState(false);
  useEffect(() => {
    const card = cardRef.current;
    const end = document.getElementById("deal-end");
    if (!card || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === card) setCardInView(e.isIntersecting);
        else setPastEnd(e.isIntersecting || e.boundingClientRect.top < 0);
      }
    });
    io.observe(card);
    if (end) io.observe(end);
    return () => io.disconnect();
  }, []);
  const showBar = !preview && !cardInView && !pastEnd;

  // Small enough to sit beside Copy code on one line; a very long code on
  // a narrow phone still drops the button underneath rather than being cut.
  const size =
    !code || code.length <= 8
      ? "text-[1.375rem]"
      : code.length <= 11
        ? "text-[1.1875rem]"
        : code.length <= 15
          ? "text-[1.0625rem]"
          : "text-[0.9375rem]";

  return (
    <div ref={cardRef}>
      {!revealed ? (
        <>
          <button
            type="button"
            onClick={() => reveal("main")}
            className="flex min-h-12 w-full items-center justify-center rounded-lg bg-hp-purple px-5 text-base font-bold text-white transition hover:bg-hp-purple-dark active:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
          >
            Get deal code
          </button>
          <button
            type="button"
            onClick={() => {
              reveal("main");
              document.getElementById("contact")?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            }}
            className="mt-2 flex min-h-[44px] w-full items-center justify-center text-sm font-semibold text-hp-purple underline underline-offset-2 hover:text-hp-purple-dark"
          >
            Reveal code &amp; booking options
          </button>
          {code && (
            <noscript>
              <p className="mt-2 text-center text-sm">
                Your deal code: <strong className="font-mono">{code}</strong>
              </p>
            </noscript>
          )}
        </>
      ) : (
        <div aria-live="polite">
          <p className="text-sm font-semibold text-hp-ink">Your deal code</p>
          {code ? (
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg bg-hp-code py-2.5 pl-4 pr-2.5">
              <span ref={codeRef} className={`select-all whitespace-nowrap font-display font-semibold leading-tight tracking-[0.03em] text-hp-purple ${size}`}>
                {code}
              </span>
              <button
                type="button"
                onClick={copy}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-hp-purple bg-white px-3.5 text-sm font-bold text-hp-purple transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
              >
                <CopyIcon className="h-4 w-4" />
                {copied === "Copied" ? "Copied" : "Copy code"}
              </button>
            </div>
          ) : (
            <p className="mt-1.5 rounded-lg bg-hp-code px-4 py-3 text-sm font-semibold text-hp-ink">Mention this MegaDeal offer</p>
          )}
          <p role="status" className="sr-only">
            {copied === "Copied" ? "Code copied" : ""}
          </p>
          {copied === "failed" && <p className="mt-1 text-xs text-hp-muted">Couldn&apos;t copy. The code is selected: copy it from your keyboard or menu.</p>}
          <p className="mt-2 text-sm text-hp-muted">
            {instruction}
            {note && ` ${note}`}
          </p>
          {ownWords && (
            <p className="mt-1.5 whitespace-pre-line text-sm text-hp-ink">
              <span className="font-semibold">{businessName ? `From ${businessName}: ` : "From the business: "}</span>
              {ownWords}
            </p>
          )}
        </div>
      )}

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-hp-border bg-white/95 px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden ${
          showBar ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        // Out of view, it's also out of reach of keyboards and screen readers.
        inert={!showBar}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          {!revealed ? (
            <>
              <p className="min-w-0 leading-tight">
                <span className="font-display text-2xl font-semibold text-hp-purple">{price.now}</span>
                {price.was && (
                  <span className="ml-1.5 text-sm text-hp-muted line-through">
                    <span className="sr-only">Usual price </span>
                    {price.was}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => reveal("sticky")}
                className="ml-auto flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-hp-purple px-5 text-[0.9375rem] font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
              >
                Get deal code
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 truncate font-display text-xl font-semibold tracking-[0.03em] text-hp-purple">{code ?? "MegaDeal offer"}</span>
              <span className="ml-auto shrink-0 text-sm font-semibold text-green-700">Code saved</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
