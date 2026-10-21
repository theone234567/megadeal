import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** Admin > Submit all pages to search engines (app/api/admin/seo/indexnow-submit-all). */

let admin = true;
const submitted: string[][] = [];
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/indexNow", () => ({ submitUrlsToIndexNow: async (urls: string[]) => void submitted.push(urls) }));
vi.mock("@/app/sitemap", () => ({
  default: async () => [
    { url: "https://megadeal.co.nz" },
    { url: "https://megadeal.co.nz/developers" },
    { url: "https://megadeal.co.nz/deal/pizza-for-two" },
  ],
}));

const submit = async () => {
  const { POST } = await import("@/app/api/admin/seo/indexnow-submit-all/route");
  return POST(new NextRequest("https://megadeal.co.nz/api/admin/seo/indexnow-submit-all", { method: "POST" }));
};

describe("submitting every page to IndexNow", () => {
  it("sends exactly the sitemap's pages, for admin only", async () => {
    expect(await (await submit()).json()).toEqual({ submitted: 3 });
    expect(submitted[0]).toEqual([
      "https://megadeal.co.nz",
      "https://megadeal.co.nz/developers",
      "https://megadeal.co.nz/deal/pizza-for-two",
    ]);
    admin = false;
    expect((await submit()).status).toBe(401);
    expect(submitted).toHaveLength(1);
  });
});
