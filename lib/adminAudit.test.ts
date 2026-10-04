import { beforeEach, describe, expect, it, vi } from "vitest";

const kv = new Map<string, string>();
let failing = false;
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => ({
    get: async (k: string) => kv.get(k) ?? null,
    put: async (k: string, v: string) => {
      if (failing) throw new Error("KV down");
      kv.set(k, v);
    },
    delete: async () => {},
  }),
}));
const { auditTarget, logAdminAction, readAdminAudit } = await import("./adminAudit");

beforeEach(() => {
  kv.clear();
  failing = false;
});

describe("admin audit log", () => {
  it("keeps entries newest first, with what, to what and how", async () => {
    await logAdminAction({ action: "Signed in", detail: "Password", ip: "1.2.3.4" });
    await logAdminAction({ action: "Deal approved", target: auditTarget("Two coffees", "abcdef123456") });
    const list = await readAdminAudit();
    expect(list.map((e) => e.action)).toEqual(["Deal approved", "Signed in"]);
    expect(list[0].target).toBe("Two coffees (abcdef12…)");
    expect(list[1]).toMatchObject({ detail: "Password", ip: "1.2.3.4" });
    expect(Date.parse(list[0].at)).toBeGreaterThan(0);
  });

  it("keeps the last 500", async () => {
    kv.set("admin-audit:v1", JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ at: "x", action: `old ${i}` }))));
    await logAdminAction({ action: "new" });
    const list = await readAdminAudit();
    expect(list).toHaveLength(500);
    expect(list[0].action).toBe("new");
    expect(list.at(-1)!.action).toBe("old 498");
  });

  it("never throws, so the action it describes still happens", async () => {
    failing = true;
    await expect(logAdminAction({ action: "Deal approved" })).resolves.toBeUndefined();
  });
});
