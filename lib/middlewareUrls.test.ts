import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

/** Addresses no page can answer (middleware.ts): a plain 404, never a server error. */

describe("a broken address", () => {
  it("with percent-encoding that can't be decoded is not found, not an error", async () => {
    const { middleware } = await import("@/middleware");
    for (const path of ["/deal/%E0%A4%A", "/business/%E0%A4%A", "/auckland/%E0%A4%A", "/%ZZ"]) {
      const res = await middleware(new NextRequest(`https://megadeal.co.nz${path}`));
      expect(res?.status, path).toBe(404);
      expect(res?.headers.get("x-robots-tag")).toBe("noindex");
    }
  });

  it("but well-formed ones carry on as before", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(new NextRequest("https://megadeal.co.nz/category/Food%20%26%20Drink"));
    expect(res?.status).toBe(308);
  });
});
