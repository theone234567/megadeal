// Excludes visually ambiguous characters (0/O, 1/I/L) so a code read aloud
// or typed by hand doesn't get misheard/mistyped.
const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * A short, static reference code shown on a deal's page for the customer
 * to quote when they contact or book with the business — lets the
 * business recognise a MegaDeal lead at a glance. This is a lightweight
 * identifier, not a redemption token: it's the same code for every
 * customer of that deal, generated once when the deal is created.
 */
export function generateDealCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `MEGA-${code}`;
}

/** Codes MegaDeal generates start with this; a business can't choose one
 *  that does, so a customer can't mistake a business's own code for ours
 *  (or the reverse). */
const RESERVED_PREFIX = "MEGA-";
export const DEAL_CODE_MIN = 4;
export const DEAL_CODE_MAX = 20;

/**
 * Tidies a business-chosen code: Unicode-normalised first (so look-alike
 * full-width letters become plain ones before the check below), trimmed,
 * upper-cased, and runs of spaces turned into a single hyphen. What comes
 * out still has to pass dealCodeError.
 */
export function normaliseDealCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

/**
 * Why a business-chosen deal code isn't allowed, or null if it is — worded
 * for the business, naming the exact problem (which characters, how many).
 * Plain ASCII letters and digits in single-hyphen-separated groups only —
 * no spaces, symbols, markup, emoji or look-alike Unicode — so the code
 * reads the same everywhere it's shown, spoken or typed.
 */
export function dealCodeError(code: string, opts: { allowReserved?: boolean } = {}): string | null {
  const chars = [...code];
  const invalid = [...new Set(chars.filter((c) => !/[A-Z0-9-]/.test(c)))];
  if (invalid.length > 0) {
    const shown = invalid.slice(0, 6).map((c) => (c.trim() ? c : "space")).join("  ");
    return `These characters can't be used: ${shown}. Use only letters A–Z, numbers 0–9 and hyphens.`;
  }
  if (code.startsWith("-") || code.endsWith("-")) {
    return "A hyphen can't be at the start or end of your code.";
  }
  if (code.includes("--")) {
    return "Use single hyphens only — not two in a row.";
  }
  if (chars.length > DEAL_CODE_MAX) {
    return `Too long — your code has ${chars.length} characters; the maximum is ${DEAL_CODE_MAX}.`;
  }
  if (chars.length < DEAL_CODE_MIN) {
    return `Too short — your code has ${chars.length} character${chars.length === 1 ? "" : "s"}; it needs at least ${DEAL_CODE_MIN}.`;
  }
  if (!/[A-Z]/.test(code)) {
    return "Include at least one letter — a code of only numbers is easy to mistake for a price or phone number.";
  }
  if (!opts.allowReserved && (code === "MEGA" || code.startsWith(RESERVED_PREFIX))) {
    return "Codes starting with MEGA- are reserved for MegaDeal — choose a different one.";
  }
  return null;
}

/**
 * The code a draft carries from its first save, so the private preview
 * shows the real one and editing never changes it: the business's own
 * code when they've entered a valid one, otherwise the MEGA- code it
 * already has, otherwise a new one. Kept through submission.
 */
export function codeForDraft(ownCode: unknown, existingCode: unknown): string {
  const own = typeof ownCode === "string" ? normaliseDealCode(ownCode) : "";
  if (own && !dealCodeError(own)) return own;
  return typeof existingCode === "string" && /^MEGA-[A-Z0-9]{5}$/.test(existingCode) ? existingCode : generateDealCode();
}
