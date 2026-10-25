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
  close: string; // "HH:MM", 24-hour; "24:00" only in OPEN_ALL_DAY
}

/** Open 24 hours: the whole day, as one range (T243). */
export const OPEN_ALL_DAY: TimeRange = { open: "00:00", close: "24:00" };
export const isAllDay = (r: TimeRange) => r.open === "00:00" && r.close === "24:00";
/** At most this many time ranges a day (lunch, dinner, late). */
export const MAX_RANGES_PER_DAY = 3;

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

/** The NZ calendar date `n` days after `date` ("YYYY-MM-DD"), by the
 *  calendar, not by 24-hour steps: on a daylight-saving changeover day
 *  (23 or 25 hours long) a 24-hour step can land on the wrong day (T243). */
export function addNzDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The exceptions from today (NZ) up to `days` ahead, soonest first. */
export function upcomingExceptions(data: BusinessHoursData, now: Date = new Date(), days = 60): HoursException[] {
  const today = nzToday(now);
  const last = addNzDays(today, days);
  return (data.exceptions ?? []).filter((e) => e.date >= today && e.date <= last).sort((a, b) => a.date.localeCompare(b.date));
}

/** "Thu 25 Dec (Christmas Day): Closed", "Fri 2 Jan: 10am–2pm". */
export function formatExceptionLine(e: HoursException): string {
  const d = new Date(`${e.date}T12:00:00Z`);
  const when = new Intl.DateTimeFormat("en-NZ", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(d)
    .replace(",", "");
  const label = e.label ? ` (${e.label})` : "";
  const hours = e.closed || e.ranges.length === 0 ? "Closed" : formatRanges(e.ranges);
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

/** "17:30" -> "5:30pm", "09:00" -> "9am", "00:00" -> "midnight",
 *  "12:00" -> "noon" (T243: "12am" and "12pm" are easily misread). */
export function formatTime12h(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const m = Number(mStr) || 0;
  if (m === 0 && (h === 0 || h === 24)) return "midnight";
  if (m === 0 && h === 12) return "noon";
  const suffix = h >= 12 && h < 24 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${suffix}` : `${h}:${String(m).padStart(2, "0")}${suffix}`;
}

/** "9am–5pm", "Open 24 hours", "5pm–2am (next day)" (closes after midnight). */
export function formatRange(r: TimeRange): string {
  if (isAllDay(r)) return "Open 24 hours";
  const nextDay = timeToMinutes(r.close) < timeToMinutes(r.open) && r.close !== "00:00";
  return `${formatTime12h(r.open)}–${formatTime12h(r.close)}${nextDay ? " (next day)" : ""}`;
}

export function formatRanges(ranges: TimeRange[]): string {
  return ranges.map(formatRange).join(", ");
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
      lines.push(`${dayLabel} ${formatRanges(day.ranges)}`);
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
      // Open 24 hours is 00:00–23:59 in schema.org's terms.
      closes: isAllDay(r) ? "23:59" : r.close,
    }));
  });
}

/** schema.org specialOpeningHoursSpecification for the upcoming dated
 *  exceptions (a closed date is 00:00–00:00, as Google documents). */
export function toSpecialOpeningHoursSpecification(data: BusinessHoursData, now: Date = new Date()) {
  return upcomingExceptions(data, now).flatMap((e) => {
    const base = { "@type": "OpeningHoursSpecification", validFrom: e.date, validThrough: e.date };
    if (e.closed || e.ranges.length === 0) return [{ ...base, opens: "00:00", closes: "00:00" }];
    return e.ranges.map((r) => ({ ...base, opens: r.open, closes: isAllDay(r) ? "23:59" : r.close }));
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
    // "h23", not hour12: false, which gives "24" for midnight in some
    // runtimes (Cloudflare Workers among them): every business read as
    // closed between 12 and 1am (T243).
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value as Day | undefined;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { day: (DAYS as readonly string[]).includes(weekday || "") ? (weekday as Day) : "Mon", minutes: hour * 60 + minute };
}

/** True if the business is open right now (NZ time), counting a range
 *  that runs past midnight (8pm–2am) on the day it starts. */
export function isOpenNow(data: BusinessHoursData, now: Date = new Date()): boolean {
  return currentRange(data, now) !== null;
}

/** The range the business is open in right now, if any: one of today's,
 *  or last night's that runs past midnight. */
function currentRange(data: BusinessHoursData, now: Date): TimeRange | null {
  const { minutes } = nzNow(now);
  const today = hoursOn(data, nzToday(now));
  if (today && !today.closed) {
    for (const r of today.ranges) {
      const open = timeToMinutes(r.open);
      const close = timeToMinutes(r.close);
      if (close > open ? minutes >= open && minutes < close : close < open && minutes >= open) return r;
    }
  }
  const yesterday = hoursOn(data, addNzDays(nzToday(now), -1));
  if (yesterday && !yesterday.closed) {
    for (const r of yesterday.ranges) {
      const open = timeToMinutes(r.open);
      const close = timeToMinutes(r.close);
      if (close < open && minutes < close) return r;
    }
  }
  return null;
}

/**
 * Today's hours in New Zealand for the deal code panel: "9am–6pm",
 * "11:30am–2pm, 5–9pm", "8pm–2am", or "Closed today" (with the dated
 * exception's name, e.g. "Christmas Day", when there is one). Null when
 * the business hasn't given its hours: they're never guessed.
 */
export function hoursToday(data: BusinessHoursData, now: Date = new Date()): { label: string; closed: boolean; note?: string } | null {
  if (!hoursKnown(data)) return null;
  const date = nzToday(now);
  const note = (data.exceptions ?? []).find((e) => e.date === date)?.label;
  const h = hoursOn(data, date);
  if (!h || h.closed || h.ranges.length === 0) return { label: "Closed today", closed: true, ...(note ? { note } : {}) };
  return {
    label: formatRanges(h.ranges),
    closed: false,
    ...(note ? { note } : {}),
  };
}

/** The hours that apply on an NZ date: its exception, else its weekday. */
function hoursOn(data: BusinessHoursData, date: string): { closed: boolean; ranges: TimeRange[] } | undefined {
  const special = (data.exceptions ?? []).find((e) => e.date === date);
  if (special) return special;
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(new Date(`${date}T12:00:00Z`)) as Day;
  return data.schedule.find((d) => d.day === day);
}

/**
 * Whether the business is open right now, in New Zealand time, as one
 * line: the business page header and the deal page's Contact & booking
 * both use it, so they never disagree (T200):
 *  - "Open now · closes 4pm" (or "Open 24 hours")
 *  - "Opens 7am today" (not open yet today)
 *  - "Closed now · opens 5pm today" (between two of today's ranges)
 *  - "Closed now · opens 7am tomorrow" / "opens Mon 7am" (closed for the day)
 *  - "Closed today · opens 7am tomorrow" / "opens Mon 7am" (shut all day)
 * Null when the business hasn't given its hours, or nothing opens in the
 * next week: "closed" is never shown for hours nobody gave.
 */
export function openStatus(data: BusinessHoursData, now: Date = new Date()): { open: boolean; label: string } | null {
  if (!hoursKnown(data)) return null;
  const { minutes } = nzNow(now);
  const current = currentRange(data, now);
  if (current) return { open: true, label: isAllDay(current) ? "Open 24 hours" : `Open now · closes ${formatTime12h(current.close)}` };
  const opens = (r: TimeRange) => isAllDay(r) || timeToMinutes(r.open) !== timeToMinutes(r.close);
  const byOpening = (a: TimeRange, b: TimeRange) => timeToMinutes(a.open) - timeToMinutes(b.open);
  const todayDate = nzToday(now);
  const today = hoursOn(data, todayDate);
  const todayRanges = today && !today.closed ? today.ranges.filter(opens) : [];
  const later = todayRanges.filter((r) => timeToMinutes(r.open) > minutes).sort(byOpening)[0];
  if (later) {
    const earlier = todayRanges.some((r) => timeToMinutes(r.open) <= minutes);
    return { open: false, label: earlier ? `Closed now · opens ${formatTime12h(later.open)} today` : `Opens ${formatTime12h(later.open)} today` };
  }
  const state = todayRanges.length ? "Closed now" : "Closed today";
  for (let i = 1; i <= 7; i++) {
    const date = addNzDays(todayDate, i);
    const h = hoursOn(data, date);
    const first = h && !h.closed ? h.ranges.filter(opens).sort(byOpening)[0] : undefined;
    if (!first) continue;
    const time = formatTime12h(first.open);
    const when =
      i === 1 ? `${time} tomorrow` : `${new Intl.DateTimeFormat("en-NZ", { timeZone: "UTC", weekday: "short" }).format(new Date(`${date}T12:00:00Z`))} ${time}`;
    return { open: false, label: `${state} · opens ${when}` };
  }
  return null;
}

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Checks opening hours sent by a business before they're stored (T243):
 * the shape this editor makes, real times, at most three ranges a day, a
 * range that opens and closes at different times (closing earlier than it
 * opens means after midnight), dated exceptions, short notes. The error
 * as the business reads it, or null when they're fine. Empty is fine.
 */
export function businessHoursError(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 20_000) return "Opening hours couldn't be read. Please set them again.";
  const data = parseBusinessHours(raw);
  // Plain text from before the hours editor existed: kept as written.
  if (!data && !/^\s*[[{]/.test(raw) && raw.length <= 300) return null;
  if (!data) return "Opening hours couldn't be read. Please set them again.";
  const rangeOk = (r: TimeRange) => isAllDay(r) || (TIME_RE.test(r.open) && TIME_RE.test(r.close) && r.open !== r.close);
  for (const day of data.schedule) {
    if (day.ranges.length > MAX_RANGES_PER_DAY) return `${DAY_FULL_NAME[day.day]} has more than ${MAX_RANGES_PER_DAY} time ranges.`;
    if (!day.closed && !day.ranges.every(rangeOk)) return `Check ${DAY_FULL_NAME[day.day]}'s hours: each range needs an opening and a closing time.`;
  }
  const rawExceptions = (() => {
    try {
      const v = JSON.parse(raw).exceptions;
      return Array.isArray(v) ? v.length : 0;
    } catch {
      return 0;
    }
  })();
  if (rawExceptions > MAX_HOURS_EXCEPTIONS) return `At most ${MAX_HOURS_EXCEPTIONS} special dates.`;
  for (const e of data.exceptions ?? []) {
    if (e.ranges.length > MAX_RANGES_PER_DAY || (!e.closed && !e.ranges.every(rangeOk))) return `Check the hours on ${e.date}.`;
  }
  if ((data.notes ?? "").length > 300) return "Keep the note on your hours under 300 characters.";
  return null;
}

/**
 * How far a deal starting at `start` and running `durationMinutes` goes
 * past the closing time of the hours it starts in (T200): a Flash deal
 * that runs on after the business has shut sends customers to a closed
 * door. Null when it doesn't, when the hours aren't known, when it starts
 * while the business is closed, or when it's open 24 hours.
 */
export function minutesPastClosing(
  data: BusinessHoursData,
  start: Date,
  durationMinutes: number,
): { minutes: number; closes: string; endsAt: Date } | null {
  if (!hoursKnown(data) || !(durationMinutes > 0)) return null;
  const range = currentRange(data, start);
  if (!range || isAllDay(range)) return null;
  const open = timeToMinutes(range.open);
  let close = timeToMinutes(range.close);
  if (close <= open) close += 24 * 60; // closes after midnight (or at midnight)
  let at = nzNow(start).minutes;
  if (close > 24 * 60 && at < open) at += 24 * 60; // in last night's late hours
  const past = durationMinutes - (close - at);
  return past > 0 ? { minutes: past, closes: formatTime12h(range.close), endsAt: new Date(start.getTime() + durationMinutes * 60_000) } : null;
}

/** "1 h 39 m", "45 m". */
export function describePastClosing(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} m` : ""}` : `${m} m`;
}
