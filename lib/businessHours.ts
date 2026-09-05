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

export interface BusinessHoursData {
  schedule: DaySchedule[];
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

  return {
    schedule: schedule as DaySchedule[],
    notes: typeof (parsed as any).notes === "string" ? (parsed as any).notes : undefined,
  };
}

export function serializeBusinessHours(data: BusinessHoursData): string {
  return JSON.stringify(data);
}

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
export function formatBusinessHoursLines(data: BusinessHoursData): string[] {
  const lines: string[] = [];
  let i = 0;
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

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Current day/time in NZ local time, DST-aware, regardless of the
 *  server's or visitor's own timezone. */
function nzNow(): { day: Day; minutes: number } {
  const now = new Date();
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
export function isOpenNow(data: BusinessHoursData): boolean {
  const { day, minutes } = nzNow();
  const today = data.schedule.find((d) => d.day === day);
  if (!today || today.closed) return false;
  return today.ranges.some((r) => {
    const open = timeToMinutes(r.open);
    const close = timeToMinutes(r.close);
    if (close <= open) return false;
    return minutes >= open && minutes < close;
  });
}
