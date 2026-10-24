import { describe, expect, it } from "vitest";
import { rejectMessage, rejectedReason } from "./dealRejectRules";
import { matchesDealStatusFilter } from "./adminDealFilters";
import { dealRejectedEmail, dealStoppedEmail } from "./dealEmails";

/** Rejecting a deal (T242): what the business reads, and where it shows. */

const rejected = (reason: string, extra: object = {}) => ({
  status: "Cancelled",
  contentHistory: [{ event: "rejected", by: "admin", reason }, { event: "sent-back", reason: "an earlier round" }],
  ...extra,
});

describe("the reason", () => {
  it("is the ticked reasons, then the note", () => {
    expect(rejectMessage(["photo", "other"], "  Please use your own   photo. ")).toBe("The photo isn't suitable. Please use your own photo.");
    expect(rejectMessage([], "Just the note here.")).toBe("Just the note here.");
  });

  it("is read from the latest moderation entry, only on a cancelled deal", () => {
    expect(rejectedReason(rejected("Too dear."))).toBe("Too dear.");
    expect(rejectedReason(rejected("Too dear.", { status: "Live" }))).toBeNull();
    // Cancelled by the business, or by an admin without rejecting: no reason.
    expect(rejectedReason({ status: "Cancelled", contentHistory: [{ event: "sent-back", reason: "x" }] })).toBeNull();
    expect(rejectedReason({ status: "Cancelled" })).toBeNull();
  });
});

describe("Admin > Deals filter", () => {
  it("tells rejected apart from other cancelled deals", () => {
    expect(matchesDealStatusFilter(rejected("x"), "rejected")).toBe(true);
    expect(matchesDealStatusFilter(rejected("x"), "cancelled")).toBe(false);
    expect(matchesDealStatusFilter({ status: "Cancelled" }, "cancelled")).toBe(true);
    expect(matchesDealStatusFilter({ status: "Pending Approval" }, "pending")).toBe(true);
    expect(matchesDealStatusFilter({ status: "Live" }, "all")).toBe(true);
  });
});

describe("emails", () => {
  const opts = { siteUrl: "https://megadeal.co.nz", dealId: "d1", contactName: "Sam Lee" };
  it("a rejection: this reason only, credits, and a new deal from this one", () => {
    const e = dealRejectedEmail("Scone & coffee", "The photo <isn't> suitable.", { ...opts, creditsReturned: 2 });
    expect(e.subject).toBe("Your deal “Scone & coffee” wasn't approved");
    expect(e.html).toContain("Hi Sam");
    expect(e.html).toContain("The photo &lt;isn&#39;t&gt; suitable.");
    expect(e.html).toContain("The 2 credits it used have been returned.");
    expect(e.html).toContain("/portal/new-deal?duplicate=d1");
    expect(e.html).not.toContain("taken off");
    expect(dealRejectedEmail("Scone", "Reason here.", { ...opts, wasLive: true }).html).toContain("so it's been taken off MegaDeal");
  });

  it("a cancel before it went live says so, not 'at the moment'", () => {
    const never = dealStoppedEmail("Scone", "Cancelled", null, { siteUrl: opts.siteUrl, neverLive: true });
    expect(never.html).toContain("<strong>Scone</strong> before it went live.");
    expect(never.html).not.toMatch(/at the moment/);
    expect(dealStoppedEmail("Scone", "Cancelled", null, { siteUrl: opts.siteUrl }).html).toContain("so customers can't see it at the moment");
  });
});
