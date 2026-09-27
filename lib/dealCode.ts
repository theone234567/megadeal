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
 * Why a business-chosen deal code isn't allowed, or null if it is.
 * Plain ASCII letters and digits in single-hyphen-separated groups only —
 * no spaces, symbols, markup, emoji or look-alike Unicode — so the code
 * reads the same everywhere it's shown, spoken or typed.
 */
export function dealCodeError(code: string, opts: { allowReserved?: boolean } = {}): string | null {
  if (code.length < DEAL_CODE_MIN || code.length > DEAL_CODE_MAX) {
    return `Your deal code must be ${DEAL_CODE_MIN}–${DEAL_CODE_MAX} characters.`;
  }
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(code)) {
    return "Use only letters, numbers and single hyphens in your deal code (e.g. SUMMER-20).";
  }
  if (!/[A-Z]/.test(code)) {
    return "Include at least one letter in your deal code.";
  }
  if (!opts.allowReserved && (code === "MEGA" || code.startsWith(RESERVED_PREFIX))) {
    return "Codes starting with MEGA- are reserved for MegaDeal — choose a different one.";
  }
  return null;
}
