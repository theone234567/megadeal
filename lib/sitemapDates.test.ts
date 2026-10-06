import { describe, expect, it } from "vitest";
import { CHANGES_AT_LAUNCH, CONTENT_UPDATED, contentUpdated } from "./sitemapDates";

describe("sitemap dates", () => {
  it("before launch, every page keeps its own date", () => {
    expect(contentUpdated("/advertise/restaurants", false, "2026-11-02")).toBe("2026-10-04");
    expect(contentUpdated("/terms", false, "")).toBe("2026-10-04");
  });

  it("at launch, the pages whose wording switches take the launch date", () => {
    for (const path of CHANGES_AT_LAUNCH) {
      expect(CONTENT_UPDATED[path], path).toBeDefined();
      expect(contentUpdated(path, true, "2026-11-02")).toBe("2026-11-02");
    }
    // Others keep theirs.
    expect(contentUpdated("/privacy", true, "2026-11-02")).toBe("2026-09-27");
  });

  it("launched without a date, or with a malformed or older one, keeps the old dates", () => {
    expect(contentUpdated("/about", true, "")).toBe("2026-09-27");
    expect(contentUpdated("/about", true, "2 Nov 2026")).toBe("2026-09-27");
    expect(contentUpdated("/list-your-business", true, "2026-01-01")).toBe("2026-10-05");
  });

  it("has no date for pages it doesn't list", () => {
    expect(contentUpdated("", true, "2026-11-02")).toBeUndefined();
  });
});
