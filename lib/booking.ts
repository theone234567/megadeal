import { isMemorableCode } from "./memorableCode";
import { splitTermsForDisplay, STANDARD_TERMS } from "./dealTerms";
import { safeWebHref } from "./socialLinks";
import { phoneE164 } from "./phoneNumber";

/**
 * Whether a customer has to book to use a particular deal, and which
 * booking/contact actions the deal page offers as a result.
 *
 * Stored per deal on the Deals row as `bookingRequirement`. Deals written
 * before the field existed read as "unknown": nothing is inferred from a
 * missing booking link or an unticked box, because the absence of
 * "Bookings essential" is not evidence that no booking is needed. The one
 * inference allowed is the affirmative one — a legacy deal whose terms
 * say "Bookings essential" is treated as booking required.
 */
export type BookingRequirement = "required" | "recommended" | "not_required" | "unknown";

/** The choices a merchant makes on the deal form. "unknown" is only ever
 *  read from old data, never offered. */
export const BOOKING_CHOICES: {
  value: Exclude<BookingRequirement, "unknown">;
  label: string;
  hint: string;
}[] = [
  {
    value: "required",
    label: "Booking required",
    hint: "Customers must book before they visit",
  },
  {
    value: "recommended",
    label: "Booking recommended",
    hint: "Booking is advised but not a condition",
  },
  {
    value: "not_required",
    label: "No booking needed",
    hint: "Customers can just turn up and show their code",
  },
];

export function parseBookingRequirement(value: unknown): BookingRequirement {
  return value === "required" || value === "recommended" || value === "not_required" ? value : "unknown";
}

/** A choice the deal form and create route accept (i.e. not "unknown"). */
export function isBookingChoice(value: unknown): value is Exclude<BookingRequirement, "unknown"> {
  return parseBookingRequirement(value) !== "unknown";
}

const termLabel = (id: string) => STANDARD_TERMS.find((t) => t.id === id)!.label.toLowerCase();
const BOOKINGS_ESSENTIAL = termLabel("bookings");
const WALK_INS_WELCOME = termLabel("walk-ins");
const WHILE_STOCKS_LAST = termLabel("while-stocks");

function termsInclude(terms: string | null | undefined, label: string): boolean {
  if (!terms) return false;
  return splitTermsForDisplay(terms).some((piece) => piece.toLowerCase() === label);
}

/** True when the rendered terms contain the standard "Bookings essential"
 *  condition (exact label, as written by the deal form). */
export function termsSayBookingsEssential(terms: string | null | undefined): boolean {
  return termsInclude(terms, BOOKINGS_ESSENTIAL);
}

/** The business accepts walk-ins for this offer (the form's "Walk-ins
 *  welcome" box). Only ever said by the business: "recommended" alone is
 *  not evidence that walk-ins are accepted. */
export function termsSayWalkInsWelcome(terms: string | null | undefined): boolean {
  return termsInclude(terms, WALK_INS_WELCOME);
}

/** Limited stock: the offer runs while stocks last. */
export function termsSayWhileStocksLast(terms: string | null | undefined): boolean {
  return termsInclude(terms, WHILE_STOCKS_LAST);
}

/** The requirement the public page acts on: the stored choice if there is
 *  one, otherwise "required" only when the terms affirmatively say so. */
export function effectiveBookingRequirement(
  stored: BookingRequirement,
  terms: string | null | undefined,
): BookingRequirement {
  if (stored !== "unknown") return stored;
  return termsSayBookingsEssential(terms) ? "required" : "unknown";
}

/**
 * The form/create-route conflict check: "No booking needed" alongside the
 * ticked "Bookings essential" condition contradicts itself. Returns the
 * message to show, or null. A merchant's own free-text conditions can't
 * be checked this way and are left for them to keep consistent.
 */
export function bookingConflict(requirement: unknown, terms: string | null | undefined): string | null {
  if (requirement === "not_required" && termsSayBookingsEssential(terms)) {
    return "You've chosen “No booking needed” but also ticked “Bookings essential”. Change one of them so they agree.";
  }
  if (termsSayWalkInsWelcome(terms) && (requirement === "required" || termsSayBookingsEssential(terms))) {
    return "“Walk-ins welcome” can't go with a deal that needs a booking. Untick it, or change the booking choice.";
  }
  return null;
}

export interface BookingContactInput {
  bookingUrl: string | null;
  phone: string | null;
  bookingEmail: string | null;
}

export interface Phone {
  display: string;
  href: string;
}

/** A tappable phone link, or null when it isn't a real phone number
 *  (lib/phoneNumber.ts): a live call button needs a callable number. The
 *  link dials the E.164 form; the number shows as the business typed it. */
export function phoneLink(phone: string | null | undefined): Phone | null {
  const display = (phone ?? "").trim();
  const e164 = phoneE164(display);
  return e164 ? { display, href: `tel:${e164}` } : null;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

/** A mailto link that opens a draft (never sends anything), or null when
 *  the address isn't a plausible email. */
export function emailLink(email: string | null | undefined, subject: string, body?: string): string | null {
  const address = (email ?? "").trim();
  if (!EMAIL_RE.test(address)) return null;
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${address}?${params.join("&")}`;
}

/** True when a booking-required deal has at least one usable route. */
export function hasUsableBookingRoute(contacts: BookingContactInput): boolean {
  return Boolean(
    safeWebHref(contacts.bookingUrl) || phoneLink(contacts.phone) || emailLink(contacts.bookingEmail, "x"),
  );
}

/**
 * "Customers enter this code on my website": the business's own code,
 * confirmed tested, with the link where it's used. Checked by the form and
 * again by /api/deals/create. A MEGA- code never qualifies: MegaDeal
 * generates those and no business's website knows them.
 */
export function websiteCodeError(input: {
  code: string;
  onWebsite: boolean;
  url: string;
  tested: boolean;
}): string | null {
  if (!input.onWebsite) return null;
  if (!input.code || isMegaDealCode(input.code)) {
    return "Enter your own code first: customers can only use a code your website already accepts.";
  }
  if (!safeWebHref(input.url)) return "Add the web address where customers enter the code.";
  if (!input.tested) return "Tick to confirm you've tried this exact code on your website.";
  return null;
}

/** The deal's own "enter the code here" link, when the business has set
 *  one up (its own code, confirmed working on its website); null otherwise. */
export function websiteCodeHref(deal: {
  dealCode?: string | null;
  codeOnWebsite?: boolean | null;
  codeWebsiteUrl?: string | null;
}): string | null {
  if (deal.codeOnWebsite !== true || !deal.dealCode || isMegaDealCode(deal.dealCode)) return null;
  return safeWebHref(deal.codeWebsiteUrl);
}

/** MegaDeal-generated codes: MEGA-7K2QD, or since Oct 2026 a word and
 *  letters like FEASTKT (lib/memorableCode.ts); a business can't choose
 *  either kind. Any other code is the business's
 *  own, which they were asked to set up in their own booking system. */
export function isMegaDealCode(code: string | null | undefined): boolean {
  return Boolean(code && (code.startsWith("MEGA-") || isMemorableCode(code)));
}

export type ContactKind = "phone" | "email" | "website" | "directions";

export interface ContactOption {
  kind: ContactKind;
  /** "Phone", "Email", "Website", "Booking website", "Directions". */
  label: string;
  /** What the row shows: the number, address, site or street. */
  detail: string;
  href: string;
  external: boolean;
  /** A short extra line, e.g. where the code goes on a website. */
  note?: string;
}

/** "www.cafe.co.nz/book" from "https://www.cafe.co.nz/book/". */
function displayUrl(href: string): string {
  return href.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Every way to contact the business about a deal, for the deal page's one
 * "Contact business" button. Only what really exists is listed, in a fixed
 * order: phone, email, website, directions. The business profile is the
 * source of truth; nothing here is chosen per deal, except the deal's own
 * "enter your code here" link when the business set one up.
 *
 * The website row is the deal's code link if there is one, otherwise the
 * booking link for an offer that's booked (never on a "no booking needed"
 * offer: that link is for the business's other services), otherwise the
 * general website.
 *
 * `directionsUrl` must already respect a hidden address (callers pass null
 * for a home-based or mobile business), and `addressText` likewise.
 */
export function contactOptions(input: {
  requirement: BookingRequirement;
  businessName: string | null;
  dealName: string;
  dealCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bookingUrl: string | null;
  codeWebsiteUrl: string | null;
  directionsUrl: string | null;
  addressText: string | null;
}): ContactOption[] {
  const options: ContactOption[] = [];
  const phone = phoneLink(input.phone);
  if (phone) options.push({ kind: "phone", label: "Phone", detail: phone.display, href: phone.href, external: false });

  const greeting = input.businessName ? `Hi ${input.businessName},` : "Hi,";
  const body = [
    greeting,
    "",
    "I'm interested in your MegaDeal offer:",
    input.dealName,
    ...(input.dealCode ? ["", `Deal code: ${input.dealCode}`] : []),
    "",
    "Thanks.",
  ].join("\n");
  const mail = emailLink(input.email, `MegaDeal enquiry — ${input.dealName}`, body);
  if (mail && input.email) {
    options.push({ kind: "email", label: "Email", detail: input.email.trim(), href: mail, external: false });
  }

  const booked = input.requirement === "required" || input.requirement === "recommended";
  const codeLink = safeWebHref(input.codeWebsiteUrl);
  const bookingLink = booked ? safeWebHref(input.bookingUrl) : null;
  const site = safeWebHref(input.website);
  if (codeLink) {
    options.push({
      kind: "website",
      label: "Website",
      detail: displayUrl(codeLink),
      href: codeLink,
      external: true,
      note: "Enter your code at checkout",
    });
  } else if (bookingLink) {
    options.push({ kind: "website", label: "Booking website", detail: displayUrl(bookingLink), href: bookingLink, external: true });
  } else if (site) {
    options.push({ kind: "website", label: "Website", detail: displayUrl(site), href: site, external: true });
  }

  if (input.directionsUrl) {
    options.push({
      kind: "directions",
      label: "Directions",
      detail: input.addressText || "Open in maps",
      href: input.directionsUrl,
      external: true,
    });
  }
  return options;
}

/**
 * The short line under the "Contact business" button, from the deal's
 * booking requirement. Nothing here may imply that a code books, reserves
 * or pays for anything.
 */
export function contactInstruction(
  requirement: BookingRequirement,
  code: string | null,
  /** walkIns: the business said walk-ins are welcome (its terms).
   *  websiteCode: the business confirmed its own code works on its site. */
  extras: { walkIns?: boolean; websiteCode?: boolean } = {},
): { heading: string; text: string } {
  const quote = code ? "Quote your deal code" : "Mention this MegaDeal offer";
  if (requirement === "not_required") {
    return {
      heading: "No booking required",
      text: extras.websiteCode
        ? "Enter your deal code at checkout on the business's website, or show it when you visit."
        : code
          ? "Show or quote your deal code when you visit."
          : "Mention this MegaDeal offer when you visit.",
    };
  }
  if (requirement === "unknown") {
    return { heading: "Contact the business", text: `${quote} when contacting the business. Check the conditions for how to use it.` };
  }
  let text = extras.websiteCode
    ? "Enter your deal code at checkout on the business's website, or quote it when contacting the business."
    : `${quote} when contacting the business.`;
  // Only when the business has said so, and never on a booking-required
  // offer (bookingConflict stops that combination being saved).
  if (requirement === "recommended" && extras.walkIns) text += " Walk-ins welcome too.";
  return { heading: requirement === "required" ? "Booking required" : "Booking recommended", text };
}
