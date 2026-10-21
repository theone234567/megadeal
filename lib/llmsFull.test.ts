import { describe, expect, it } from "vitest";
import { HELP_FAQ_TEXT } from "./helpFaq";

/** /llms-full.txt: the long reference for AI tools. */
describe("llms-full.txt", () => {
  it("has the company facts, every category and every Help Centre answer", async () => {
    const { GET } = await import("@/app/llms-full.txt/route");
    const res = await GET();
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    const body = await res.text();
    expect(body).toMatch(/^# MegaDeal: full reference/);
    expect(body).toContain("MegaDeal Limited");
    expect(body).toContain("Home & Car: /auckland/home-car");
    for (const { q, a } of HELP_FAQ_TEXT) {
      expect(body).toContain(`### ${q}`);
      expect(body).toContain(a);
    }
  });
});
