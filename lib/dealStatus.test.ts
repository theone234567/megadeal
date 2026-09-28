import { describe, it, expect } from "vitest";
import { allowedDealActions, dealDisplayStatus, hasDealExpired, isPastDeal } from "./dealStatus";

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

describe("dealDisplayStatus", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");
  const past = new Date(now - HOUR).toISOString();
  const future = new Date(now + HOUR).toISOString();

  it("shows a Live or Paused deal whose run is over as Ended", () => {
    expect(dealDisplayStatus({ status: "Live", expiresAt: past }, now)).toBe("Ended");
    expect(dealDisplayStatus({ status: "Paused", expiresAt: past }, now)).toBe("Ended");
    expect(dealDisplayStatus({ status: null, expiresAt: past }, now)).toBe("Ended");
  });

  it("leaves a deal with time left, or with no clock yet, as it is", () => {
    expect(dealDisplayStatus({ status: "Live", expiresAt: future }, now)).toBe("Live");
    expect(dealDisplayStatus({ status: "Pending Approval", expiresAt: null }, now)).toBe("Pending Approval");
    expect(dealDisplayStatus({ status: "Cancelled", expiresAt: past }, now)).toBe("Cancelled");
  });

  it("offers a business nothing to do with an ended deal", () => {
    expect(allowedDealActions("Ended")).toEqual([]);
  });

  it("files ended and cancelled deals as past", () => {
    expect(isPastDeal({ status: "Live", expiresAt: past }, now)).toBe(true);
    expect(isPastDeal({ status: "Cancelled" }, now)).toBe(true);
    expect(isPastDeal({ status: "Live", expiresAt: future }, now)).toBe(false);
    expect(isPastDeal({ status: "Paused", expiresAt: future }, now)).toBe(false);
  });
});
