"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CloseIcon, GlobeIcon, MailIcon, PhoneIcon, CalendarIcon } from "@/components/icons";
import { formatBusinessHoursLines, hoursToday, parseBusinessHours } from "@/lib/businessHours";

export const OPEN_ADDRESS_HOURS = "megadeal:address-hours";

export interface ContactBookingProps {
  /** "18 Bay Road, Whangaparāoa", or the suburb and city for a business
   *  that keeps its street private. Null when nothing's known. */
  addressLine: string | null;
  /** The business's opening hours as stored. "Open today 8am–8pm" and
   *  the week are worked out in the browser, in New Zealand time, so a
   *  cached page never shows yesterday's. */
  hours: string | null;
  phone: { display: string; href: string } | null;
  /** Built only when "Show email" is pressed (lib/hiddenEmail.ts keeps
   *  the address out of the page's HTML). */
  email: { reveal: () => { address: string; href: string } | null } | null;
  website: { display: string; href: string } | null;
  /** A booking page that isn't the website. A plain link, not a second
   *  purple button: the price card has the one action. */
  booking: { label: string; href: string } | null;
  /** For the Address & hours dialog. */
  fullAddress: string | null;
  addressNotes: string[];
  mapsUrl: string | null;
  profileHref: string | null;
  preview: boolean;
  onContact: (method: "phone" | "email" | "website" | "booking" | "directions") => void;
}

/**
 * "Contact & booking" on the deal page: where the business is and whether
 * it's open today, on one line (the only place hours show on the page),
 * then a cell each for the ways to reach it that it actually gave. The
 * email address is shown only when asked for. The full address and the
 * week's hours are in the Address & hours dialog, opened from here or from
 * "About the business".
 */
export default function ContactBooking(p: ContactBookingProps) {
  const [email, setEmail] = useState<{ address: string; href: string } | null>(null);
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const data = parseBusinessHours(p.hours);
    if (!data) return;
    const update = () => {
      const t = hoursToday(data);
      setToday(t ? (t.closed ? "Closed today" : `Open today ${t.label}`) + (t.note ? ` (${t.note})` : "") : null);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [p.hours]);
  const cells = [p.phone, p.email, p.website, p.booking].filter(Boolean).length;
  const cellClass = "flex min-h-[5.25rem] flex-col justify-center rounded-xl border border-hp-border bg-white px-4 py-3";
  const label = "text-sm text-hp-muted";
  const value =
    "mt-0.5 inline-flex min-h-[32px] max-w-full items-center gap-1.5 truncate text-base font-semibold text-hp-purple underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple";

  const openDialog = () => window.dispatchEvent(new Event(OPEN_ADDRESS_HOURS));
  const linkProps = (external: boolean) => (external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {});

  return (
    <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-24">
      <h2 id="contact-heading" className="text-lg font-bold text-hp-ink">
        Contact &amp; booking
      </h2>
      {(p.addressLine || today) && (
        <p className="mt-2 text-base text-hp-ink">
          {p.addressLine && (
            <button
              type="button"
              onClick={openDialog}
              aria-haspopup="dialog"
              className="text-left underline-offset-2 hover:text-hp-purple hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
            >
              {p.addressLine}
            </button>
          )}
          {p.addressLine && today && <span aria-hidden="true"> · </span>}
          {today && <span className="whitespace-nowrap text-hp-muted">{today}</span>}
        </p>
      )}

      {cells > 0 ? (
        <ul className={`mt-3 grid grid-cols-1 gap-3 ${cells === 2 ? "sm:grid-cols-2" : cells === 3 ? "sm:grid-cols-3" : cells >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : ""}`}>
          {p.phone && (
            <li className={cellClass}>
              <span className={label}>Phone</span>
              {p.preview ? (
                <span className={value}>{p.phone.display}</span>
              ) : (
                <a href={p.phone.href} onClick={() => p.onContact("phone")} className={value}>
                  <PhoneIcon className="h-4 w-4 shrink-0" />
                  {p.phone.display}
                </a>
              )}
            </li>
          )}
          {p.email && (
            <li className={cellClass}>
              <span className={label}>Email</span>
              {email ? (
                <a href={email.href} onClick={() => p.onContact("email")} className={value}>
                  <MailIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{email.address}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setEmail(p.email!.reveal())}
                  className={`${value} self-start`}
                >
                  <MailIcon className="h-4 w-4 shrink-0" />
                  Show email
                </button>
              )}
            </li>
          )}
          {p.website && (
            <li className={cellClass}>
              <span className={label}>Website</span>
              {p.preview ? (
                <span className={value}>{p.website.display}</span>
              ) : (
                <a href={p.website.href} {...linkProps(true)} onClick={() => p.onContact("website")} className={value}>
                  <GlobeIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{p.website.display}</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </li>
          )}
          {p.booking && (
            <li className={cellClass}>
              <span className={label}>Booking</span>
              {p.preview ? (
                <span className={value}>{p.booking.label}</span>
              ) : (
                <a href={p.booking.href} {...linkProps(true)} onClick={() => p.onContact("booking")} className={value}>
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{p.booking.label}</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-hp-border px-4 py-3 text-sm text-hp-muted">
          Contact details for this business aren&apos;t available yet.
          {p.profileHref && (
            <>
              {" "}
              <Link href={p.profileHref} prefetch={false} className="font-semibold text-hp-purple underline">
                See its profile
              </Link>
              .
            </>
          )}
        </p>
      )}

      <AddressHoursDialog {...p} />
    </section>
  );
}

/** The full address, the week's hours and a map link, in a dialog. */
function AddressHoursDialog(p: ContactBookingProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const [hourLines, setHourLines] = useState<string[]>([]);
  const hours = p.hours;
  useEffect(() => {
    const open = () => {
      opener.current = document.activeElement;
      const data = parseBusinessHours(hours);
      setHourLines(data ? formatBusinessHoursLines(data) : []);
      ref.current?.showModal();
    };
    window.addEventListener(OPEN_ADDRESS_HOURS, open);
    return () => window.removeEventListener(OPEN_ADDRESS_HOURS, open);
  }, [hours]);
  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby="address-hours-title"
      onClose={() => (opener.current as HTMLElement | null)?.focus?.()}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),440px)] overflow-y-auto rounded-xl bg-white p-0 text-hp-ink shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="address-hours-title" className="text-lg font-bold">
            Address &amp; hours
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-hp-muted hover:bg-hp-lavender hover:text-hp-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {(p.fullAddress || p.addressLine) && <p className="mt-2 text-base">{p.fullAddress || p.addressLine}</p>}
        {p.addressNotes.map((n) => (
          <p key={n} className="mt-1 text-sm text-hp-muted">
            {n}
          </p>
        ))}
        {hourLines.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-sm tabular-nums text-hp-ink">
            {hourLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        {p.mapsUrl && !p.preview && (
          <a
            href={p.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => p.onContact("directions")}
            className="mt-4 inline-flex min-h-[44px] items-center font-semibold text-hp-purple underline underline-offset-2 hover:text-hp-purple-dark"
          >
            Open in maps <span aria-hidden="true">&nbsp;↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </dialog>
  );
}
