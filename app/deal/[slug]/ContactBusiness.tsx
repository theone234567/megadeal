"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContactKind, ContactOption } from "@/lib/booking";
import type { DealAction } from "@/lib/dealEvents";
import { ChevronRightIcon, CloseIcon, CopyIcon, GlobeIcon, MailIcon, MapPinIcon, PhoneIcon } from "@/components/icons";

const ACTION_FOR: Record<ContactKind, DealAction> = {
  phone: "call",
  email: "email",
  website: "website",
  directions: "directions",
};

function OptionIcon({ kind }: { kind: ContactKind }) {
  const cls = "h-[18px] w-[18px]";
  if (kind === "phone") return <PhoneIcon className={cls} />;
  if (kind === "email") return <MailIcon className={cls} />;
  if (kind === "website") return <GlobeIcon className={cls} />;
  return <MapPinIcon className={cls} />;
}

/**
 * The deal code with a Copy button. Copying only copies: it never books,
 * reserves, redeems or goes anywhere.
 */
function CodeBox({ code, onCopy, compact = false }: { code: string; onCopy: () => void; compact?: boolean }) {
  const [note, setNote] = useState("");
  const codeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 3000);
    return () => clearTimeout(t);
  }, [note]);

  async function copy() {
    onCopy();
    try {
      await navigator.clipboard.writeText(code);
      setNote("Copied");
    } catch {
      // No clipboard access: select the code so it can be copied by hand.
      const el = codeRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setNote("Select the code to copy it");
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-600">Your deal code</p>
      <div
        className={`mt-1 flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 ${
          compact ? "px-3 py-2" : "px-3.5 py-2.5"
        }`}
      >
        <span
          ref={codeRef}
          className="min-w-0 select-all break-all font-mono text-lg font-bold tracking-[0.06em] text-slate-900"
        >
          {code}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-bold text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:ring-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <CopyIcon className="h-4 w-4" />
          {note === "Copied" ? "Copied" : "Copy code"}
        </button>
      </div>
      <p aria-live="polite" className="mt-1 min-h-[1rem] text-xs font-semibold text-brand-700">
        {note}
      </p>
    </div>
  );
}

/**
 * The deal's one action: "Contact business", opening a pop-up with every
 * way to reach the business that actually exists (lib/booking.ts
 * contactOptions), the code, and the booking instruction under the button.
 *
 * A native <dialog> opened with showModal(): focus moves in, Esc closes,
 * the page behind is inert, and focus returns to the button on close.
 *
 * In a preview nothing is tracked and the contact rows aren't links.
 */
export default function ContactBusiness({
  businessName,
  code,
  options,
  instruction,
  profileHref,
  preview,
  onAction,
  onOpen,
  price,
  websiteHref = null,
}: {
  businessName: string | null;
  code: string | null;
  options: ContactOption[];
  instruction: { heading: string; text: string };
  /** The public business profile, the fallback when there's no contact
   *  route at all. Null when there isn't one (or in a preview). */
  profileHref: string | null;
  preview: boolean;
  /** Counts an action (lib/useDealActionTracker.ts). */
  onAction: (action: DealAction) => void;
  /** Counts opening the pop-up as the visit's interest. */
  onOpen: () => void;
  /** For the bar at the bottom of a phone's screen (below). */
  price?: { now: string; was: string | null; percentOff: number | null };
  /** Where the business's own code is entered online (lib/booking.ts
   *  websiteCodeHref). Then the main action is one tap: copy the code and
   *  open that page; the other ways to contact move into the pop-up. */
  websiteHref?: string | null;
}) {
  const [open, setOpen] = useState(false);
  // The pop-up's rows (with the business's email address) are only built
  // once someone opens it, so they aren't in the page's HTML.
  const [opened, setOpened] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const barButtonRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const otherWaysRef = useRef<HTMLButtonElement>(null);
  const online = Boolean(websiteHref) && !preview;
  // Which button opened the pop-up, for focus to go back to.
  const openedFrom = useRef<HTMLButtonElement | null>(null);
  const business = businessName || "the business";

  // On a phone, a bar with the price and "Contact business" stays at the
  // bottom of the screen whenever the panel's own button is out of view
  // (not yet reached, or scrolled past), and gives way at the end of the
  // deal (#deal-end) so it never sits over the lists below or the footer.
  const [buttonInView, setButtonInView] = useState(true);
  const [endInView, setEndInView] = useState(false);
  useEffect(() => {
    const button = buttonRef.current ?? linkRef.current;
    const end = document.getElementById("deal-end");
    if (!button || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === button) setButtonInView(e.isIntersecting);
        else setEndInView(e.isIntersecting || e.boundingClientRect.top < 0);
      }
    });
    io.observe(button);
    if (end) io.observe(end);
    return () => io.disconnect();
  }, []);
  const showBar = Boolean(price) && (options.length > 0 || online) && !buttonInView && !endInView;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function close() {
    setOpen(false);
    (openedFrom.current ?? buttonRef.current)?.focus();
  }

  /** Copy the code and let the link open the business's page in a new
   *  tab. The copy is best effort: the code is on screen either way. */
  function goOnline() {
    onAction("website");
    if (code) {
      onAction("copy");
      navigator.clipboard?.writeText(code).catch(() => {});
    }
  }

  function openFrom(button: HTMLButtonElement | null) {
    openedFrom.current = button;
    onOpen();
    setOpened(true);
    setOpen(true);
  }

  const buttonClass =
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-base font-extrabold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2";

  return (
    <div>
      {code && <CodeBox code={code} onCopy={() => onAction("copy")} />}

      <div className={code ? "mt-2" : ""}>
        {online ? (
          <>
            <a
              ref={linkRef}
              href={websiteHref!}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              onClick={goOnline}
              className={buttonClass}
            >
              {code ? "Copy code & go to website" : "Go to website"} <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            {options.length > 0 && (
              <button
                ref={otherWaysRef}
                type="button"
                aria-haspopup="dialog"
                onClick={() => openFrom(otherWaysRef.current)}
                className="mt-2 w-full rounded-full py-2 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                Other ways to contact {business}
              </button>
            )}
          </>
        ) : options.length > 0 ? (
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => openFrom(buttonRef.current)}
            className={buttonClass}
          >
            Contact business <span aria-hidden="true">→</span>
          </button>
        ) : profileHref ? (
          <Link href={profileHref} prefetch={false} className={buttonClass}>
            View business profile <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
            Contact details are currently unavailable.
          </p>
        )}
      </div>

      <p className="mt-3 text-sm font-bold text-slate-900">{instruction.heading}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{instruction.text}</p>

      {price && (options.length > 0 || online) && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden ${
            showBar ? "translate-y-0" : "pointer-events-none translate-y-full"
          }`}
          // Out of view, it's also out of reach of keyboards and screen readers.
          inert={!showBar}
        >
          <div className="mx-auto flex max-w-[1040px] items-center gap-3">
            <p className="min-w-0 leading-tight">
              <span className="font-display text-xl font-semibold text-brand-700">{price.now}</span>
              {price.was && (
                <span className="ml-1.5 text-sm text-slate-500 line-through">
                  <span className="sr-only">Usual price </span>
                  {price.was}
                </span>
              )}
              {price.percentOff !== null && <span className="block text-xs font-bold text-brand-700">{price.percentOff}% off</span>}
            </p>
            {online ? (
              <a
                href={websiteHref!}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                onClick={goOnline}
                className="ml-auto flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-600 px-5 text-[0.9375rem] font-extrabold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                {code ? "Copy code & go" : "Go to website"} <span aria-hidden="true">↗</span>
                <span className="sr-only"> to the business&apos;s website (opens in a new tab)</span>
              </a>
            ) : (
              <button
                ref={barButtonRef}
                type="button"
                aria-haspopup="dialog"
                onClick={() => openFrom(barButtonRef.current)}
                className="ml-auto flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-600 px-5 text-[0.9375rem] font-extrabold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                Contact business <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>
      )}

      {options.length > 0 && (
        <dialog
          ref={dialogRef}
          aria-labelledby="contact-business-title"
          onCancel={(e) => {
            // Esc: close through state so focus goes back to the button.
            e.preventDefault();
            close();
          }}
          onClick={(e) => {
            // A click on the backdrop lands on the <dialog> itself.
            if (e.target === e.currentTarget) close();
          }}
          className="m-auto w-[min(calc(100vw-2rem),440px)] rounded-[20px] p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
        >
          {opened && (
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 id="contact-business-title" className="font-display text-xl font-semibold leading-tight">
                  Contact {business}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              {/* The same instruction as under the button, so the two never
                  disagree (e.g. "enter it at checkout on their website"). */}
              <p className="mt-1 text-sm text-slate-600">{instruction.text}</p>

              {code && (
                <div className="mt-4">
                  <CodeBox code={code} onCopy={() => onAction("copy")} compact />
                </div>
              )}

              <ul className={`divide-y divide-slate-100 border-y border-slate-100 ${code ? "mt-1" : "mt-4"}`}>
                {options.map((o) => {
                  const inner = (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                        <OptionIcon kind={o.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-500">{o.label}</span>
                        <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{o.detail}</span>
                        {o.note && <span className="block text-xs text-slate-600">{o.note}</span>}
                      </span>
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                    </>
                  );
                  return (
                    <li key={o.kind}>
                      {preview ? (
                        <div className="flex items-center gap-3 py-3 opacity-80">{inner}</div>
                      ) : (
                        <a
                          href={o.href}
                          onClick={() => onAction(ACTION_FOR[o.kind])}
                          {...(o.external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
                          className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                        >
                          {inner}
                          {o.external && <span className="sr-only"> (opens in a new tab)</span>}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {preview
                  ? "Contact links are turned off in this preview."
                  : "Your code doesn't confirm a booking. The business confirms availability with you."}
              </p>
            </div>
          )}
        </dialog>
      )}
    </div>
  );
}
