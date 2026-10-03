import { describe, expect, it } from "vitest";
import { matchesStatus, matchesType, parseSavedFilters, statusCounts } from "./portalDealFilters";

const NOW = Date.parse("2026-10-03T00:00:00Z");
const future = "2026-10-10T00:00:00Z";
const past = "2026-10-01T00:00:00Z";
const deals = [
  { status: "Live", expiresAt: future, isFlash: false },
  { status: "Live", expiresAt: future, isFlash: true },
  { status: "Pending Approval", expiresAt: null, isFlash: false },
  { status: "Paused", expiresAt: future, isFlash: false },
  { status: "Live", expiresAt: past, isFlash: false }, // ended: never "Live"
];

describe("portal deal filters", () => {
  it("filters by type, treating a missing flag as Everyday", () => {
    expect(matchesType({ isFlash: true }, "flash")).toBe(true);
    expect(matchesType({ isFlash: null }, "everyday")).toBe(true);
    expect(matchesType({ isFlash: true }, "everyday")).toBe(false);
    expect(matchesType({ isFlash: true }, "all")).toBe(true);
  });

  it("filters by the status the business sees, so an ended deal isn't Live", () => {
    expect(matchesStatus(deals[4], "Live", NOW)).toBe(false);
    expect(matchesStatus(deals[0], "Live", NOW)).toBe(true);
  });

  it("counts each status within a type", () => {
    expect(statusCounts(deals, "all", NOW)).toEqual({ all: 5, Live: 2, "Pending Approval": 1, Paused: 1 });
    expect(statusCounts(deals, "flash", NOW)).toEqual({ all: 1, Live: 1, "Pending Approval": 0, Paused: 0 });
  });

  it("restores only known saved filters", () => {
    expect(parseSavedFilters('{"status":"Paused","type":"flash"}')).toEqual({ status: "Paused", type: "flash" });
    expect(parseSavedFilters('{"status":"Deleted","type":"x"}')).toEqual({ status: "all", type: "all" });
    expect(parseSavedFilters("not json")).toEqual({ status: "all", type: "all" });
    expect(parseSavedFilters(null)).toEqual({ status: "all", type: "all" });
  });
});
