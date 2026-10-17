import { describe, expect, it } from "vitest";
import { prelaunchAllowanceBlock } from "./prelaunchAllowance";

const NOW = Date.parse("2026-10-17T00:00:00Z");
const later = new Date(NOW + 86_400_000).toISOString();
const earlier = new Date(NOW - 86_400_000).toISOString();

describe("prelaunchAllowanceBlock", () => {
  it("allows the first deal of each type", () => {
    expect(prelaunchAllowanceBlock([], false, NOW)).toBeNull();
    expect(prelaunchAllowanceBlock([{ status: "Live", isFlash: true, expiresAt: later }], false, NOW)).toBeNull();
  });

  it("blocks a second of the same type while one is waiting, live or paused", () => {
    for (const status of ["Pending Approval", "Live", "Paused"]) {
      expect(prelaunchAllowanceBlock([{ status, isFlash: false, expiresAt: later }], false, NOW)).toMatch(/1 Everyday Deal/);
    }
    expect(prelaunchAllowanceBlock([{ status: "Live", isFlash: true, expiresAt: later }], true, NOW)).toMatch(/1 Flash Deal/);
  });

  it("frees the slot once a deal ends or is cancelled, and ignores drafts", () => {
    expect(prelaunchAllowanceBlock([{ status: "Live", isFlash: false, expiresAt: earlier }], false, NOW)).toBeNull();
    expect(prelaunchAllowanceBlock([{ status: "Cancelled", isFlash: false, expiresAt: later }], false, NOW)).toBeNull();
    expect(prelaunchAllowanceBlock([{ status: "Draft", isFlash: false }], false, NOW)).toBeNull();
  });
});
