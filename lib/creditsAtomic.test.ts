import { describe, expect, it } from "vitest";
import { debitCreditsIfAvailable, setFieldsIf } from "./creditsAtomic";

/** A stand-in for Wix Data: applies a patch only if the item matches the
 *  condition (as Wix does, atomically), else fails the request. Options
 *  let a test break it in the ways the real thing could. */
function fakeWix(
  items: Record<string, Record<string, any>>,
  opts: { ignoreCondition?: boolean; failWrites?: boolean } = {},
) {
  const requests: any[] = [];
  const matches = (item: Record<string, any>, filter: Record<string, any>) =>
    Object.entries(filter).every(([field, cond]) => {
      const v = item[field];
      if ("$gte" in cond) return typeof v === "number" && v >= cond.$gte;
      if ("$eq" in cond) return v === cond.$eq;
      throw new Error("unsupported filter");
    });
  const client = {
    async fetchWithAuth(url: string, init: { body: string }) {
      const body = JSON.parse(init.body);
      requests.push(body);
      await Promise.resolve(); // let concurrent callers interleave
      const id = url.split("/").pop()!;
      const item = items[id];
      if (opts.failWrites) return { ok: false, status: 500, json: async () => ({}), text: async () => "" };
      if (!item || (!opts.ignoreCondition && body.condition && !matches(item, body.condition.filter))) {
        // What Wix returns: 428, "WDE0193: Update condition not met."
        return { ok: false, status: item ? 428 : 404, json: async () => ({}), text: async () => "" };
      }
      for (const m of body.patch.fieldModifications) {
        if (m.action === "INCREMENT_FIELD") item[m.fieldPath] = (item[m.fieldPath] ?? 0) + m.incrementFieldOptions.value;
        if (m.action === "SET_FIELD") item[m.fieldPath] = m.setFieldOptions.value;
      }
      return { ok: true, status: 200, json: async () => ({ dataItem: { id, data: { ...item } } }), text: async () => "" };
    },
    items: { get: async (_c: string, id: string) => (items[id] ? { ...items[id] } : null) },
  };
  return { client, items, requests };
}

describe("debitCreditsIfAvailable", () => {
  it("takes the credits when the balance covers them, conditionally", async () => {
    const w = fakeWix({ m1: { creditsBalance: 5 } });
    expect(await debitCreditsIfAvailable(w.client, "m1", 4)).toBe("debited");
    expect(w.items.m1.creditsBalance).toBe(1);
    expect(w.requests[0].condition).toEqual({ filter: { creditsBalance: { $gte: 4 } } });
  });

  it("takes nothing when the balance is short", async () => {
    const w = fakeWix({ m1: { creditsBalance: 3 } });
    expect(await debitCreditsIfAvailable(w.client, "m1", 4)).toBe("insufficient");
    expect(w.items.m1.creditsBalance).toBe(3);
  });

  it("two submissions at once can't overdraw the wallet", async () => {
    const w = fakeWix({ m1: { creditsBalance: 4 } });
    const results = await Promise.all([
      debitCreditsIfAvailable(w.client, "m1", 4),
      debitCreditsIfAvailable(w.client, "m1", 4),
    ]);
    expect(results.sort()).toEqual(["debited", "insufficient"]);
    expect(w.items.m1.creditsBalance).toBe(0);
  });

  it("puts the credits back if the condition was ever ignored", async () => {
    const w = fakeWix({ m1: { creditsBalance: 2 } }, { ignoreCondition: true });
    expect(await debitCreditsIfAvailable(w.client, "m1", 4)).toBe("insufficient");
    expect(w.items.m1.creditsBalance).toBe(2);
  });

  it("reports a failed write with enough balance as an error, not a shortfall", async () => {
    const w = fakeWix({ m1: { creditsBalance: 10 } }, { failWrites: true });
    expect(await debitCreditsIfAvailable(w.client, "m1", 4)).toBe("error");
    expect(w.items.m1.creditsBalance).toBe(10);
  });

  it("treats a missing balance as no credits", async () => {
    const w = fakeWix({ m1: {} });
    expect(await debitCreditsIfAvailable(w.client, "m1", 1)).toBe("insufficient");
  });
});

describe("setFieldsIf", () => {
  it("withdrawing twice at once refunds once", async () => {
    const w = fakeWix({ d1: { status: "Pending Approval" } });
    const claim = () =>
      setFieldsIf(w.client, "Deals", "d1", { status: "Cancelled", creditRefunded: true }, { status: { $eq: "Pending Approval" } });
    const [a, b] = await Promise.all([claim(), claim()]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(w.items.d1).toEqual({ status: "Cancelled", creditRefunded: true });
  });

  it("submitting the same draft twice at once claims it once", async () => {
    const w = fakeWix({ d1: { status: "Draft" } });
    const claim = () => setFieldsIf(w.client, "Deals", "d1", { status: "Pending Approval" }, { status: { $eq: "Draft" } });
    const results = await Promise.all([claim(), claim()]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("returns null without throwing when the item no longer matches", async () => {
    const w = fakeWix({ d1: { status: "Live" } });
    expect(await setFieldsIf(w.client, "Deals", "d1", { status: "Cancelled" }, { status: { $eq: "Pending Approval" } })).toBeNull();
    expect(w.items.d1.status).toBe("Live");
  });
});
