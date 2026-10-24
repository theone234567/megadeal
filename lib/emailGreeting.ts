import { escapeHtml } from "./escapeHtml";

const TITLES = /^(?:mr|mrs|ms|miss|mx|dr|sir|dame)\.?$/i;

/**
 * Who a business email says hello to: the contact person's first name
 * ("Hi Sam,"), else the business's name, else "there". A first name that
 * doesn't look like one (an initial, an email address, a phone number)
 * falls back to the business name rather than greeting someone as "J."
 * Typed all in capitals or all in lower case, it's tidied ("SAM" → "Sam").
 */
export function greetingName(contactName: string | null | undefined, businessName?: string | null): string {
  const words = (contactName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = words.find((w) => !TITLES.test(w)) ?? "";
  const looksLikeName = /^\p{L}[\p{L}'’-]*\p{L}$/u.test(first) && first.length <= 30;
  if (looksLikeName) {
    return first === first.toUpperCase() || first === first.toLowerCase()
      ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
      : first;
  }
  return (businessName ?? "").trim() || "there";
}

/** The opening line of a business email, as HTML. */
export function greetingHtml(contactName: string | null | undefined, businessName?: string | null): string {
  return `<p style="margin:0 0 16px;">Hi ${escapeHtml(greetingName(contactName, businessName))},</p>`;
}
