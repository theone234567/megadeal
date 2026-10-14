import { describe, expect, it } from "vitest";
import { openStatus, type BusinessHoursData, type Day } from "./businessHours";

/** "Open now · closes 9:30pm" on the deal page, in New Zealand time. */

const week = (hours: Partial<Record<Day, [string, string][]>>): BusinessHoursData => ({
  schedule: (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as Day[]).map((day) => ({
    day,
    closed: !hours[day],
    ranges: (hours[day] ?? []).map(([open, close]) => ({ open, close })),
  })),
});
// A pizzeria: closed Mondays, lunch and dinner the rest of the week.
const pizzeria = week({
  Tue: [["11:30", "14:00"], ["17:00", "21:30"]],
  Wed: [["11:30", "14:00"], ["17:00", "21:30"]],
  Thu: [["11:30", "14:00"], ["17:00", "21:30"]],
  Fri: [["11:30", "22:30"]],
  Sat: [["11:00", "22:30"]],
  Sun: [["11:00", "20:00"]],
});
// Wednesday 14 October 2026 at the given NZ time (NZDT, UTC+13).
const wed = (hhmm: string) => new Date(`2026-10-14T${hhmm}:00+13:00`);

describe("openStatus", () => {
  it("says when an open business closes", () => {
    expect(openStatus(pizzeria, wed("12:15"))).toEqual({ open: true, label: "Open now · closes 2pm" });
    expect(openStatus(pizzeria, wed("19:00"))).toEqual({ open: true, label: "Open now · closes 9:30pm" });
  });

  it("says when a closed business next opens: later today, tomorrow, or a weekday", () => {
    expect(openStatus(pizzeria, wed("15:00"))).toEqual({ open: false, label: "Closed · opens 5pm" });
    expect(openStatus(pizzeria, wed("22:00"))).toEqual({ open: false, label: "Closed · opens tomorrow 11:30am" });
    // Sunday night: Monday is closed, so Tuesday.
    expect(openStatus(pizzeria, new Date("2026-10-18T21:00:00+13:00"))).toEqual({ open: false, label: "Closed · opens Tue 11:30am" });
  });

  it("follows a dated exception, such as a public holiday", () => {
    const holiday: BusinessHoursData = { ...pizzeria, exceptions: [{ date: "2026-10-15", closed: true, ranges: [], label: "Staff day" }] };
    expect(openStatus(holiday, wed("22:00"))).toEqual({ open: false, label: "Closed · opens Fri 11:30am" });
  });

  it("says nothing when no hours were given", () => {
    expect(openStatus(week({}), wed("12:00"))).toBeNull();
  });
});
