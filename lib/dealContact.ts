import { emailLink, phoneLink, type BookingRequirement } from "./booking";
import { safeWebHref } from "./socialLinks";
import type { DealAction } from "./dealEvents";

/**
 * The one place that decides how a customer gets in touch about a deal:
 * the deal page's "Get deal code" panel, the merchant's preview and the
 * business's settings preview all read it, so they never disagree.
 *
 * Only methods the business actually supplied (and that are valid) are
 * offered; nothing turns into a disabled or placeholder button. The order
 * is the business's preferred method first, when it has one and it's
 * usable, then booking link, phone, website, email. Nothing here claims a
 * code books, reserves or pays for anything.
 */

export type ContactMethod = "booking" | "phone" | "website" | "email";
export const CONTACT_METHODS: ContactMethod[] = ["booking", "phone", "website", "email"];

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  booking: "Book online",
  phone: "Call business",
  website: "Visit website",
  email: "Email business",
};

export function isContactMethod(v: unknown): v is ContactMethod {
  return typeof v === "string" && (CONTACT_METHODS as string[]).includes(v);
}

export interface ContactAction {
  method: ContactMethod | "directions";
  label: string;
  href: string;
  external: boolean;
  /** The number, address or site, for screen readers and small print. */
  detail: string;
  /** The deal-results counter it adds to (lib/dealEvents.ts). */
  action: DealAction;
}

export interface DealContactInput {
  requirement: BookingRequirement;
  businessName: string | null;
  dealName: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bookingUrl: string | null;
  /** The business's own code works on this page (lib/booking.ts
   *  websiteCodeHref): it replaces the booking link. */
  codeWebsiteUrl: string | null;
  /** Already null for a business whose address is private. */
  directionsUrl: string | null;
  addressText: string | null;
  /** The business's main customer button, when it chose one. */
  preferred?: ContactMethod | null;
  /** The business said walk-ins are welcome (its conditions). */
  walkIns?: boolean;
}

export interface DealContact {
  /** The filled button; null for a walk-in deal, where nothing needs
   *  booking and a big "Book online" would suggest otherwise. */
  primary: ContactAction | null;
  /** One outlined button under it. */
  secondary: ContactAction | null;
  /** The rest, as quieter links. */
  links: ContactAction[];
  /** How to use the code, in a sentence. */
  instruction: string;
  /** "Booking required." and so on; null when the business never said. */
  requirementLine: string | null;
  /** The panel's last line. */
  footer: string;
  /** The business picked a main button it no longer supplies (a fallback
   *  is used): for the merchant's own screens, never the customer's. */
  preferredUnavailable: boolean;
  /** Every usable method, in the order offered. */
  methods: ContactMethod[];
}

/** For comparing two links: host without "www.", path without a trailing
 *  slash, the query kept (it can be what makes a booking link different). */
export function comparableUrl(href: string): string {
  try {
    const u = new URL(href);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${path}${u.search}`;
  } catch {
    return href;
  }
}

function displayUrl(href: string): string {
  return href.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function resolveDealContact(input: DealContactInput): DealContact {
  const walkIn = input.requirement === "not_required";
  const codeLink = safeWebHref(input.codeWebsiteUrl);
  // A booking link is for booking: never offered on a "no booking needed"
  // deal, where it would read as a requirement.
  const bookingHref = codeLink ?? (walkIn ? null : safeWebHref(input.bookingUrl));
  const phone = phoneLink(input.phone);
  const siteHref = safeWebHref(input.website);
  const greeting = input.businessName ? `Hi ${input.businessName},` : "Hi,";
  const body = [
    greeting,
    "",
    "I'm interested in your MegaDeal offer:",
    input.dealName,
    ...(input.code ? ["", `Deal code: ${input.code}`] : []),
    "",
    "Thanks.",
  ].join("\n");
  const mail = emailLink(input.email, `MegaDeal enquiry — ${input.dealName}`, body);

  const available: Partial<Record<ContactMethod, ContactAction>> = {};
  if (bookingHref) {
    // The business's own code on its website, for a deal that needs no
    // booking, is used at the online checkout, not to book.
    const label = codeLink && walkIn ? "Use code online" : "Book online";
    available.booking = { method: "booking", label, href: bookingHref, external: true, detail: displayUrl(bookingHref), action: "website" };
  }
  if (phone) {
    available.phone = { method: "phone", label: "Call business", href: phone.href, external: false, detail: phone.display, action: "call" };
  }
  // The same page twice is one button, not two.
  if (siteHref && !(bookingHref && comparableUrl(siteHref) === comparableUrl(bookingHref))) {
    available.website = { method: "website", label: "Visit website", href: siteHref, external: true, detail: displayUrl(siteHref), action: "website" };
  }
  if (mail && input.email) {
    available.email = { method: "email", label: "Email business", href: mail, external: false, detail: input.email.trim(), action: "email" };
  }

  const preferred = input.preferred && available[input.preferred] ? input.preferred : null;
  const methods = [...(preferred ? [preferred] : []), ...CONTACT_METHODS.filter((m) => m !== preferred && available[m])];
  const directions: ContactAction | null = input.directionsUrl
    ? {
        method: "directions",
        label: "Get directions",
        href: input.directionsUrl,
        external: true,
        detail: input.addressText || "Open in maps",
        action: "directions",
      }
    : null;

  let primary: ContactAction | null = null;
  let secondary: ContactAction | null = null;
  let rest: ContactAction[];
  if (walkIn) {
    // Nothing to book: the business's online checkout when its code works
    // there, otherwise getting there is the useful thing.
    if (available.booking) {
      secondary = available.booking;
      rest = [...methods.filter((m) => m !== "booking").map((m) => available[m]!), ...(directions ? [directions] : [])];
    } else {
      secondary = directions;
      rest = methods.map((m) => available[m]!);
    }
  } else {
    primary = methods.length > 0 ? available[methods[0]]! : null;
    // A second button only for another way to book: booking or phone.
    const second = methods.slice(1).find((m) => m === "booking" || m === "phone");
    secondary = second ? available[second]! : null;
    rest = [
      ...methods.filter((m) => m !== methods[0] && m !== second).map((m) => available[m]!),
      ...(directions ? [directions] : []),
    ];
  }

  return {
    primary,
    secondary,
    links: rest,
    instruction: instructionFor(input, (primary?.method as ContactMethod | undefined) ?? null, Boolean(codeLink)),
    requirementLine:
      input.requirement === "required"
        ? "Booking required."
        : input.requirement === "recommended"
          ? "Booking recommended."
          : walkIn
            ? "No booking needed."
            : null,
    footer:
      input.requirement === "required"
        ? "Pay the business directly. Your booking is only confirmed by the business."
        : walkIn
          ? "Pay the business directly."
          : "Pay the business directly. A code is not a confirmed booking.",
    preferredUnavailable: Boolean(input.preferred && !preferred),
    methods,
  };
}

function instructionFor(input: DealContactInput, primary: ContactMethod | null, onlineCode: boolean): string {
  const it = input.code ? "this code" : "this MegaDeal offer";
  if (onlineCode && input.code) {
    return input.requirement === "not_required"
      ? "Enter this code at checkout on the business's website, or show it before ordering or paying."
      : "Enter this code when you book on the business's website.";
  }
  if (input.requirement === "not_required") {
    return input.code
      ? "Show this code before ordering or paying. No booking needed."
      : "Mention this MegaDeal offer before ordering or paying. No booking needed.";
  }
  if (input.requirement === "recommended") {
    return `Contact the business to check availability, or show ${it} when you visit.${input.walkIns ? " Walk-ins welcome too." : ""}`;
  }
  if (input.requirement === "required") {
    if (primary === "phone") return input.code ? `Call to check availability and quote ${input.code}.` : "Call to check availability and mention this MegaDeal offer.";
    if (primary === "email") return `Email the business to check availability and quote ${it}.`;
    return `Mention ${it} when booking, or show it when you visit.`;
  }
  return `Quote ${it} when you contact the business. Check the conditions for how to use it.`;
}
