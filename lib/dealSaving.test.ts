import { describe, it, expect } from "vitest";
import { dealSaving } from "./dealSaving";

describe("dealSaving", () => {
  it("returns the difference", () => {
    expect(dealSaving(90, 45)).toBe(45);
    expect(dealSaving(900, 630)).toBe(270);
  });

  it("rounds away float noise so whole dollars stay whole", () => {
    // 89.99 - 44.99 is 45.000000000000006 unrounded, which formats as
    // "$45.00" instead of "$45".
    expect(dealSaving(89.99, 44.99)).toBe(45);
    expect(dealSaving(19.99, 12.49)).toBe(7.5);
  });

  it("claims nothing when there is nothing to claim", () => {
    expect(dealSaving(45, 45)).toBeNull();
    expect(dealSaving(45, 90)).toBeNull();
    expect(dealSaving(0, 0)).toBeNull();
  });

  it("survives missing or broken numbers", () => {
    expect(dealSaving(NaN, 10)).toBeNull();
    expect(dealSaving(10, NaN)).toBeNull();
    expect(dealSaving(Infinity, 10)).toBeNull();
  });
});
