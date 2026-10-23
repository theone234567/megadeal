import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { dealEndedEmail, dealLiveEmail, dealStoppedEmail } from "./dealEmails";

/** The business hears when MegaDeal decides about its deal (app/api/admin/deals/[id]). */

let row: Record<string, any> = {};
const emailed: { to: string; subject: string; html: string }[] = [];
let sendWorks = true;
vi.mock("./adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("./dataClient", () => ({ createDataClient: () => ({ items: { get: async () => row, update: async (_c: string, item: any) => item } }) }));
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

  it("greets the business and says when a live deal ends", () => {
    const e = dealLiveEmail("Spa day", { launched: true, siteUrl: "https://megadeal.co.nz", businessName: "Kowhai <Spa>", endsAt: "2026-11-20T10:00:00Z" });
    expect(e.html).toContain("Hi Kowhai &lt;Spa&gt;,");
    expect(e.html).toContain("It runs until 20 November.");
    expect(dealLiveEmail("Spa day", { launched: true, siteUrl: "https://megadeal.co.nz" }).html).toContain("Hi there,");
  });
});

describe("deal ended email", () => {
  const opts = { businessName: "Harbour <b>Light</b>", siteUrl: "https://megadeal.co.nz/", stopUrl: "https://megadeal.co.nz/stop-emails?m=x&s=y" };
  const deal = { id: "0b9c7c1e-0000-4000-8000-000000000001", name: "Two <i>brunches</i>", endedAt: "2026-10-22T10:00:00Z", views: 124, codeCopies: 1 };

  it("names the deal, links straight to running it again, and offers an unsubscribe", () => {
    const { subject, html } = dealEndedEmail(deal, opts);
    expect(subject).toBe("Two <i>brunches</i> ended with 124 views. Run it again?");
    expect(dealEndedEmail({ ...deal, views: 4 }, opts).subject).toBe("Your deal has ended: Two <i>brunches</i>");
    expect(html).toContain('href="https://megadeal.co.nz/portal/new-deal"');
    expect(html).toContain('href="https://megadeal.co.nz/portal/new-deal?duplicate=0b9c7c1e-0000-4000-8000-000000000001"');
    expect(html).toContain(opts.stopUrl);
    expect(html).toContain("22 October");
  });

  it("escapes what the business typed", () => {
    const { html } = dealEndedEmail(deal, opts);
    expect(html).not.toContain("<i>brunches");
    expect(html).not.toContain("<b>Light");
    expect(html).toContain("Two &lt;i&gt;brunches&lt;/i&gt;");
  });

  it("says what running it again costs", () => {
    expect(dealEndedEmail(deal, opts).html).not.toContain("credits;");
    expect(dealEndedEmail(deal, { ...opts, cost: { kind: "prelaunch" } }).html).toContain("It's free before launch: you can run 1 Everyday Deal and 1 Flash Deal at a time.");
    expect(dealEndedEmail(deal, { ...opts, cost: { kind: "credits", cost: 30, balance: 150 } }).html).toContain("You have 150 credits; running it again takes 30.");
    expect(dealEndedEmail(deal, { ...opts, cost: { kind: "credits", cost: 30, balance: 10 } }).html).toContain("Running it again takes 30 credits, and you have 10.");
    expect(dealEndedEmail(deal, { ...opts, cost: { kind: "credits", cost: 0, balance: 0 } }).html).toContain("Running another deal is free at the moment.");
  });

  it("gives the numbers when there are any, in plain English", () => {
    expect(dealEndedEmail(deal, opts).html).toContain("viewed it 124 times and copied its code 1 time.");
    expect(dealEndedEmail({ ...deal, codeCopies: 0 }, opts).html).toContain("viewed it 124 times.");
    expect(dealEndedEmail({ ...deal, views: 0, codeCopies: 0 }, opts).html).not.toContain("viewed it");
  });
});
