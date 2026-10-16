import { emailLink, phoneLink } from "./booking";
import { CONTACT_METHOD_LABELS, isContactMethod, type ContactMethod } from "./dealContact";
import { safeWebHref } from "./socialLinks";

/**
 * Booking & contact, entered once on the business profile and reused on
 * every deal; a deal can have its own details instead
 * (supabase/migrations/20261019000000_booking_contact.sql).
 *
 * An override's keys each mean: missing = the business's value; null =
 * deliberately none for this deal; text = this deal's value. So clearing
 * a field for one deal can't quietly bring the business's value back.
 */

export interface ContactDetails {
  phone: string | null;
  bookingUrl: string | null;
  website: string | null;
  email: string | null;
  preferred: ContactMethod | null;
}

export type ContactOverride = Partial<ContactDetails>;

const TEXT_KEYS = ["phone", "bookingUrl", "website", "email"] as const;
const LIMITS: Record<(typeof TEXT_KEYS)[number], number> = { phone: 40, bookingUrl: 500, website: 500, email: 254 };

/** The methods these details can actually offer a customer, in MegaDeal's
 *  order: booking link, phone, website, email. */
export function availableMethods(d: Pick<ContactDetails, "phone" | "bookingUrl" | "website" | "email">): ContactMethod[] {
  const out: ContactMethod[] = [];
  if (safeWebHref(d.bookingUrl)) out.push("booking");
  if (phoneLink(d.phone)) out.push("phone");
  if (safeWebHref(d.website)) out.push("website");
  if (emailLink(d.email, "x")) out.push("email");
  return out;
}

/** The method that leads: the chosen one if it's still there, otherwise
 *  the first available. Null when nothing is. */
export function leadingMethod(d: ContactDetails): ContactMethod | null {
  const methods = availableMethods(d);
  return d.preferred && methods.includes(d.preferred) ? d.preferred : methods[0] ?? null;
}

/** "Book online · Website", for a summary line. */
export function contactSummary(d: ContactDetails): string {
  const methods = availableMethods(d);
  const lead = leadingMethod(d);
  const ordered = lead ? [lead, ...methods.filter((m) => m !== lead)] : methods;
  return ordered.map((m) => CONTACT_METHOD_SHORT[m]).join(" · ");
}

export const CONTACT_METHOD_SHORT: Record<ContactMethod, string> = {
  booking: "Book online",
  phone: "Call",
  website: "Website",
  email: "Email",
};

export { CONTACT_METHOD_LABELS };

/** The business's details with a deal's override applied. */
export function effectiveContact(business: ContactDetails, override: ContactOverride | null | undefined): ContactDetails {
  if (!override) return business;
  const pick = <K extends keyof ContactDetails>(k: K): ContactDetails[K] =>
    Object.prototype.hasOwnProperty.call(override, k) ? ((override[k] ?? null) as ContactDetails[K]) : business[k];
  return {
    phone: pick("phone"),
    bookingUrl: pick("bookingUrl"),
    website: pick("website"),
    email: pick("email"),
    preferred: pick("preferred"),
  };
}

/** Why an override can't be saved, worded for the business, or null. */
export function contactOverrideError(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "Those contact details couldn't be read. Please try again.";
  const v = value as Record<string, unknown>;
  for (const key of Object.keys(v)) {
    if (!(TEXT_KEYS as readonly string[]).includes(key) && key !== "preferred") return "Those contact details couldn't be read. Please try again.";
  }
  for (const key of TEXT_KEYS) {
    const raw = v[key];
    if (raw === undefined || raw === null || raw === "") continue;
    if (typeof raw !== "string" || raw.length > LIMITS[key]) return "One of the contact details is too long.";
  }
  if (typeof v.bookingUrl === "string" && v.bookingUrl.trim() && !safeWebHref(v.bookingUrl)) return "Enter the booking link as a web address, e.g. https://yourbusiness.co.nz/book.";
  if (typeof v.website === "string" && v.website.trim() && !safeWebHref(v.website)) return "Enter the website as a web address, e.g. https://yourbusiness.co.nz.";
  if (typeof v.email === "string" && v.email.trim() && !emailLink(v.email, "x")) return "Enter the email as an address like bookings@yourbusiness.co.nz.";
  if (typeof v.phone === "string" && v.phone.trim() && !phoneLink(v.phone)) return "Enter the phone number with its area code, e.g. 09 123 4567.";
  if (v.preferred !== undefined && v.preferred !== null && !isContactMethod(v.preferred)) return "Choose the main button from the contact details you added.";
  return null;
}

/** An override as stored: known keys only, trimmed, blanks as null (a
 *  deliberate "none"), web addresses tidied. Null when it says nothing. */
export function cleanContactOverride(value: unknown): ContactOverride | null {
  if (contactOverrideError(value) !== null || value === null || value === undefined) return null;
  const v = value as Record<string, unknown>;
  const out: ContactOverride = {};
  for (const key of TEXT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(v, key)) continue;
    const raw = typeof v[key] === "string" ? (v[key] as string).trim() : "";
    out[key] = raw === "" ? null : key === "bookingUrl" || key === "website" ? safeWebHref(raw) : raw;
  }
  if (Object.prototype.hasOwnProperty.call(v, "preferred")) out.preferred = isContactMethod(v.preferred) ? v.preferred : null;
  return Object.keys(out).length > 0 ? out : null;
}
