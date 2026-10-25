import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { businessSuspendedEmail, suspendReasonError } from "./businessStatusEmails";
import { dealResumedEmail, dealRejectedEmail, dealStoppedEmail, dealLiveEmail } from "./dealEmails";
import { emailHtmlToText } from "./emailText";

// T246: suspension and resumed-deal emails, and clean text parts.

describe("business suspended email", () => {
  it("reads as an application not approved when the business was pending", () => {
    const e = businessSuspendedEmail({ from: "Pending", reason: "We couldn't confirm the <b>NZBN</b>.", businessName: "Kai & Co", contactName: "Sam Lee" });
    expect(e.subject).toBe("Your MegaDeal application");
    const text = emailHtmlToText(e.html);
    expect(text).toContain("Hi Sam,");
    expect(text).toContain("Thanks for applying to list Kai & Co on MegaDeal. We're not able to approve it at the moment:");
    expect(text).toContain("We couldn't confirm the <b>NZBN</b>.");
    expect(e.html).not.toContain("<b>NZBN");
  });

  it("says it's suspended, and why, when it was approved", () => {
    const e = businessSuspendedEmail({ from: "Approved", reason: "Deals weren't honoured.", businessName: "Kai & Co" });
    expect(e.subject).toBe("Your MegaDeal account has been suspended");
    expect(emailHtmlToText(e.html)).toContain("We've suspended Kai & Co on MegaDeal, so your listing and deals aren't showing to customers for now:");
  });

  it("needs a real reason", () => {
    expect(suspendReasonError("")).toMatch(/Say why/);
    expect(suspendReasonError("   short   ")).toMatch(/Say why/);
    expect(suspendReasonError("x".repeat(601))).toMatch(/600/);
    expect(suspendReasonError("We couldn't confirm the business.")).toBeNull();
  });
});

describe("deal resumed email", () => {
  it("says the deal is back, until when, and links to it once launched", () => {
    const e = dealResumedEmail("Two brunches", {
      siteUrl: "https://megadeal.co.nz",
      slug: "two-brunches",
      launched: true,
      endsAt: "2026-11-20T08:00:00.000Z",
      isFlash: true,
      businessName: "Harbour Light",
    });
    expect(e.subject).toBe("Your deal is back on: Two brunches");
    const text = emailHtmlToText(e.html);
    expect(text).toContain("MegaDeal has lifted the pause on Two brunches, so customers can see it again. It runs until 20 November");
    expect(text).toContain("NZDT.");
    expect(text).toContain("See your deal: https://megadeal.co.nz/deal/two-brunches");
  });

  it("doesn't promise customers before launch", () => {
    const text = emailHtmlToText(dealResumedEmail("Two brunches", { siteUrl: "https://megadeal.co.nz", launched: false }).html);
    expect(text).not.toContain("customers can see");
    expect(text).toContain("/portal");
  });
});

describe("text parts (T246)", () => {
  it("have no HTML entities left in any business email", () => {
    const site = { siteUrl: "https://megadeal.co.nz", businessName: "Kai & Co", contactName: "Sam" };
    const emails = [
      businessSuspendedEmail({ from: "Pending", reason: "It's “not” ready — sorry.", businessName: "Kai & Co" }),
      businessSuspendedEmail({ from: "Approved", reason: "It's “not” ready — sorry.", businessName: "Kai & Co" }),
      dealResumedEmail("Fish & chips “deal”", { ...site, launched: true, slug: "fish" }),
      dealRejectedEmail("Fish & chips", "It's “unclear”.", { ...site, dealId: "d1" }),
      dealStoppedEmail("Fish & chips", "Paused", "Customer's complaint", site),
      dealLiveEmail("Fish & chips", { ...site, launched: false }),
    ];
    for (const e of emails) expect(emailHtmlToText(e.html)).not.toMatch(/&(#\d+|#x[0-9a-f]+|[a-z]+\d*);/i);
  });
});

// The admin route: no suspension without a reason, and the business is told.
const merchant: Record<string, any> = { _id: "m1", email: "o@example.invalid", businessName: "Ok Cafe", status: "Pending", creditsBalance: 0 };
const writes = vi.fn(async (_c: string, item: any) => item);
const sent: any[] = [];
vi.mock("./adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("./adminAudit", async (orig) => ({ ...(await orig<typeof import("./adminAudit")>()), logAdminAction: async () => {} }));
vi.mock("./sendEmail", () => ({ sendTransactionalEmail: async (m: any) => (sent.push(m), true) }));
vi.mock("./dataClient", () => ({
  createDataClient: () => ({
    items: { get: async () => ({ ...merchant }), update: writes, insert: writes, query: () => ({ eq: () => ({ find: async () => ({ items: [] }) }) }) },
    fetchWithAuth: writes,
  }),
}));

describe("PATCH /api/admin/merchants/[id] to Suspended", () => {
  const call = async (body: unknown) => {
    const { PATCH } = await import("@/app/api/admin/merchants/[id]/route");
    return PATCH(new NextRequest("http://x/api/admin/merchants/m1", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "m1" }) });
  };

  it("is refused without a reason, before anything is written", async () => {
    const res = await call({ status: "Suspended" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("reason_required");
    expect(writes).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it("emails the business once, with the reason", async () => {
    const res = await call({ status: "Suspended", statusReason: "We couldn't confirm this is an Auckland business." });
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "o@example.invalid", subject: "Your MegaDeal application" });
    expect(sent[0].html).toContain("We couldn&#39;t confirm this is an Auckland business.");
  });
});
