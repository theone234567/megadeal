"use client";

import { useEffect, useRef, useState } from "react";
import type { Deal } from "@/lib/types";
import { formatOfferEndDate } from "@/lib/format";
import {
  emailLink,
  getThisDealCopy,
  termsSayWalkInsWelcome,
  termsSayWhileStocksLast,
  type BookingAction,
  type BookingPlan,
} from "@/lib/booking";
import type { DealAction } from "@/lib/dealEvents";
import { GlobeIcon, MailIcon, MapPinIcon, PhoneIcon, TicketIcon } from "@/components/icons";

/**
 * "Get this deal": the deal page's panel for using an offer. The code is
 * shown straight away with a Copy button (no reveal step), then how to use
 * it in one accurate sentence, ONE main action, and the business's other
 * contact routes as small links.
 *
 * Copying a code only copies it: it never books, reserves, redeems or
 * navigates anywhere. The code is one per offer, not proof of payment.
 *
 * In a preview (the business's own draft, or admin), the code can still
 * be copied but every contact action is disabled and nothing is tracked.
 */
export default function GetDealPanel({
  deal,
  plan,
  websiteHref,
  directionsUrl,
  restrictions,
  preview,
  onAction,
}: {
  deal: Deal;
  /** bookingPlan(...) from lib/booking.ts: requirement and booking actions. */
  plan: BookingPlan;
  websiteHref: string | null;
  directionsUrl: string | null;
  /** Key conditions, shown in the code view. */
  restrictions: string[];
  preview: boolean;
  /** Counts an action (lib/useDealActionTracker.ts, shared with the rest
   *  of the page so each is counted once per visit). */
  onAction: (action: DealAction) => void;
}) {
  const code = deal.dealCode;
  const business = deal.businessName || "the business";
  const [copyNote, setCopyNote] = useState("");
  const [showCode, setShowCode] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const showButtonRef = useRef<HTMLButtonElement>(null);
  const codeRef = useRef<HTMLSpanElement>(null);
  // Interest in the offer, never a sale or a booking.
  const track = onAction;
  const actionFor = (kind: BookingAction["kind"]): DealAction =>
    kind === "call" ? "call" : kind === "email" ? "email" : "website";

  const booking = plan.requirement === "required" || plan.requirement === "recommended";
  const primaryAction: BookingAction | null = plan.requirement === "not_required" ? null : plan.actions[0] ?? null;
  const copy = getThisDealCopy(plan.requirement, primaryAction?.kind ?? null, code, {
    walkIns: termsSayWalkInsWelcome(deal.terms),
    limitedStock: termsSayWhileStocksLast(deal.terms),
  });

  // An email enquiry carries the offer and its code, so the business knows
  // what's being asked for.
  const enquiryHref = emailLink(
    deal.businessBookingEmail,
    `MegaDeal offer: ${deal.name}`,
    `Hi, I'd like to ${booking ? "book" : "ask about"} your MegaDeal offer "${deal.name}"${
      code ? ` (code ${code})` : ""
    }. Please confirm availability and the offer. Thanks!`,
  );
  const withEnquiryBody = (a: BookingAction): BookingAction =>
    a.kind === "email" && enquiryHref
      ? { ...a, href: enquiryHref, label: booking ? "Email a booking enquiry" : "Email the business" }
      : a;
  const main = primaryAction ? withEnquiryBody(primaryAction) : null;

  // The smaller links: every other way to reach the business, labelled for
  // what it does here (a phone line that takes bookings for a booking offer
  // reads "Call to book"; otherwise just "Call").
  const others: { key: string; label: string; href: string; external: boolean; icon: "phone" | "mail" | "web" | "map" }[] = [];
  const shown = new Set(main ? [main.kind] : []);
  for (const a of plan.requirement === "not_required" ? plan.aboutActions : plan.actions) {
    if (shown.has(a.kind)) continue;
    shown.add(a.kind);
    const b = withEnquiryBody(a);
    if (b.kind === "book_online") continue; // never a "book" link on a no-booking offer
    others.push({
      key: b.kind,
      label: b.kind === "call" ? (booking ? "Call to book" : "Call") : "Email",
      href: b.href,
      external: b.external,
      icon: b.kind === "call" ? "phone" : "mail",
    });
  }
  if (websiteHref && websiteHref !== main?.href) {
    others.push({ key: "web", label: "Website", href: websiteHref, external: true, icon: "web" });
  }
  if (directionsUrl) {
    others.push({ key: "map", label: "Directions", href: directionsUrl, external: true, icon: "map" });
  }

  useEffect(() => {
    if (showCode) {
      const d = dialogRef.current;
      if (d && !d.open) d.showModal();
      closeRef.current?.focus();
    }
  }, [showCode]);

  useEffect(() => {
    if (!copyNote) return;
    const t = setTimeout(() => setCopyNote(""), 4000);
    return () => clearTimeout(t);
  }, [copyNote]);

  async function copyCode() {
    if (!code) return;
    track("copy");
    try {
      await navigator.clipboard.writeText(code);
      setCopyNote("Copied");
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
      setCopyNote("Select the code to copy it.");
    }
  }

  function closeDialog() {
    dialogRef.current?.close();
    setShowCode(false);
    showButtonRef.current?.focus();
  }

  const primaryClass =
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-base font-extrabold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section aria-labelledby="get-this-deal" className="mt-5 border-t border-slate-200/80 pt-5">
      <h2 id="get-this-deal" className="font-display text-xl font-semibold text-slate-900">
        Get this deal
      </h2>

      {code && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-sky-50 px-3.5 py-3 sm:gap-3 sm:px-4 ring-1 ring-inset ring-sky-100">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-600">Your deal code</p>
            <span
              ref={codeRef}
              className="block select-all break-words font-sans text-lg font-extrabold tracking-[0.05em] text-slate-900 sm:text-xl"
            >
              {code}
            </span>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold sm:px-4 text-brand-700 shadow-sm transition hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <TicketIcon className="h-4 w-4" />
            Copy code
          </button>
        </div>
      )}
      <p aria-live="polite" className="mt-1 min-h-[1.25rem] text-xs font-semibold text-brand-700">
        {copyNote}
      </p>

      <h3 className="mt-1 text-sm font-extrabold text-slate-900">{copy.heading}</h3>
      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{copy.instruction}</p>

      <div className="mt-4">
        {main ? (
          preview ? (
            <button type="button" disabled className={primaryClass}>
              <ActionIcon kind={main.kind} />
              {main.label}
            </button>
          ) : (
            <a
              href={main.href}
              onClick={() => track(actionFor(main.kind))}
              {...(main.external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
              className={primaryClass}
            >
              <ActionIcon kind={main.kind} />
              {main.label}
              {main.external && (
                <>
                  <span aria-hidden>↗</span>
                  <span className="sr-only"> (opens {business}&apos;s site)</span>
                </>
              )}
            </a>
          )
        ) : (
          // "Show deal code" only where showing it is the whole step: a
          // no-booking offer. A booking offer with no contact route gets no
          // button rather than one that contradicts "book with the business".
          code &&
          plan.requirement === "not_required" && (
            <button
              ref={showButtonRef}
              type="button"
              disabled={preview}
              onClick={() => {
                track("copy");
                setShowCode(true);
              }}
              className={primaryClass}
            >
              Show deal code
            </button>
          )
        )}
        {main?.kind === "call" && plan.phone && (
          <p className="mt-1.5 text-center text-xs text-slate-600">{plan.phone.display}</p>
        )}
      </div>

      {others.length > 0 &&
        (preview ? (
          <p className="mt-3 text-center text-xs text-slate-600">Contact links are turned off in this preview.</p>
        ) : (
          <nav aria-label={`Contact ${business}`} className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {others.map((o) => (
              <a
                key={o.key}
                href={o.href}
                onClick={() =>
                  track(o.icon === "phone" ? "call" : o.icon === "mail" ? "email" : o.icon === "map" ? "directions" : "website")
                }
                {...(o.external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
                className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-brand-700 underline-offset-2 hover:underline"
              >
                {o.icon === "phone" && <PhoneIcon className="h-4 w-4" />}
                {o.icon === "mail" && <MailIcon className="h-4 w-4" />}
                {o.icon === "web" && <GlobeIcon className="h-4 w-4" />}
                {o.icon === "map" && <MapPinIcon className="h-4 w-4" />}
                {o.label}
                {o.external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            ))}
          </nav>
        ))}

      {copy.availability && (
        <p className="mt-4 rounded-[12px] bg-sky-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-700 ring-1 ring-inset ring-sky-100">
          {copy.availability}
        </p>
      )}

      {showCode && code && (
        <dialog
          ref={dialogRef}
          aria-labelledby="deal-code-dialog-title"
          onCancel={(e) => {
            e.preventDefault();
            closeDialog();
          }}
          className="w-[min(92vw,420px)] rounded-[20px] p-0 backdrop:bg-slate-900/50"
        >
          <div className="p-6 text-center">
            <p className="text-sm font-bold text-slate-900">{business}</p>
            <h2 id="deal-code-dialog-title" className="mt-1 text-base text-slate-600">
              {deal.name}
            </h2>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Deal code</p>
            {/* One line, sized to fit: up to 20 characters at 320px wide. */}
            <p className="mt-1 select-all whitespace-nowrap font-sans text-[clamp(1.125rem,7vw,2.25rem)] font-extrabold tracking-[0.04em] text-brand-700">
              {code}
            </p>
            {deal.expiresAt && (
              <p className="mt-4 text-sm text-slate-700">Offer ends {formatOfferEndDate(deal.expiresAt)}</p>
            )}
            {restrictions.length > 0 && (
              <p className="mt-1 text-sm text-slate-600">{restrictions.join(" · ")}</p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              This code is not proof of payment or a confirmed booking.
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={closeDialog}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-bold text-slate-700 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              Close
            </button>
          </div>
        </dialog>
      )}
    </section>
  );
}

function ActionIcon({ kind }: { kind: BookingAction["kind"] }) {
  if (kind === "call") return <PhoneIcon className="h-4 w-4" />;
  if (kind === "email") return <MailIcon className="h-4 w-4" />;
  return <GlobeIcon className="h-4 w-4" />;
}
