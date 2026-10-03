/**
 * New Zealand wall-clock time <-> UTC, daylight saving included, with no
 * date library: Intl knows the Pacific/Auckland rules. Times are stored as
 * UTC (ISO strings) and shown and picked in NZ time.
 */

export const NZ_TIME_ZONE = "Pacific/Auckland";

const partsFormat = new Intl.DateTimeFormat("en-NZ", {
  timeZone: NZ_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function wallClock(ms: number): { y: number; mo: number; d: number; h: number; mi: number } {
  const parts = Object.fromEntries(partsFormat.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return { y: Number(parts.year), mo: Number(parts.month), d: Number(parts.day), h: Number(parts.hour) % 24, mi: Number(parts.minute) };
}

/** Minutes NZ is ahead of UTC at this instant (720 in winter, 780 in summer). */
function offsetMinutes(ms: number): number {
  const w = wallClock(ms);
  return Math.round((Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi) - Math.floor(ms / 60_000) * 60_000) / 60_000);
}

/** "YYYY-MM-DD" and "HH:MM" for an instant, in NZ time (form values). */
export function nzDateTimeParts(ms: number): { date: string; time: string } {
  const w = wallClock(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${w.y}-${pad(w.mo)}-${pad(w.d)}`, time: `${pad(w.h)}:${pad(w.mi)}` };
}

/**
 * An NZ date ("YYYY-MM-DD") and time ("HH:MM") as a UTC instant. A time
 * that doesn't exist (the hour skipped when daylight saving starts) is an
 * error rather than being moved; one that happens twice (when it ends)
 * takes the first.
 */
export function nzLocalToUtc(date: string, time: string): { ms: number; error?: undefined } | { ms?: undefined; error: string } {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  const tm = /^(\d{2}):(\d{2})$/.exec(time ?? "");
  if (!dm || !tm) return { error: "Choose a start date and time." };
  const [y, mo, d, h, mi] = [Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(tm[1]), Number(tm[2])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return { error: "Choose a start date and time." };
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(asUtc);
  if (check.getUTCDate() !== d || check.getUTCMonth() !== mo - 1) return { error: "Choose a start date and time." };

  // Try the earlier offset first (the first of a repeated hour), then the
  // other; keep whichever really is that wall-clock time in NZ.
  const offsets = [...new Set([offsetMinutes(asUtc - 13 * 3_600_000), offsetMinutes(asUtc + 13 * 3_600_000)])].sort((a, b) => b - a);
  for (const off of offsets) {
    const ms = asUtc - off * 60_000;
    const w = wallClock(ms);
    if (w.y === y && w.mo === mo && w.d === d && w.h === h && w.mi === mi) return { ms };
  }
  return { error: "That time doesn't exist in New Zealand (the clocks go forward then). Choose another time." };
}

const displayFormat = new Intl.DateTimeFormat("en-NZ", {
  timeZone: NZ_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "Sat 4 Oct, 12:00 pm" in NZ time. */
export function formatNzDateTime(value: string | number | Date): string {
  const ms = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(ms) ? displayFormat.format(new Date(ms)) : "";
}
