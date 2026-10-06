import { describe, expect, it } from "vitest";
import { addressHash, announcementHtml, bodyToHtml, businessRecipients, CAMPAIGN_RE, parseSentList, sentListKey, subscriberRecipients } from "./announcement";

const row = (o: Record<string, unknown>) => ({ audience: "customer", verified: true, unsubscribed: false, unsubscribeToken: "tok", ...o });

describe("who gets the announcement", () => {
  it("only confirmed, still-subscribed people of that audience, each address once", () => {
    const list = subscriberRecipients(
      [
        row({ email: "Ana@Example.nz", unsubscribeToken: "a1" }),
        row({ email: "ana@example.nz", unsubscribeToken: "a2" }), // same person, other casing
        row({ email: "ben@example.nz", verified: false }), // never confirmed
        row({ email: "dan@example.nz", audience: "merchant" }), // other list
        row({ email: "not-an-address" }),
      ],
      "customer"
    );
    expect(list.map((r) => [r.email, r.unsubscribeToken])).toEqual([["ana@example.nz", "a1"]]);
  });

  it("keeps the row of someone whose link can't be read back, so the sender can give them one", () => {
    // MegaDeal's own database stores only a fingerprint of the token.
    const [r] = subscriberRecipients([row({ _id: "x1", email: "fin@example.nz", unsubscribeToken: null })], "customer");
    expect(r.unsubscribeToken).toBeUndefined();
    expect(r.row?._id).toBe("x1");
  });

  it("an unsubscribe on any row for an address takes them off", () => {
    const list = subscriberRecipients(
      [row({ email: "eve@example.nz" }), row({ email: "EVE@example.nz", unsubscribed: true })],
      "customer"
    );
    expect(list).toEqual([]);
  });

  it("approved businesses only, each address once", () => {
    const list = businessRecipients([
      { email: "owner@bistro.nz", status: "Approved", businessName: "Bistro" },
      { email: "OWNER@bistro.nz", status: "Approved", businessName: "Bistro again" },
      { email: "new@spa.nz", status: "Pending" },
      { email: "gone@bar.nz", status: "Suspended" },
    ]);
    expect(list).toEqual([{ email: "owner@bistro.nz", name: "Bistro" }]);
  });
});

describe("the email", () => {
  it("escapes what the admin typed and keeps the paragraphs", () => {
    expect(bodyToHtml("Hello <b>there</b>\n\nSecond & last")).toBe(
      '<p style="margin:0 0 16px;">Hello &lt;b&gt;there&lt;/b&gt;</p><p style="margin:0 0 16px;">Second &amp; last</p>'
    );
  });

  it("subscribers get their unsubscribe link and why they're getting it; businesses get no unsubscribe", () => {
    const sub = announcementHtml({ audience: "customers", body: "Hi", siteUrl: "https://megadeal.co.nz", unsubscribeUrl: "https://megadeal.co.nz/api/email-signup/unsubscribe?token=abc" });
    expect(sub).toContain('href="https://megadeal.co.nz/api/email-signup/unsubscribe?token=abc"');
    expect(sub).toContain("signed up for MegaDeal deal alerts");
    expect(sub).toContain('href="https://megadeal.co.nz/"');
    const biz = announcementHtml({ audience: "businesses", body: "Hi", siteUrl: "https://megadeal.co.nz/" });
    expect(biz).not.toContain("Unsubscribe");
    expect(biz).toContain('href="https://megadeal.co.nz/portal"');
  });

  it("keeps who was sent it per announcement and audience, as fingerprints rather than addresses", () => {
    expect(addressHash(" Ana@Example.nz")).toBe(addressHash("ana@example.nz"));
    expect(addressHash("ana@example.nz")).not.toContain("ana");
    expect(sentListKey("launch", "customers")).not.toBe(sentListKey("launch", "waitlist"));
    expect(parseSentList(JSON.stringify([addressHash("ana@example.nz")])).has(addressHash("ana@example.nz"))).toBe(true);
    expect(parseSentList("not json").size).toBe(0);
    expect(parseSentList(null).size).toBe(0);
    expect(CAMPAIGN_RE.test("launch")).toBe(true);
    expect(CAMPAIGN_RE.test("Launch Day!")).toBe(false);
  });
});
