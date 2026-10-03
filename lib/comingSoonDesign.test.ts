import { describe, expect, it } from "vitest";
import { comingSoonDesign } from "./siteConfig";

describe("comingSoonDesign", () => {
  it("shows V2 only for exactly 'v2'", () => {
    expect(comingSoonDesign("v2")).toBe("v2");
  });
  it("fails closed to the existing page for anything else", () => {
    for (const v of [undefined, "", "V2", " v2", "legacy", "true", "1", "v3"]) expect(comingSoonDesign(v)).toBe("legacy");
  });
});
