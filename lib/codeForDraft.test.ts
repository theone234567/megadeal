import { describe, expect, it } from "vitest";
import { codeForDraft } from "./dealCode";

describe("codeForDraft", () => {
  it("uses the business's own valid code, exactly as normalised", () => {
    expect(codeForDraft("summer 20", "MEGA-ABCDE")).toBe("SUMMER-20");
  });
  it("keeps the code a draft already has across saves", () => {
    expect(codeForDraft("", "MEGA-ABCDE")).toBe("MEGA-ABCDE");
    expect(codeForDraft(undefined, "MEGA-ABCDE")).toBe("MEGA-ABCDE");
  });
  it("gives a new draft a generated code", () => {
    expect(codeForDraft("", null)).toMatch(/^MEGA-[A-Z0-9]{5}$/);
  });
  it("never lets a business claim the reserved MEGA- prefix, or keep a half-typed code", () => {
    expect(codeForDraft("MEGA-HACK1", null)).toMatch(/^MEGA-[A-Z0-9]{5}$/);
    expect(codeForDraft("MEGA-HACK1", null)).not.toBe("MEGA-HACK1");
    expect(codeForDraft("A", "MEGA-ABCDE")).toBe("MEGA-ABCDE");
  });
  it("replaces a business's old own code once they clear it", () => {
    expect(codeForDraft("", "SUMMER-20")).toMatch(/^MEGA-[A-Z0-9]{5}$/);
  });
});
