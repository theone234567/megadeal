import { describe, it, expect } from "vitest";
import { hasDealExpired } from "./dealStatus";

const HOUR = 3_600_000;

describe("hasDealExpired", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");

  it("is false for a deadline still in the future", () => {
    expect(hasDealExpired(new Date(now + HOUR).toISOString(), now)).toBe(false);
  });

  it("is true once the deadline has passed", () => {
    expect(hasDealExpired(new Date(now - HOUR).toISOString(), now)).toBe(true);
  });

  it("is true exactly at the deadline", () => {
    expect(hasDealExpired(new Date(now).toISOString(), now)).toBe(true);
  });

  it("is false when there's no deadline at all", () => {
    expect(hasDealExpired(null, now)).toBe(false);
    expect(hasDealExpired(undefined, now)).toBe(false);
  });
});
