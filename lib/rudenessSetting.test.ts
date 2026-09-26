import { describe, it, expect } from "vitest";
import { getSiteRudenessCheck, parseRudenessOverride, rudenessCheckApplies } from "./rudenessSetting";

describe("rudeness setting", () => {
  it("a business override beats the site setting", () => {
    expect(rudenessCheckApplies(true, "off")).toBe(false);
    expect(rudenessCheckApplies(false, "on")).toBe(true);
    expect(rudenessCheckApplies(false, "default")).toBe(false);
    expect(rudenessCheckApplies(true, undefined)).toBe(true);
  });

  it("anything unknown means use the site setting", () => {
    expect(parseRudenessOverride("maybe")).toBe("default");
    expect(parseRudenessOverride(null)).toBe("default");
  });

  it("the site setting is on unless explicitly off, including when unreadable", async () => {
    const client = (value?: string, fail = false) => ({
      items: {
        query: () => ({
          eq: () => ({
            limit: () => ({
              find: async () => {
                if (fail) throw new Error("down");
                return { items: value ? [{ value }] : [] };
              },
            }),
          }),
        }),
      },
    });
    expect(await getSiteRudenessCheck(client())).toBe(true);
    expect(await getSiteRudenessCheck(client("off"))).toBe(false);
    expect(await getSiteRudenessCheck(client("on"))).toBe(true);
    expect(await getSiteRudenessCheck(client(undefined, true))).toBe(true);
  });
});
