import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** Security audit of 10 Oct 2026, finding 7. */

const SITE = "https://megadeal.co.nz";
const TOKEN = "b".repeat(64);

// A stand-in for the EmailSignups collection whose writes can be made to fail.
let rows: Record<string, any>[] = [];
let failWrites = 0;
vi.mock("@/lib/dataClient", () => ({
  createDataClient: () => ({
    items: {
      query: () => {
        const filters: [string, unknown][] = [];
        const q = {
          eq: (k: string, v: unknown) => (filters.push([k, v]), q),
          find: async () => ({ items: rows.filter((r) => filters.every(([k, v]) => r[k] === v)) }),
        };
        return q;
      },
      update: async (_c: string, item: Record<string, any>) => {
        if (failWrites > 0) {
          failWrites--;
          throw new Error("write failed");
        }
        const i = rows.findIndex((r) => r._id === item._id);
        rows[i] = { ...item };
        return item;
      },
    },
  }),
}));
vi.mock("@/lib/queryAll", () => ({
  queryAllByEmail: async (_q: unknown, email: string) => rows.filter((r) => r.email === email),
}));

const signups = await import("./emailSignups");

beforeEach(() => {
  failWrites = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("unsubscribing never reports success it didn't achieve", () => {
  beforeEach(() => {
    rows = [
      { _id: "1", email: "a@example.com", unsubscribeToken: TOKEN, unsubscribed: false },
      { _id: "2", email: "a@example.com", unsubscribeToken: "other", unsubscribed: false },
    ];
  });

  it("succeeds when every row is saved, retrying a write once", async () => {
    failWrites = 1;
    expect(await signups.unsubscribeEmailSignupByToken(TOKEN)).toBe(true);
    expect(rows.every((r) => r.unsubscribed)).toBe(true);
  });

  it("reports failure when a row couldn't be saved", async () => {
    failWrites = 10;
    expect(await signups.unsubscribeEmailSignupByToken(TOKEN)).toBe(false);
  });
});

describe("confirming a deal-alert sign-up", () => {
  it("works with a fresh link, not with one over two weeks old", async () => {
    rows = [{ _id: "1", email: "a@example.com", verifyToken: TOKEN, verified: false, verifySentAt: new Date().toISOString() }];
    expect(await signups.verifyEmailSignupByToken(TOKEN)).toBe(true);
    rows = [{ _id: "1", email: "a@example.com", verifyToken: TOKEN, verified: false, verifySentAt: new Date(Date.now() - 15 * 86_400_000).toISOString() }];
    expect(await signups.verifyEmailSignupByToken(TOKEN)).toBe(false);
  });

  it("opening the link (or a mail scanner opening it) doesn't confirm; the button does", async () => {
    rows = [{ _id: "1", email: "a@example.com", verifyToken: TOKEN, verified: false, verifySentAt: new Date().toISOString() }];
    const { GET, POST } = await import("@/app/api/email-signup/verify/route");
    const opened = await GET(new NextRequest(`${SITE}/api/email-signup/verify?token=${TOKEN}`));
    expect(opened.headers.get("location")).toBe(`${SITE}/confirm-subscription`);
    expect(opened.headers.get("set-cookie") ?? "").toMatch(/subscribe_token=b{64}.*HttpOnly/i);
    expect(rows[0].verified).toBe(false);
    const pressed = await POST(
      new NextRequest(`${SITE}/api/email-signup/verify`, { method: "POST", headers: { cookie: `subscribe_token=${TOKEN}` } }),
    );
    expect(pressed.headers.get("location")).toBe(`${SITE}/subscribed?ok=1`);
    expect(rows[0].verified).toBe(true);
  });
});
