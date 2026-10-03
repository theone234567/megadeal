import { describe, expect, it } from "vitest";
import {
  emptySchedule,
  formatBusinessHoursLines,
  formatExceptionLine,
  hoursKnown,
  isOpenNow,
  nzToday,
  parseBusinessHours,
  serializeBusinessHours,
  toSpecialOpeningHoursSpecification,
  upcomingExceptions,
  type BusinessHoursData,
} from "./businessHours";

// Thu 18 Dec 2026, 10:00 in Auckland (NZDT, UTC+13) = Wed 17 Dec 21:00 UTC.
const NOW = new Date("2026-12-17T21:00:00Z");
const weekdays9to5 = (): BusinessHoursData => ({
  schedule: emptySchedule().map((d) =>
    ["Sat", "Sun"].includes(d.day) ? d : { ...d, closed: false, ranges: [{ open: "09:00", close: "17:00" }] },
  ),
});

describe("hours exceptions", () => {
  it("knows NZ today across the date line", () => {
    expect(nzToday(NOW)).toBe("2026-12-18");
  });

  it("round-trips exceptions and drops bad ones", () => {
    const data = {
      ...weekdays9to5(),
      exceptions: [
        { date: "2026-12-25", closed: true, ranges: [], label: "Christmas Day" },
        { date: "25/12/2026", closed: true, ranges: [] },
        { date: "2026-12-31", closed: "no", ranges: [] },
      ],
    };
    const back = parseBusinessHours(JSON.stringify(data))!;
    expect(back.exceptions).toEqual([{ date: "2026-12-25", closed: true, ranges: [], label: "Christmas Day" }]);
    expect(parseBusinessHours(serializeBusinessHours(weekdays9to5()))!.exceptions).toBeUndefined();
  });

  it("follows today's exception for Open now", () => {
    const base = weekdays9to5();
    expect(isOpenNow(base, NOW)).toBe(true);
    expect(isOpenNow({ ...base, exceptions: [{ date: "2026-12-18", closed: true, ranges: [] }] }, NOW)).toBe(false);
    expect(
      isOpenNow({ ...base, exceptions: [{ date: "2026-12-18", closed: false, ranges: [{ open: "11:00", close: "14:00" }] }] }, NOW),
    ).toBe(false);
    expect(isOpenNow({ ...base, exceptions: [{ date: "2026-12-19", closed: true, ranges: [] }] }, NOW)).toBe(true);
  });

  it("shows only upcoming exceptions, soonest first, worded plainly", () => {
    const data: BusinessHoursData = {
      ...weekdays9to5(),
      exceptions: [
        { date: "2027-01-02", closed: false, ranges: [{ open: "10:00", close: "14:00" }] },
        { date: "2026-12-25", closed: true, ranges: [], label: "Christmas Day" },
        { date: "2026-12-01", closed: true, ranges: [] },
        { date: "2027-06-01", closed: true, ranges: [] },
      ],
    };
    expect(upcomingExceptions(data, NOW).map((e) => e.date)).toEqual(["2026-12-25", "2027-01-02"]);
    const lines = formatBusinessHoursLines(data, NOW);
    expect(lines.slice(-2)).toEqual(["Fri 25 Dec (Christmas Day): Closed", "Sat 2 Jan: 10am–2pm"]);
    expect(formatExceptionLine({ date: "2026-12-26", closed: true, ranges: [] })).toBe("Sat 26 Dec: Closed");
  });

  it("gives Google the upcoming special hours", () => {
    const data: BusinessHoursData = {
      ...weekdays9to5(),
      exceptions: [{ date: "2026-12-25", closed: true, ranges: [] }],
    };
    expect(toSpecialOpeningHoursSpecification(data, NOW)).toEqual([
      { "@type": "OpeningHoursSpecification", validFrom: "2026-12-25", validThrough: "2026-12-25", opens: "00:00", closes: "00:00" },
    ]);
  });

  it("treats a schedule with no open day as unknown, not closed every day", () => {
    const none: BusinessHoursData = { schedule: emptySchedule() };
    expect(hoursKnown(none)).toBe(false);
    expect(formatBusinessHoursLines(none, NOW)).toEqual([]);
    expect(formatBusinessHoursLines({ ...none, notes: "By appointment" }, NOW)).toEqual(["By appointment"]);
    expect(hoursKnown(weekdays9to5())).toBe(true);
  });
});
