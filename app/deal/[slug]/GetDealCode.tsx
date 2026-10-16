"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DealAction } from "@/lib/dealEvents";
import type { ContactAction, DealContact } from "@/lib/dealContact";
import { formatBusinessHoursLines, hoursToday, type BusinessHoursData } from "@/lib/businessHours";
import { ChevronDownIcon, CloseIcon, CopyIcon } from "@/components/icons";

/**
 * "Get deal code": the deal page's one action. It opens a panel (a centred
 * dialog on a computer, a sheet from the bottom on a phone) with the code,
 * how to use it, and the ways to contact the business that it actually
 * supplied (lib/dealContact.ts). The code is the deal's one fixed code,
 * the same for everyone and every time the panel opens. Nothing is
 * copied or opened automatically.
 *
 * A native <dialog> with showModal(): focus moves in and stays there, Esc
 * closes, and focus goes back to whichever button opened it. The page
 * behind doesn't scroll while it's open.
 *
 * On a phone a bar with the price and the same button appears at the
 * bottom of the screen once the panel's own button is scrolled out of
 * view, and gives way at the end of the deal (#deal-end).
 */
export default function GetDealCode({
  code,
  contact,
  businessName,
  dealName,
  price,
  hours,
  profileHref,
  preview,
  onAction,
  onOpen,
  onReveal,
}: {
  code: string | null;
  contact: DealContact;
  businessName: string | null;
  dealName: string;
  price: { now: string; was: string | null; percentOff: number | null };
  hours: BusinessHoursData | null;
  profileHref: string | null;
  /** A merchant's or admin's preview: nothing counted, no link goes anywhere. */
  preview: boolean;
  onAction: (action: DealAction) => void;
  /** The button was pressed ("main" in the price panel, "sticky" in the
   *  phone's bottom bar). */
  onOpen: (source: "main" | "sticky") => void;
  /** The code is on screen. */
  onReveal: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Built on first open, so the code isn't in the page's HTML until asked for.
  const [opened, setOpened] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLButtonElement>(null);
  const openedFrom = useRef<HTMLButtonElement | null>(null);
  const revealed = useRef(false);

  const [mainInView, setMainInView] = useState(true);
  const [endInView, setEndInView] = useState(false);
  useEffect(() => {
    const button = mainRef.current;
    const end = document.getElementById("deal-end");
    if (!button || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === button) setMainInView(e.isIntersecting);
        else setEndInView(e.isIntersecting || e.boundingClientRect.top < 0);
      }
    });
    io.observe(button);
    if (end) io.observe(end);
    return () => io.disconnect();
  }, []);
  const showBar = !preview && !mainInView && !endInView && !open;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("overflow");
    },
    [],
  );

  // Counted once the code is actually showing, once per page visit.
  useEffect(() => {
    if (open && opened && !revealed.current) {
      revealed.current = true;
      onReveal();
    }
  }, [open, opened, onReveal]);

  function openFrom(button: HTMLButtonElement | null, source: "main" | "sticky") {
    openedFrom.current = button;
    onOpen(source);
    setOpened(true);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  const mainClass =
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-base font-bold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2";

  return (
    <div>
      <button ref={mainRef} type="button" aria-haspopup="dialog" onClick={() => openFrom(mainRef.current, "main")} className={mainClass}>
        Get deal code <span aria-hidden="true">→</span>
      </button>
      {/* Without JavaScript the panel can't open, so the code is shown. */}
      {code && (
        <noscript>
          <p className="mt-3 text-center text-sm">
            Your deal code: <strong className="font-mono">{code}</strong>
          </p>
        </noscript>
      )}

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden ${
          showBar ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        // Out of view, it's also out of reach of keyboards and screen readers.
        inert={!showBar}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          <p className="min-w-0 leading-tight">
            <span className="font-display text-2xl font-semibold text-brand-700">{price.now}</span>
            {price.was && (
              <span className="ml-1.5 text-sm text-slate-500 line-through">
                <span className="sr-only">Usual price </span>
                {price.was}
              </span>
            )}
          </p>
          <button
            ref={barRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => openFrom(barRef.current, "sticky")}
            className="ml-auto flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-5 text-[0.9375rem] font-bold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            Get deal code <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="deal-code-title"
        onClose={() => {
          setOpen(false);
          document.documentElement.style.removeProperty("overflow");
          (openedFrom.current ?? mainRef.current)?.focus();
        }}
        onClick={(e) => {
          // A tap on the dimmed backdrop lands on the <dialog> itself.
          if (e.target === e.currentTarget) close();
        }}
        className="m-0 mt-auto max-h-[calc(100dvh-1rem)] w-full max-w-none overflow-hidden rounded-t-3xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 open:flex open:flex-col sm:m-auto sm:max-h-[min(46rem,calc(100dvh-2rem))] sm:w-[min(calc(100vw-2rem),460px)] sm:rounded-3xl"
      >
        {opened && (
          <Panel
            code={code}
            contact={contact}
            businessName={businessName}
            dealName={dealName}
            price={price}
            hours={hours}
            profileHref={profileHref}
            preview={preview}
            onAction={onAction}
            onClose={close}
          />
        )}
      </dialog>
    </div>
  );
}

function Panel({
  code,
  contact,
  businessName,
  dealName,
  price,
  hours,
  profileHref,
  preview,
  onAction,
  onClose,
}: {
  code: string | null;
  contact: DealContact;
  businessName: string | null;
  dealName: string;
  price: { now: string; was: string | null };
  hours: BusinessHoursData | null;
  profileHref: string | null;
  preview: boolean;
  onAction: (action: DealAction) => void;
  onClose: () => void;
}) {
  const [allHours, setAllHours] = useState(false);
  const today = hours ? hoursToday(hours) : null;
  const hourLines = hours && allHours ? formatBusinessHoursLines(hours) : [];

  return (
    <>
      {/* A grab handle, as phones draw a sheet; purely visual. */}
      <span aria-hidden="true" className="mx-auto mt-2.5 block h-1 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" />
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-1 pt-3 sm:px-7 sm:pt-6">
        <h2 id="deal-code-title" className="font-display text-2xl font-semibold leading-tight">
          Your deal code
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Scrolls on a short screen or at a large text size, keeping the
          heading and close button in view. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-7 sm:pb-7">
        {businessName && <p className="font-semibold text-slate-900">{businessName}</p>}
        <p className="text-[0.9375rem] text-slate-700">{dealName}</p>
        <p className="mt-0.5 font-display text-xl font-semibold text-brand-700">
          {price.now}
          {price.was && (
            <span className="ml-2 font-sans text-sm font-normal text-slate-500 line-through">
              <span className="sr-only">Usual price </span>
              {price.was}
            </span>
          )}
        </p>

        {code ? <CodeBox code={code} onCopied={() => onAction("copy")} /> : null}

        <p className="mt-2 text-center text-sm text-slate-700">{contact.instruction}</p>
        {contact.requirementLine && <p className="mt-3 text-center text-sm font-semibold text-slate-900">{contact.requirementLine}</p>}

        {(contact.primary || contact.secondary) && (
          <div className="mt-2.5 grid gap-2">
            {contact.primary && <ActionLink a={contact.primary} variant="primary" preview={preview} onAction={onAction} />}
            {contact.secondary && <ActionLink a={contact.secondary} variant="secondary" preview={preview} onAction={onAction} />}
          </div>
        )}

        {today && (
          <div className="mt-3 text-center text-sm">
            <p className="text-slate-900">
              <span className="font-semibold">Hours today:</span> {today.label}
              {today.note ? ` (${today.note})` : ""}
            </p>
            <button
              type="button"
              aria-expanded={allHours}
              aria-controls="deal-code-hours"
              onClick={() => setAllHours((v) => !v)}
              className="mt-0.5 inline-flex min-h-[44px] items-center gap-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              {allHours ? "Hide hours" : "View all hours"}
              <ChevronDownIcon className={`h-4 w-4 transition ${allHours ? "rotate-180" : ""}`} />
            </button>
            {allHours && (
              <ul id="deal-code-hours" className="mx-auto mt-1 max-w-[18rem] text-left tabular-nums text-slate-700">
                {hourLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(contact.links.length > 0 || profileHref) && (
          <div className="mt-3 border-t border-slate-200 pt-3 text-center text-sm">
            {contact.links.length > 0 && (
              <ul className="flex flex-wrap items-center justify-center gap-x-5">
                {contact.links.map((a) => (
                  <li key={a.method}>
                    <ActionLink a={a} variant="link" preview={preview} onAction={onAction} />
                  </li>
                ))}
              </ul>
            )}
            {profileHref && (
              <Link
                href={profileHref}
                prefetch={false}
                className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                View business profile <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        )}

        <p className="mt-3 text-center text-xs leading-relaxed text-slate-600">{contact.footer}</p>
        {preview && <p className="mt-1 text-center text-xs text-slate-500">Preview · contact links are turned off</p>}
      </div>
    </>
  );
}

function ActionLink({
  a,
  variant,
  preview,
  onAction,
}: {
  a: ContactAction;
  variant: "primary" | "secondary" | "link";
  preview: boolean;
  onAction: (action: DealAction) => void;
}) {
  const cls =
    variant === "primary"
      ? "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-base font-bold text-white transition hover:bg-brand-700"
      : variant === "secondary"
        ? "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-brand-600 bg-white px-5 text-base font-bold text-brand-700 transition hover:bg-brand-50"
        : "inline-flex min-h-[44px] items-center gap-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800";
  const content = (
    <>
      {a.label}
      {a.external && <span aria-hidden="true">↗</span>}
    </>
  );
  if (preview) {
    return (
      <span className={`${cls} cursor-default opacity-80`} aria-disabled="true">
        {content}
      </span>
    );
  }
  return (
    <a
      href={a.href}
      // Counted without holding up the visit: the ping is sent with
      // keepalive (lib/trackDeal.ts).
      onClick={() => onAction(a.action)}
      {...(a.external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
      aria-label={a.method === "phone" ? `Call ${a.detail}` : undefined}
      className={`${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2`}
    >
      {content}
      {a.external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

/**
 * The code, large, with Copy. Copying only copies; it's counted only when
 * the browser confirms it worked. If it can't, the code is selected for
 * copying by hand.
 */
function CodeBox({ code, onCopied }: { code: string; onCopied: () => void }) {
  const [note, setNote] = useState("");
  const codeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (note !== "Copied") return;
    const t = setTimeout(() => setNote(""), 2500);
    return () => clearTimeout(t);
  }, [note]);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(code);
      setNote("Copied");
      onCopied();
    } catch {
      const el = codeRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setNote("Couldn't copy. The code is selected: copy it from your keyboard or menu.");
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-50 py-3 pl-4 pr-3 sm:pl-5">
        <span
          ref={codeRef}
          // Smaller for a longer code, so it stays on one line; codes are
          // never cut short (up to 20 characters, lib/dealCode.ts).
          className={`min-w-0 select-all whitespace-nowrap font-display font-semibold leading-none tracking-[0.03em] text-brand-700 [overflow-wrap:anywhere] ${
            code.length <= 7
              ? "text-[2rem] sm:text-[2.25rem]"
              : code.length <= 10
                ? "text-[1.625rem] sm:text-[1.875rem]"
                : code.length <= 14
                  ? "text-[1.25rem] sm:text-[1.5rem]"
                  : "text-[1.0625rem] sm:text-[1.25rem]"
          }`}
        >
          {code}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-base font-bold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          <CopyIcon className="h-4 w-4" />
          {note === "Copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p role="status" className="mt-1 min-h-[1.25rem] text-center text-xs font-semibold text-brand-700">
        {note}
      </p>
    </div>
  );
}
