import { describe, expect, it } from "vitest";
import { DEAL_EVENT_FIELD, dealActionCounts, isDealEvent } from "./dealEvents";

describe("deal events", () => {
  it("accepts only known events, not prototype keys", () => {
    for (const e of ["view", "click", "copy", "website", "call", "email", "directions"]) expect(isDealEvent(e)).toBe(true);
    for (const e of ["purchase", "toString", "__proto__", "constructor", "", 1, null, undefined]) expect(isDealEvent(e)).toBe(false);
  });

  it("maps each event to its own counter, keeping the original two", () => {
    expect(DEAL_EVENT_FIELD.view).toBe("viewCount");
    expect(DEAL_EVENT_FIELD.click).toBe("clickCount");
    expect(new Set(Object.values(DEAL_EVENT_FIELD)).size).toBe(Object.keys(DEAL_EVENT_FIELD).length);
  });

  it("lists only non-zero action counts, worded for the business", () => {
    expect(dealActionCounts({ viewCount: 9, clickCount: 3 })).toEqual([]);
    expect(
      dealActionCounts({ codeCopyCount: 2, callClickCount: 1, emailClickCount: 0, directionsClickCount: "x", websiteClickCount: -3 }),
    ).toEqual([
      { action: "copy", count: 2, label: "2 codes copied or shown" },
      { action: "call", count: 1, label: "1 call tap" },
    ]);
  });
});
