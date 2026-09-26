/**
 * Truncates free text for a meta description without cutting mid-word.
 * Google displays roughly the first 155-160 characters and appends its
 * own ellipsis when it truncates further — but a hard slice(0, n) lands
 * wherever the character count happens to fall, usually mid-word, and
 * that's what actually ends up in the <meta name="description"> tag
 * search engines read, not just what's shown on screen.
 */
export function truncateForMeta(text: string, maxLength = 155): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * A deal's offer deadline as a calendar date in New Zealand time, e.g.
 * "26 October", or "26 October 2027" when it falls in a later year than
 * the current one.
 *
 * The time zone is fixed rather than taken from the environment: the
 * server renders in UTC and the visitor's browser in NZ time, so a
 * deadline near midnight would otherwise print as two different dates —
 * one in the HTML and another after hydration.
 */
export function formatOfferEndDate(iso: string, withTime = false): string {
  const date = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "Pacific/Auckland",
    day: "numeric",
    month: "long",
  };
  const yearOf = (d: Date) =>
    new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", year: "numeric" }).format(d);
  if (yearOf(date) !== yearOf(new Date())) opts.year = "numeric";
  if (withTime) {
    opts.hour = "numeric";
    opts.minute = "2-digit";
  }
  return new Intl.DateTimeFormat("en-NZ", opts).format(date);
}

export function formatMoney(amount: number, currency: string, formatted?: string | null) {
  if (formatted) return formatted;
  try {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
