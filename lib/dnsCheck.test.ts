import { describe, expect, it } from "vitest";
import { dmarcPolicy } from "./dnsCheck";
import { buildChecklist, type LaunchFacts } from "./launchChecklist";

describe("DMARC policy from DNS", () => {
  it("reads the policy, or none for a record without one", () => {
    expect(dmarcPolicy(["v=DMARC1; p=none; rua=mailto:x@example.com"])).toBe("none");
    expect(dmarcPolicy(["v=spf1 -all", "v=DMARC1;p=quarantine"])).toBe("quarantine");
    expect(dmarcPolicy(["v=DMARC1; p=REJECT"])).toBe("reject");
    expect(dmarcPolicy(["v=DMARC1; rua=mailto:x@example.com"])).toBe("none");
    expect(dmarcPolicy([])).toBeNull();
  });

  it("shows report-only DMARC as a warning, enforced as done", () => {
    const base = { launched: false, offWix: null, backup: { ok: true, detail: "" }, accountEmails: { problem: null, lastSentAt: null }, turnstile: true, twoFactor: true, aiReview: true, notifyEmail: true, withoutLogin: 0, testBusinesses: [], approvedBusinesses: 0, draftDeals: 0, liveDeals: 0, verifiedSubscribers: 0, ticks: {} } as LaunchFacts;
    const state = (emailDns: LaunchFacts["emailDns"]) =>
      buildChecklist({ ...base, emailDns }).flatMap((s) => s.items).find((i) => i.id === "email-policy")!.state;
    expect(state({ dmarcPolicy: "none", spf: true })).toBe("warning");
    expect(state({ dmarcPolicy: "quarantine", spf: true })).toBe("done");
    expect(state({ dmarcPolicy: null, spf: true })).toBe("todo");
    expect(state(null)).toBe("info");
  });
});
