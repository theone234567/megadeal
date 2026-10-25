import { describe, expect, it } from "vitest";
import { OPEN_ALL_DAY, businessHoursError, emptySchedule, formatRange, openStatus, serializeBusinessHours, type BusinessHoursData, type Day } from "./businessHours";

/** Opening hours at the awkward times (T243, T200), on a fixed clock. */

function hours(days: Partial<Record<Day, [string, string][]>>): BusinessHoursData {
  return {
    schedule: emptySchedule().map((d) => (days[d.day] ? { day: d.day, closed: false, ranges: days[d.day]!.map(([open, close]) => ({ open, close })) } : d)),
  };
}
const at = (iso: string) => new Date(iso);
const label = (data: BusinessHoursData, iso: string) => openStatus(data, at(iso))?.label;

describe("the open-now line (one helper for the business and deal pages)", () => {
  // Kowhai Corner Cafe, Saturday 24 Oct 2026 (NZDT, UTC+13): open 7am–4pm Sat and Sun.
  const cafe = hours({ Sat: [["07:00", "16:00"]], Sun: [["07:00", "16:00"]], Mon: [["07:00", "16:00"]] });
  it("reads right through a Saturday", () => {
    expect(label(cafe, "2026-10-23T17:00:00Z")).toBe("Opens 7am today"); // 6:00am
    expect(label(cafe, "2026-10-23T23:00:00Z")).toBe("Open now · closes 4pm"); // noon
    expect(label(cafe, "2026-10-24T03:01:00Z")).toBe("Closed now · opens 7am tomorrow"); // 4:01pm
    expect(label(cafe, "2026-10-24T04:32:00Z")).toBe("Closed now · opens 7am tomorrow"); // 5:32pm, the case reported
  });

  it("says closed today, and when it next opens", () => {
    const weekdays = hours({ Mon: [["07:00", "16:00"]], Tue: [["07:00", "16:00"]] });
    expect(label(weekdays, "2026-10-24T23:00:00Z")).toBe("Closed today · opens 7am tomorrow"); // Sunday noon
    expect(label(weekdays, "2026-10-23T23:00:00Z")).toBe("Closed today · opens Mon 7am"); // Saturday noon
  });

  it("between lunch and dinner", () => {
    const split = hours({ Sat: [["11:30", "14:00"], ["17:30", "21:00"]] });
    expect(label(split, "2026-10-24T02:00:00Z")).toBe("Closed now · opens 5:30pm today"); // 3pm
  });

  it("is open in the midnight hour (12:30am)", () => {
    const allDay = hours({ Sun: [["00:00", "24:00"]] });
    expect(label(allDay, "2026-10-24T11:30:00Z")).toBe("Open 24 hours"); // Sun 12:30am
    const bar = hours({ Sat: [["17:00", "02:00"]] });
    expect(label(bar, "2026-10-24T11:30:00Z")).toBe("Open now · closes 2am"); // Sun 12:30am, from Saturday
    expect(label(bar, "2026-10-24T12:00:00Z")).toBe("Open now · closes 2am"); // Sun 1am
  });

  it("steps days by the calendar across daylight saving", () => {
    // Clocks go forward on Sun 27 Sep 2026. Sat 26 Sep 11:30pm NZST is 11:30 UTC.
    const sundayOnly = hours({ Sat: [["09:00", "17:00"]], Sun: [["10:00", "14:00"]] });
    expect(label(sundayOnly, "2026-09-26T11:30:00Z")).toBe("Closed now · opens 10am tomorrow");
    // Clocks go back on Sun 5 Apr 2026. Sun 12:30am NZDT is Sat 11:30 UTC.
    const mondays = hours({ Mon: [["09:00", "17:00"]] });
    expect(label(mondays, "2026-04-04T11:30:00Z")).toBe("Closed today · opens 9am tomorrow");
  });

  it("says nothing for hours nobody gave", () => {
    expect(openStatus({ schedule: emptySchedule() }, at("2026-10-24T00:00:00Z"))).toBeNull();
  });
});

describe("how a range reads", () => {
  it("uses midnight, noon, next day and open 24 hours", () => {
    expect(formatRange({ open: "17:00", close: "02:00" })).toBe("5pm–2am (next day)");
    expect(formatRange({ open: "12:00", close: "00:00" })).toBe("noon–midnight");
    expect(formatRange(OPEN_ALL_DAY)).toBe("Open 24 hours");
  });
});

describe("hours sent by a business (server check)", () => {
  const ok = serializeBusinessHours(hours({ Mon: [["09:00", "17:00"]], Fri: [["17:00", "02:00"]], Sun: [["00:00", "24:00"]] }));
  it("accepts real hours, empty, and plain text from before the editor", () => {
    expect(businessHoursError(ok)).toBeNull();
    expect(businessHoursError("")).toBeNull();
    expect(businessHoursError("Mon–Fri 9–5, weekends by appointment")).toBeNull();
  });
  it("refuses junk, bad times and too many ranges", () => {
    expect(businessHoursError('{"schedule": "x"}')).toMatch(/couldn't be read/);
    expect(businessHoursError(serializeBusinessHours(hours({ Mon: [["25:00", "17:00"]] })))).toMatch(/Monday/);
    expect(businessHoursError(serializeBusinessHours(hours({ Tue: [["09:00", "09:00"]] })))).toMatch(/Tuesday/);
    expect(businessHoursError(serializeBusinessHours(hours({ Wed: [["07:00", "09:00"], ["10:00", "12:00"], ["13:00", "15:00"], ["16:00", "18:00"]] })))).toMatch(/more than 3/);
    expect(businessHoursError(42)).toMatch(/couldn't be read/);
  });
});

describe("a Flash deal that runs past closing (T200)", () => {
  const cafe = hours({ Sat: [["07:00", "16:00"]] });
  it("says by how much, from the hours it starts in", async () => {
    const { minutesPastClosing, describePastClosing } = await import("./businessHours");
    // Kowhai: started 2:39pm Saturday for 3 hours, so ends 5:39pm; closes 4pm.
    const past = minutesPastClosing(cafe, at("2026-10-24T01:39:00Z"), 180);
    expect(past).toMatchObject({ minutes: 99, closes: "4pm" });
    expect(describePastClosing(past!.minutes)).toBe("1 h 39 m");
    expect(minutesPastClosing(cafe, at("2026-10-24T01:39:00Z"), 60)).toBeNull(); // ends 3:39pm
    expect(minutesPastClosing(cafe, at("2026-10-24T05:00:00Z"), 60)).toBeNull(); // starts after closing
    const bar = hours({ Sat: [["17:00", "02:00"]] });
    expect(minutesPastClosing(bar, at("2026-10-24T12:00:00Z"), 120)).toMatchObject({ minutes: 60, closes: "2am" }); // 1am + 2h
  });
});
