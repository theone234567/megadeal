import { describe, expect, it } from "vitest";
import { LAUNCH_PROMO, PRELAUNCH_PROMO, currentPromo, promoForCode } from "./promo";

describe("business signup promo", () => {
  it("is 6 months (24 credits) before launch and 3 months (12 credits) after", () => {
    expect(currentPromo(false)).toEqual({ code: "WELCOME6", months: 6, credits: 24 });
    expect(currentPromo(true)).toEqual({ code: "WELCOME3", months: 3, credits: 12 });
  });

  it("before launch accepts only WELCOME6, in any case", () => {
    expect(promoForCode("welcome6 ", false)).toBe(PRELAUNCH_PROMO);
    expect(promoForCode("WELCOME3", false)).toBeNull();
  });

  it("after launch gives the 3-month offer for WELCOME3, and for WELCOME6 typed before launch", () => {
    expect(promoForCode("WELCOME3", true)).toBe(LAUNCH_PROMO);
    expect(promoForCode("WELCOME6", true)).toBe(LAUNCH_PROMO);
  });

  it("leaves anything else (a referral code, nothing) to the caller", () => {
    expect(promoForCode("ABC123", true)).toBeNull();
    expect(promoForCode("", false)).toBeNull();
  });
});
