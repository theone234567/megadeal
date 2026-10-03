export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

const DAY_FULL_NAME: Record<Day, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export interface TimeRange {
  open: string; // "HH:MM", 24-hour
  close: string; // "HH:MM", 24-hour
}

export interface DaySchedule {
  day: Day;
  closed: boolean;
  ranges: TimeRange[];
}

/** One date that differs from the weekly hours: a public holiday, a
 *  staff day, a late night. Dates are NZ calendar dates, "YYYY-MM-DD". */
export interface HoursException {
  date: string;
  closed: boolean;
  ranges: TimeRange[];
  /** e.g. "Christmas Day" */
  label?: string;
}

export const MAX_HOURS_EXCEPTIONS = 30;

export interface BusinessHoursData {
  schedule: DaySchedule[];
  /** Dated exceptions to the weekly schedule; those in the past are kept
   *  but never shown. */
  exceptions?: HoursException[];
  /** Free-text catch-all for anything the structured schedule can't
   *  express — "Closed public holidays", "Kitchen closes 30min early on
   *  Sundays", etc. */
  notes?: string;
}

export function emptySchedule(): DaySchedule[] {
  return DAYS.map((day) => ({ day, closed: true, ranges: [] }));
}

/**
 * Structured hours are stored as a JSON string in the same `businessHours`
 * text field a plain string used to occupy — no new Wix Data field needed,
 * and any business that entered free text before this existed still reads
 * back fine (this just returns null for it, so callers fall back to
 * displaying the raw string as-is).
 */
export function parseBusinessHours(raw: string | null | undefined): BusinessHoursData | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as any).schedule)) {
    return null;
  }
  const schedule = (parsed as any).schedule as unknown[];
  if (schedule.length !== DAYS.length) return null;

  const valid = schedule.every((d: any, i: number) => {
    if (!d || typeof d !== "object") return false;
    if (d.day !== DAYS[i]) return false;
    if (typeof d.closed !== "boolean") return false;
    if (!Array.isArray(d.ranges)) return false;
    return d.ranges.every(
      (r: any) =>
        r && typeof r === "object" && typeof r.open === "string" && typeof r.close === "string"
    );
  });
  if (!valid) return null;

  // A bad exception is dropped rather than discarding the whole schedule.
  const rawExceptions = Array.isArray((parsed as any).exceptions) ? ((parsed as any).exceptions as unknown[]) : [];
  const exceptions = rawExceptions
    .filter(
      (e: any): e is HoursException =>
        e &&
        typeof e === "object" &&
        typeof e.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        typeof e.closed === "boolean" &&
        Array.isArray(e.ranges) &&
        e.ranges.every((r: any) => r && typeof r.open === "string" && typeof r.close === "string"),
    )
    .map((e) => ({
      date: e.date,
      closed: e.closed,
      ranges: e.ranges,
      ...(typeof e.label === "string" && e.label.trim() ? { label: e.label.trim().slice(0, 60) } : {}),
    }))
    .slice(0, MAX_HOURS_EXCEPTIONS);

  return {
    schedule: schedule as DaySchedule[],
    notes: typeof (parsed as any).notes === "string" ? (parsed as any).notes : undefined,
    ...(exceptions.length > 0 ? { exceptions } : {}),
  };
}

/** True when the business has actually given hours: at least one open day
 *  with a time range. A schedule left all "closed" is unknown, not "closed
 *  every day", and is never shown as closed. */
export function hoursKnown(data: BusinessHoursData): boolean {
  return data.schedule.some((d) => !d.closed && d.ranges.length > 0);
}

/** Today's date in New Zealand, "YYYY-MM-DD". */
export function nzToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The exceptions from today (NZ) up to `days` ahead, soonest first. */
export function upcomingExceptions(data: BusinessHoursData, now: Date = new Date(), days = 60): HoursException[] {
  const today = nzToday(now);
  const last = nzToday(new Date(now.getTime() + days * 86_400_000));
  return (data.exceptions ?? []).filter((e) => e.date >= today && e.date <= last).sort((a, b) => a.date.localeCompare(b.date));
}

/** "Thu 25 Dec (Christmas Day): Closed", "Fri 2 Jan: 10am–2pm". */
export function formatExceptionLine(e: HoursException): string {
  const d = new Date(`${e.date}T12:00:00Z`);
  const when = new Intl.DateTimeFormat("en-NZ", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(d)
    .replace(",", "");
  const label = e.label ? ` (${e.label})` : "";
  const hours =
    e.closed || e.ranges.length === 0
      ? "Closed"
      : e.ranges.map((r) => `${formatTime12h(r.open)}–${formatTime12h(r.close)}`).join(", ");
  return `${when}${label}: ${hours}`;
}

export function serializeBusinessHours(data: BusinessHoursData): string {
  return JSON.stringify(data);
}

/** Every quarter-hour of the day as "HH:MM", for a time <select> — a
 *  fixed list scrolls and keyboard-jumps (type "9" to land near 9am)
 *  far better than the native time input's per-segment steppers, and
 *  business hours are round numbers in practice anyway. */
export const TIME_OPTIONS: string[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

/** "17:30" -> "5:30pm", "09:00" -> "9am" */
export function formatTime12h(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const m = Number(mStr) || 0;
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${suffix}` : `${h}:${String(m).padStart(2, "0")}${suffix}`;
}

function rangeKey(day: DaySchedule): string {
  return day.closed ? "closed" : day.ranges.map((r) => `${r.open}-${r.close}`).join(",");
}

/**
 * Groups consecutive days sharing identical hours onto one line — the
 * same convention most restaurant/business hour displays use ("Mon–Fri
 * 11:30am–2pm, 5:30–9pm" rather than five separate identical lines).
 * Split lunch/dinner (or any number of time ranges per day) is native to
 * the data model, not a special case — a day can hold as many ranges as
 * it needs.
 */
export function formatBusinessHoursLines(data: BusinessHoursData, now: Date = new Date()): string[] {
  const lines: string[] = [];
  let i = hoursKnown(data) ? 0 : data.schedule.length;
  while (i < data.schedule.length) {
    const key = rangeKey(data.schedule[i]);
    let j = i;
    while (j + 1 < data.schedule.length && rangeKey(data.schedule[j + 1]) === key) {
      j++;
    }
    const dayLabel =
      i === j ? data.schedule[i].day : `${data.schedule[i].day}–${data.schedule[j].day}`;
    const day = data.schedule[i];
    if (day.closed || day.ranges.length === 0) {
      lines.push(`${dayLabel}: Closed`);
    } else {
      const times = day.ranges
        .map((r) => `${formatTime12h(r.open)}–${formatTime12h(r.close)}`)
        .join(", ");
      lines.push(`${dayLabel} ${times}`);
    }
    i = j + 1;
  }
  if (data.notes) lines.push(data.notes);
  for (const e of upcomingExceptions(data, now)) lines.push(formatExceptionLine(e));
  return lines;
}

/** schema.org OpeningHoursSpecification array for LocalBusiness JSON-LD —
 *  one entry per time range (a day with lunch + dinner service becomes two
 *  entries with the same dayOfWeek), closed days simply omitted. */
export function toOpeningHoursSpecification(data: BusinessHoursData) {
  return data.schedule.flatMap((day) => {
    if (day.closed) return [];
    return day.ranges.map((r) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAY_FULL_NAME[day.day]}`,
      opens: r.open,
      closes: r.close,
    }));
  });
}

/** schema.org specialOpeningHoursSpecification for the upcoming dated
 *  exceptions (a closed date is 00:00–00:00, as Google documents). */
export function toSpecialOpeningHoursSpecification(data: BusinessHoursData, now: Date = new Date()) {
  return upcomingExceptions(data, now).flatMap((e) => {
    const base = { "@type": "OpeningHoursSpecification", validFrom: e.date, validThrough: e.date };
    if (e.closed || e.ranges.length === 0) return [{ ...base, opens: "00:00", closes: "00:00" }];
    return e.ranges.map((r) => ({ ...base, opens: r.open, closes: r.close }));
  });
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Current day/time in NZ local time, DST-aware, regardless of the
 *  server's or visitor's own timezone. */
function nzNow(now: Date = new Date()): { day: Day; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Auckland",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value as Day | undefined;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { day: (DAYS as readonly string[]).includes(weekday || "") ? (weekday as Day) : "Mon", minutes: hour * 60 + minute };
}

/** True if any of today's ranges (NZ time) contains right now. Doesn't
 *  handle a range that crosses midnight (e.g. a bar open 8pm-2am) — not
 *  needed for the kind of businesses this site lists today, but worth
 *  revisiting if that ever comes up. */
export function isOpenNow(data: BusinessHoursData, now: Date = new Date()): boolean {
  const { day, minutes } = nzNow(now);
  const special = (data.exceptions ?? []).find((e) => e.date === nzToday(now));
  const today = special ?? data.schedule.find((d) => d.day === day);
  if (!today || today.closed) return false;
  return today.ranges.some((r) => {
    const open = timeToMinutes(r.open);
    const close = timeToMinutes(r.close);
    if (close <= open) return false;
    return minutes >= open && minutes < close;
  });
}
