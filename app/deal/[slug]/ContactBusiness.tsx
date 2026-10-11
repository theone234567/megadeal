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
}) {
  const [open, setOpen] = useState(false);
  // The pop-up's rows (with the business's email address) are only built
  // once someone opens it, so they aren't in the page's HTML.
  const [opened, setOpened] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const business = businessName || "the business";

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  const buttonClass =
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-base font-extrabold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2";

  return (
    <div>
      {code && <CodeBox code={code} onCopy={() => onAction("copy")} />}

      <div className={code ? "mt-2" : ""}>
        {options.length > 0 ? (
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              onOpen();
              setOpened(true);
              setOpen(true);
            }}
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
              <p className="mt-1 text-sm text-slate-600">
                {code ? "Quote your deal code when contacting the business." : "Mention this MegaDeal offer when contacting the business."}
              </p>

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
