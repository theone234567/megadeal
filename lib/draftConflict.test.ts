import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { draftRevisionOf, isDraftConflict } from "./dealDraft";

describe("draft save conflicts", () => {
  it("counts a draft saved before revisions existed as 0", () => {
    expect(draftRevisionOf({})).toBe(0);
    expect(draftRevisionOf({ draftRevision: 3 })).toBe(3);
    expect(draftRevisionOf({ draftRevision: "junk" })).toBe(0);
  });

  it("flags a save based on an older revision, unless forced or sent by an older form", () => {
    expect(isDraftConflict({ draftRevision: 2 }, 2, undefined)).toBe(false);
    expect(isDraftConflict({ draftRevision: 3 }, 2, undefined)).toBe(true);
    expect(isDraftConflict({ draftRevision: 3 }, 2, true)).toBe(false);
    expect(isDraftConflict({ draftRevision: 3 }, undefined, undefined)).toBe(false);
    expect(isDraftConflict({}, 0, undefined)).toBe(false);
  });
});

// The draft route against a fake Wix: two tabs saving the same draft.
let row: Record<string, any> = {};
const update = vi.fn(async (_c: string, item: Record<string, any>) => {
  row = item;
  return item;
});
vi.mock("./memberAuth", () => ({ getVerifiedMember: async () => ({ id: "u1", email: "t@example.com" }) }));
vi.mock("./memberRateLimit", () => ({ memberRateLimited: async () => false, HOUR: 3_600_000 }));
vi.mock("./merchant", () => ({ getOrClaimMerchant: async () => ({ _id: "m1", status: "Approved" }) }));
vi.mock("./wixAdmin", () => ({
  createWixAdminClient: () => ({
    items: {
      get: async () => row,
      update,
      insert: async (_c: string, item: Record<string, any>) => ({ ...item, _id: "new1" }),
      query: () => ({ eq: () => ({ eq: () => ({ find: async () => ({ items: [] }) }) }) }),
    },
  }),
}));

async function save(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/deals/draft/route");
  const res = await POST(
    new NextRequest("http://localhost/api/deals/draft", { method: "POST", body: JSON.stringify(body) })
  );
  return { status: res.status, data: await res.json() };
}

describe("POST /api/deals/draft", () => {
  it("starts a new draft at revision 1", async () => {
    const { status, data } = await save({ draft: { dealName: "Two coffees" } });
    expect(status).toBe(200);
    expect(data.item.draftRevision).toBe(1);
  });

  it("refuses the second tab's save, then lets it keep its version", async () => {
    row = { _id: "d1", merchantEmail: "t@example.com", status: "Draft", dealName: "Two coffees", draftRevision: 1 };
    // Tab A saves on top of revision 1.
    const a = await save({ draftId: "d1", baseRevision: 1, draft: { dealName: "Two coffees for $8" } });
    expect(a.status).toBe(200);
    expect(a.data.item.draftRevision).toBe(2);
    // Tab B still thinks it's on revision 1.
    update.mockClear();
    const b = await save({ draftId: "d1", baseRevision: 1, draft: { dealName: "Three coffees" } });
    expect(b.status).toBe(409);
    expect(b.data.conflict).toBe(true);
    expect(update).not.toHaveBeenCalled();
    expect(row.dealName).toBe("Two coffees for $8");
    // Tab B chooses "keep my version".
    const forced = await save({ draftId: "d1", baseRevision: 1, force: true, draft: { dealName: "Three coffees" } });
    expect(forced.status).toBe(200);
    expect(row.dealName).toBe("Three coffees");
    expect(row.draftRevision).toBe(3);
  });

  it("still accepts a save with no revision (a form opened before this change)", async () => {
    row = { _id: "d1", merchantEmail: "t@example.com", status: "Draft", draftRevision: 5 };
    const { status } = await save({ draftId: "d1", draft: { dealName: "x" } });
    expect(status).toBe(200);
    expect(row.draftRevision).toBe(6);
  });
});
