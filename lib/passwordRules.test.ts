import { describe, expect, it } from "vitest";
import { passwordRuleProblem } from "./passwordRules";
import { INVITE_LINK_HOURS, RESET_LINK_MINUTES } from "./resetLinkTimes";

describe("password rules (T255)", () => {
  const ctx = { email: "sam.lee@kahikatea.co.nz", businessName: "Kahikatea Cafe" };
  it("need 10 characters, no spaces at the ends", () => {
    expect(passwordRuleProblem("short", ctx)).toMatch(/at least 10/);
    expect(passwordRuleProblem(" correct horse battery", ctx)).toMatch(/space/);
    expect(passwordRuleProblem("correct horse battery ", ctx)).toMatch(/space/);
    expect(passwordRuleProblem("correct horse battery", ctx)).toBeNull();
  });

  it("can't be the email address or business name", () => {
    expect(passwordRuleProblem("sam.lee@kahikatea.co.nz", ctx)).toMatch(/email/);
    expect(passwordRuleProblem("SAM.LEE@KAHIKATEA.CO.NZ", ctx)).toMatch(/email/);
    expect(passwordRuleProblem("kahikatea cafe", ctx)).toMatch(/business name/);
    expect(passwordRuleProblem("KahikateaCafe123", ctx)).toMatch(/business name/);
    expect(passwordRuleProblem("kahikatea cafe is the best place", ctx)).toBeNull();
    expect(passwordRuleProblem("anything-else-123", {})).toBeNull();
  });

  it("links last what the emails and page say", () => {
    expect(RESET_LINK_MINUTES).toBe(60);
    expect(INVITE_LINK_HOURS).toBe(72);
  });
});
