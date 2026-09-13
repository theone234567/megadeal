import { describe, it, expect } from "vitest";
import { isDealLive } from "./dealVisibility";

const HOUR = 3_600_000;

describe("isDealLive", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");

  it("shows a live deal that hasn't expired", () => {
    expect(isDealLive({ status: "Live", expiresAt: new Date(now + HOUR).toISOString() }, now)).toBe(
      true
    );
  });

  it("hides a deal that is not yet approved", () => {
    expect(isDealLive({ status: "Pending Approval", expiresAt: null }, now)).toBe(false);
  });

  it("hides paused, cancelled and draft deals", () => {
    for (const status of ["Paused", "Cancelled", "Draft"] as const) {
      expect(isDealLive({ status, expiresAt: null }, now)).toBe(false);
    }
  });

  it("hides a live deal once it has expired", () => {
    expect(isDealLive({ status: "Live", expiresAt: new Date(now - 1).toISOString() }, now)).toBe(
      false
    );
  });

  it("treats a missing status as live — the hazard, pinned deliberately", () => {
    // This is not an endorsement, it is a tripwire. A null status reads as
    // live, which is why a Wix Stores product whose Deals row is missing
    // used to publish itself with no approval and no owner, and why
    // deleting a Deals row in the Wix dashboard republished its product.
    //
    // The storefront now refuses any product without a Deals row, so
    // nothing reaches this function in that state. If that rule is ever
    // relaxed, this test is the reminder that the fallback is "publish".
    expect(isDealLive({ status: null, expiresAt: null }, now)).toBe(true);
  });
});
