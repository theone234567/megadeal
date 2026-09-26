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

/**
 * Reads a rendered terms string back into the boxes that produced it.
 *
 * renderTerms joins with ". ", so splitting on that and matching each
 * piece against the known labels recovers the selection exactly —
 * anything that doesn't match is what the merchant typed themselves.
 *
 * This exists so a draft's terms survive without anywhere to store the
 * ticked ids: the rendered sentence is already in a column the Deals
 * collection has always had.
 */
export function parseTerms(rendered: string): { selectedIds: string[]; custom: string } {
  const guess = splitTerms(rendered);
  // Only trust the split if re-rendering it reproduces the original
  // exactly. renderTerms always puts standard labels first and custom
  // text last, so terms written the other way round — "Ask at reception
  // for the MegaDeal rate. Bookings essential." — would come back
  // reordered, and re-saving would publish the reordered version. It also
  // catches a merchant's own sentence that happens to match a label word
  // for word, which would otherwise become a chip whose untick silently
  // deleted their text.
  if (renderTerms(guess.selectedIds, guess.custom) === rendered.trim()) return guess;
  return { selectedIds: [], custom: rendered.trim() };
}

/**
 * Splits a rendered terms string back into its individual conditions, in
 * their original order — for showing each one as its own bullet on the
 * public deal page instead of one dense paragraph a customer has to
 * parse themselves. Unlike parseTerms, this never needs to work out which
 * pieces were the standard checkboxes: it's redisplaying text, not
 * recovering form state to edit, so there's no reordering risk to guard
 * against — every piece stays exactly where it was written.
 */
export function splitTermsForDisplay(rendered: string): string[] {
  return rendered
    .split(". ")
    .map((piece) => piece.replace(/\.$/, "").trim())
    .filter(Boolean);
}

/**
 * Short forms of the standard conditions that most change whether a deal
 * suits someone, in the order a customer needs them — for the one-line
 * restriction summary on a deal card and the "Before you book" panel.
 *
 * Only exact standard labels are recognised. A merchant's own free-text
 * condition is never shortened or paraphrased here: it can say anything,
 * and a summary that misstates it is worse than no summary. Those always
 * appear in full in the deal page's complete conditions list.
 */
const KEY_RESTRICTIONS: { id: string; short: string }[] = [
  { id: "mon-thu", short: "Mon–Thu only" },
  { id: "dine-in", short: "Dine-in only" },
  { id: "bookings", short: "Bookings essential" },
  { id: "public-holidays", short: "Not on public holidays" },
  { id: "one-per-customer", short: "One per customer" },
];

export function keyRestrictions(rendered: string | null): string[] {
  if (!rendered) return [];
  const present = new Set(
    splitTermsForDisplay(rendered).map((piece) => piece.toLowerCase())
  );
  return KEY_RESTRICTIONS.filter(({ id }) => {
    const label = LABEL_BY_ID.get(id);
    return label !== undefined && present.has(label.toLowerCase());
  }).map(({ short }) => short);
}

function splitTerms(rendered: string): { selectedIds: string[]; custom: string } {
  const idByLabel = new Map(STANDARD_TERMS.map((t) => [t.label.toLowerCase(), t.id]));
  const selectedIds: string[] = [];
  const leftovers: string[] = [];

  for (const raw of rendered.split(". ")) {
    const piece = raw.replace(/\.$/, "").trim();
    if (!piece) continue;
    const id = idByLabel.get(piece.toLowerCase());
    if (id) selectedIds.push(id);
    else leftovers.push(piece);
  }

  const custom = leftovers.join(". ");
  return {
    selectedIds,
    custom: custom ? (/[.!?]$/.test(custom) ? custom : `${custom}.`) : "",
  };
}
