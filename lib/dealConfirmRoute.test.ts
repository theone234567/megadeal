import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** POST /api/deals/[id]/confirm ("Still running as listed") against a fake
 *  data client: who may confirm what, and that it changes nothing else. */

let member: { id: string; email: string } | null = { id: "u1", email: "owner@bistro.nz" };
let row: Record<string, any> | null = null;
let columnExists = true;
const update = vi.fn(async (_c: string, item: Record<string, any>) => {
  const saved = { ...item };
  if (!columnExists) delete saved.merchantConfirmedAt;
  return saved;
});
vi.mock("./memberAuth", () => ({ getVerifiedMember: async () => member }));
vi.mock("./memberRateLimit", () => ({ memberRateLimited: async () => false, HOUR: 3_600_000 }));
vi.mock("./dataClient", () => ({ createDataClient: () => ({ items: { get: async () => row, update } }) }));

const live = () => ({
  _id: "d1",
  merchantEmail: "Owner@Bistro.nz",
  status: "Live",
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  dealName: "Two-course dinner",
  priceNow: 49,
});

async function confirm(id = "d1") {
  const { POST } = await import("@/app/api/deals/[id]/confirm/route");
  const res = await POST(new NextRequest(`http://localhost/api/deals/${id}/confirm`, { method: "POST" }), { params: Promise.resolve({ id }) });
  return { status: res.status, data: await res.json() };
}

beforeEach(() => {
  member = { id: "u1", email: "owner@bistro.nz" };
  row = live();
  columnExists = true;
  update.mockClear();
});

describe("confirming a deal is still running", () => {
  it("records the time on the business's own live deal, and nothing else", async () => {
    const before = { ...row };
    const { status, data } = await confirm();
    expect(status).toBe(200);
    expect(Date.parse(data.item.merchantConfirmedAt)).toBeGreaterThan(Date.now() - 5000);
    const { merchantConfirmedAt: _m, ...rest } = update.mock.calls[0][1];
    expect(rest).toEqual(before);
  });

  it("needs a signed-in business that owns the deal", async () => {
    member = null;
    expect((await confirm()).status).toBe(401);
    member = { id: "u2", email: "someone@else.nz" };
    expect((await confirm()).status).toBe(403);
    row = null;
    expect((await confirm()).status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("only for a deal that's live now", async () => {
    for (const r of [
      { ...live(), status: "Paused" },
      { ...live(), status: "Pending Approval" },
      { ...live(), expiresAt: new Date(Date.now() - 1000).toISOString() },
    ]) {
      row = r;
      expect((await confirm()).status).toBe(409);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("says so, rather than pretend, before the database update adds the field", async () => {
    columnExists = false;
    expect((await confirm()).status).toBe(503);
  });
});
