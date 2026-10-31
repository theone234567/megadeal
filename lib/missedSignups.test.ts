import { beforeEach, describe, expect, it, vi } from "vitest";

/** Businesses whose sign-up code couldn't be sent (lib/missedSignups.ts). */

vi.mock("server-only", () => ({}));
const kv = new Map<string, string>();
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => ({
    get: async (k: string) => kv.get(k) ?? null,
    put: async (k: string, v: string) => void kv.set(k, v),
    delete: async (k: string) => void kv.delete(k),
  }),
}));

const { currentMissed, forgetMissedSignup, missedSignups, noteMissedSignup, withMissed, withoutMissed } = await import("./missedSignups");

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-31T01:34:00Z");

beforeEach(() => kv.clear());

describe("the missed sign-ups list", () => {
  it("puts the newest first, and an address only once", () => {
    let list = withMissed([], "a@shop.nz", now - 60_000);
    list = withMissed(list, "b@shop.nz", now - 30_000);
    list = withMissed(list, "A@Shop.nz", now);
    expect(list.map((m) => m.email)).toEqual(["A@Shop.nz", "b@shop.nz"]);
  });

  it("drops anything older than 30 days", () => {
    const list = [
      { email: "old@shop.nz", at: new Date(now - 31 * DAY).toISOString() },
      { email: "new@shop.nz", at: new Date(now - DAY).toISOString() },
    ];
    expect(currentMissed(list, now).map((m) => m.email)).toEqual(["new@shop.nz"]);
  });

  it("keeps at most 50, so made-up addresses can't grow it", () => {
    let list: { email: string; at: string }[] = [];
    for (let i = 0; i < 60; i++) list = withMissed(list, `x${i}@shop.nz`, now + i);
    expect(list).toHaveLength(50);
    expect(list[0].email).toBe("x59@shop.nz");
  });

  it("removes an address whatever its case", () => {
    expect(withoutMissed([{ email: "Owner@Cafe.nz", at: new Date(now).toISOString() }], "owner@cafe.nz")).toEqual([]);
  });

  it("is kept until the business signs up after all, or the admin marks it done", async () => {
    await noteMissedSignup("owner@cafe.nz");
    await noteMissedSignup("spa@spa.nz");
    expect((await missedSignups()).map((m) => m.email)).toEqual(["spa@spa.nz", "owner@cafe.nz"]);
    await forgetMissedSignup("OWNER@cafe.nz");
    expect((await missedSignups()).map((m) => m.email)).toEqual(["spa@spa.nz"]);
    await forgetMissedSignup("spa@spa.nz");
    expect(await missedSignups()).toEqual([]);
    expect(kv.size).toBe(0);
  });

  it("reads a damaged entry as an empty list", async () => {
    kv.set("auth:signup:missed", "not json");
    expect(await missedSignups()).toEqual([]);
    kv.set("auth:signup:missed", JSON.stringify({ email: "x" }));
    expect(await missedSignups()).toEqual([]);
  });
});
