import { describe, expect, it } from "vitest";
import { MIN_COUNT_TO_SHOW, shownStats } from "./publicStats";

describe("shownStats", () => {
  it("shows a counter from 60", () => {
    expect(MIN_COUNT_TO_SHOW).toBe(60);
    expect(shownStats({ merchantCount: 60, waitlistCount: 250 })).toEqual({ merchantCount: 60, waitlistCount: 250 });
  });

  it("hides each counter on its own until it reaches 60", () => {
    expect(shownStats({ merchantCount: 59, waitlistCount: 250 })).toEqual({ merchantCount: 0, waitlistCount: 250 });
    expect(shownStats({ merchantCount: 80, waitlistCount: 12 })).toEqual({ merchantCount: 80, waitlistCount: 0 });
  });

  it("shows nothing when neither has, or the counts couldn't be read", () => {
    expect(shownStats({ merchantCount: 33, waitlistCount: 59 })).toBeNull();
    expect(shownStats(null)).toBeNull();
  });
});
