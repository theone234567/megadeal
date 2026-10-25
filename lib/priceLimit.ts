/**
 * The highest price the database can store. Prices are numeric(10,2)
 * (deals.price_now, price_was), so anything above this can't be saved.
 * Drafts keep anything up to here, so a half-typed price isn't lost.
 */
export const MAX_DEAL_PRICE = 99_999_999.99;

/**
 * The highest price a deal can be submitted or edited with (T250). Local
 * deals sit far below it (the dearest examples are spa days and weekend
 * getaways at a few hundred to a couple of thousand dollars), so anything
 * above is almost always a slip, like 99999999 for 99.99, and is refused
 * before it can reach the site.
 */
export const DEAL_PRICE_CAP = 10_000;

export const PRICE_TOO_HIGH_MESSAGE = "Deal prices go up to $10,000. Check the number, or contact us about a bigger deal.";

export const PRICE_FORMAT_MESSAGE = "Enter the price in dollars and cents, like 49 or 49.50.";

/**
 * A price as typed or sent: whole dollars, or dollars and up to 2 decimal
 * places. Text is read strictly (no "1e3", no "0.001", no minus sign);
 * a JSON number must also come to whole cents. null for anything else,
 * including blank.
 */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return null;
    const cents = raw * 100;
    return Math.abs(cents - Math.round(cents)) < 1e-6 ? Math.round(cents) / 100 : null;
  }
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  return /^\d+(\.\d{1,2})?$/.test(text) ? Number(text) : null;
}

/** What's wrong with a price, or null when it can be used: blank and
 *  0 or less are left to the caller, which knows whether it's required. */
export function priceError(raw: unknown): string | null {
  if (raw === "" || raw === null || raw === undefined) return null;
  const v = parsePrice(raw);
  if (v === null) {
    const n = Number(raw);
    return Number.isFinite(n) && n > DEAL_PRICE_CAP ? PRICE_TOO_HIGH_MESSAGE : PRICE_FORMAT_MESSAGE;
  }
  return v > DEAL_PRICE_CAP ? PRICE_TOO_HIGH_MESSAGE : null;
}
