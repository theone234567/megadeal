import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { dealLiveEmail, dealStoppedEmail } from "./dealEmails";

/** The business hears when MegaDeal decides about its deal (app/api/admin/deals/[id]). */

let row: Record<string, any> = {};
const emailed: { to: string; subject: string; html: string }[] = [];
let sendWorks = true;
vi.mock("./adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("./wixAdmin", () => ({ createWixAdminClient: () => ({ items: { get: async () => row, update: async (_c: string, item: any) => item } }) }));
vi.mock("./merchantActivity", () => ({ logMerchantActivity: vi.fn() }));
vi.mock("./indexNowDeal", () => ({ notifyDealChanged: vi.fn() }));
vi.mock("./adminAudit", () => ({ logAdminAction: vi.fn(), auditTarget: (n: string) => n }));
vi.mock("./sendEmail", () => ({ sendTransactionalEmail: async (m: any) => (sendWorks ? (emailed.push(m), true) : false) }));

const { PATCH } = await import("@/app/api/admin/deals/[id]/route");
const save = async (body: unknown) =>
  (await PATCH(new NextRequest("http://x/api/admin/deals/d1", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "d1" }) })).json();

const pending = () => ({ _id: "d1", dealName: "Pizza & a jug", merchantEmail: "owner@cafe.nz", status: "Pending Approval", isFlash: false, requestedDurationMinutes: 7 * 24 * 60 });

beforeEach(() => {
  emailed.length = 0;
  sendWorks = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("emails about a deal", () => {
  it("tells the business the first time its deal is approved, and only then", async () => {
    row = pending();
    await save({ status: "Live" });
    expect(emailed).toHaveLength(1);
    expect(emailed[0]).toMatchObject({ to: "owner@cafe.nz", subject: expect.stringContaining("Pizza & a jug") });

    // Paused and back again: no second "approved" email.
    row = { ...pending(), status: "Paused", everLive: true, expiresAt: new Date(Date.now() + 86_400_000).toISOString() };
    await save({ status: "Live" });
    expect(emailed).toHaveLength(1);
  });

  it("tells the business when an admin pauses or cancels its deal, with the reason", async () => {
    row = { ...pending(), status: "Live", everLive: true };
    await save({ status: "Paused", note: "The photo shows a different dish <b>" });
    expect(emailed[0].subject).toMatch(/was paused/);
    expect(emailed[0].html).toContain("The photo shows a different dish &lt;b&gt;");

    row = pending();
    await save({ status: "Cancelled" });
    expect(emailed[1].subject).toMatch(/was cancelled/);
  });

  it("nothing for other changes, or a deal with no business email", async () => {
    row = { ...pending(), status: "Live", everLive: true };
    await save({ note: "internal note" });
    row = { ...pending(), merchantEmail: "" };
    await save({ status: "Live" });
    expect(emailed).toHaveLength(0);
  });

  it("says so when the email didn't go", async () => {
    sendWorks = false;
    row = pending();
    const res = await save({ status: "Live" });
    expect(res.warnings).toEqual([expect.stringContaining("didn't send")]);
  });
});

describe("the emails themselves", () => {
  it("before launch, says customers see it from launch day", () => {
    expect(dealLiveEmail("Spa day", { launched: false, siteUrl: "https://megadeal.co.nz" }).html).toMatch(/from MegaDeal's launch day/);
    expect(dealLiveEmail("Spa day", { launched: true, siteUrl: "https://megadeal.co.nz" }).html).toMatch(/live on MegaDeal/);
  });

  it("escapes what businesses and admins typed", () => {
    const e = dealStoppedEmail("<script>x</script>", "Paused", null, { siteUrl: "https://megadeal.co.nz" });
    expect(e.html).not.toContain("<script>");
    expect(e.html).not.toContain("The reason");
  });
});
