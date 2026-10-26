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
  const cut = sliceGraphemes(trimmed, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** The longest start of `text` that fits in `max` UTF-16 units without
 *  splitting a character: an emoji (or a letter with its accent) is kept
 *  whole or left out, never cut in half into a broken symbol (T256). */
export function sliceGraphemes(text: string, max: number): string {
  if (text.length <= max) return text;
  const Segmenter = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
  if (!Segmenter) {
    // Older engines: at least never end on half of a surrogate pair.
    const code = text.charCodeAt(max - 1);
    return text.slice(0, code >= 0xd800 && code <= 0xdbff ? max - 1 : max);
  }
  let out = "";
  for (const { segment } of new Segmenter("en", { granularity: "grapheme" }).segment(text)) {
    if (out.length + segment.length > max) break;
    out += segment;
  }
  return out;
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

/** " · 3 days left" (or " · last day") in an offer's final week, counted
 *  in New Zealand calendar days; "" before then or once it has ended. */
export function offerDaysLeft(expiresAt: string, now: number = Date.now()): string {
  const nzDay = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end) || end <= now) return "";
  const days = Math.round((Date.parse(nzDay(end)) - Date.parse(nzDay(now))) / 86_400_000);
  if (days > 7) return "";
  return days === 0 ? " · last day" : ` · ${days} ${days === 1 ? "day" : "days"} left`;
}

export function formatMoney(amount: number, currency: string, formatted?: string | null) {
  if (formatted) return formatted;
  // Never "NaN" or "$Infinity" on a page (T256).
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  // To the cent first, so 49.999 is "$50" and float noise never shows.
  const cents = Math.round(amount * 100) / 100;
  try {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      // Every deal is in New Zealand dollars; a missing currency used to
      // fall back to US dollars and print "US$".
      currency: currency || "NZD",
      minimumFractionDigits: cents % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents);
  } catch {
    return `$${cents.toFixed(2)}`;
  }
}

/** "NZDT" or "NZST": New Zealand's time zone at that moment, for times in
 *  emails, which may be read anywhere (T246). */
export function nzZoneName(at: string | number | Date): string {
  const d = at instanceof Date ? at : new Date(at);
  if (!Number.isFinite(d.getTime())) return "NZ time";
  return (
    new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "NZ time"
  );
}
