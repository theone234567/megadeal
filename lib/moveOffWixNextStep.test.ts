import { describe, expect, it } from "vitest";
import { nextStep } from "./moveOffWixNextStep";

/** Moving off Wix's "Your next step": one thing at a time, in the guide's order. */

const ok = (label: string) => ({ label, state: "ok", detail: "" });
const section = (id: string, on: boolean, checks = [ok("Something")]) => ({ id, on, checks });
const page = (sections: ReturnType<typeof section>[], wixPhotosLeft: number | null = 0) => ({ sections, wixPhotosLeft });

describe("the next step", () => {
  it("before the switch: finish setting up, then rehearse, then import", () => {
    expect(nextStep(page([section("database", false, [{ label: "Tables up to date", state: "missing", detail: "Run the setup." }])]))).toMatch(/^Database: Tables up to date/);
    expect(nextStep(page([section("database", false, [{ label: "Data copied from Wix", state: "missing", detail: "" }])]))).toMatch(/Press Rehearse/);
    expect(nextStep(page([section("database", false, [{ label: "Changes paused", state: "warning", detail: "" }])]))).toMatch(/press Import for real/);
  });

  it("after the switch, a waiting database update comes first", () => {
    const db = section("database", true, [{ label: "Tables up to date", state: "missing", detail: "1 update hasn't been applied" }]);
    expect(nextStep(page([db, section("photos", true), section("logins", false)]))).toMatch(/Apply database updates/);
  });

  it("after the switch: photos, then logins, then ending Wix", () => {
    expect(nextStep(page([section("database", true), section("photos", false), section("logins", false)]))).toMatch(/photo storage on/);
    expect(nextStep(page([section("database", true), section("photos", true), section("logins", false)], 4))).toMatch(/Copy photos/);
    expect(nextStep(page([section("database", true), section("photos", true), section("logins", false, [{ label: "Robot check", state: "missing", detail: "Add Turnstile." }])]))).toBe(
      "Business logins: Robot check. Add Turnstile."
    );
    expect(nextStep(page([section("database", true), section("photos", true), section("logins", false)]))).toMatch(/tell Claude to switch them on/);
    expect(nextStep(page([section("database", true), section("photos", true), section("logins", true)]))).toMatch(/end the Wix subscription/);
  });
});
