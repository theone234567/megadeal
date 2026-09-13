/**
 * The conditions almost every New Zealand daily deal carries.
 *
 * Terms used to be one empty textarea, so every merchant invented their
 * own wording and half of them forgot the condition that actually causes
 * the argument later — usually "bookings essential" or "not valid public
 * holidays". Unstructured terms also meant every listing had to be read
 * properly at approval time to check the basics were covered.
 *
 * Ticking a box is a much lower bar than drafting a paragraph, so more
 * gets declared up front, the listings read consistently, and a customer
 * turning up on a Saturday already knows the offer is Monday to Thursday.
 *
 * Deliberately not a redemption or voucher list: MegaDeal takes no
 * payment, so there is nothing to redeem, expire or refund. Every
 * condition here is about how the customer books and uses the offer with
 * the business directly.
 */
export interface StandardTerm {
  id: string;
  label: string;
}

export const STANDARD_TERMS: StandardTerm[] = [
  { id: "mention", label: "Mention MegaDeal when you book" },
  { id: "bookings", label: "Bookings essential" },
  { id: "availability", label: "Subject to availability" },
  { id: "other-offers", label: "Not valid with any other offer or discount" },
  { id: "public-holidays", label: "Not valid on public holidays" },
  { id: "mon-thu", label: "Valid Monday to Thursday only" },
  { id: "one-per-customer", label: "One per customer" },
  { id: "dine-in", label: "Dine-in only" },
  { id: "existing-bookings", label: "Not valid on existing bookings" },
  { id: "notice", label: "24 hours' notice to cancel or reschedule" },
];

const LABEL_BY_ID = new Map(STANDARD_TERMS.map((t) => [t.id, t.label]));

/**
 * Turns the ticked boxes and any free text into the single terms string
 * the deal record and the public deal page both already use.
 *
 * Rendering to one string on the way in keeps the storefront untouched —
 * it has always shown `terms` as text — and means an old deal written
 * before this existed still displays exactly as it did.
 */
export function renderTerms(selectedIds: string[], custom: string): string {
  const lines = selectedIds
    .map((id) => LABEL_BY_ID.get(id))
    .filter((label): label is string => Boolean(label));

  const extra = custom.trim();
  if (extra) lines.push(extra);
  if (lines.length === 0) return "";

  // The merchant's own sentence usually ends in punctuation already, so
  // only add a full stop when it's actually missing.
  const text = lines.join(". ");
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
