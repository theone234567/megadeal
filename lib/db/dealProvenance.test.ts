import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";

/**
 * The database keeps each deal's provenance itself
 * (20261017000000_deal_provenance.sql): when what customers see last
 * changed, and when MegaDeal last approved it, whichever code changed it.
 */

let db: PGlite;
let insert: Awaited<ReturnType<typeof createTestDb>>["insert"];
let merchantId: string;

const one = async <T = Record<string, any>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const times = (id: string) =>
  one<{ content_updated_at: Date; approved_at: Date | null }>("select content_updated_at, approved_at from public.deals where id = $1", [id]);
/** Moves a deal's clock back an hour, so a change shows as a later time. */
const age = (id: string) =>
  db.exec(
    `alter table public.deals disable trigger deals_provenance;
     update public.deals set content_updated_at = content_updated_at - interval '1 hour', approved_at = approved_at - interval '1 hour' where id = '${id}';
     alter table public.deals enable trigger deals_provenance;`
  );

beforeAll(async () => {
  const t = await createTestDb();
  db = t.db;
  insert = t.insert;
  merchantId = await insert("merchants", { email: "owner@bistro.nz", business_name: "Bistro", status: "Approved" });
}, 60_000);
afterAll(async () => {
  await db?.close();
});

async function submittedDeal(): Promise<string> {
  return insert("deals", { merchant_id: merchantId, name: "Two-course dinner", price_now: 49, price_was: 80, category_slug: "food-drink", status: "Pending Approval" });
}

describe("when a deal last changed", () => {
  it("is set when the deal is made, and moves for what customers see, not for view counts", async () => {
    const id = await submittedDeal();
    expect((await times(id)).content_updated_at).toBeInstanceOf(Date);
    expect((await times(id)).approved_at).toBeNull();
    await age(id);
    const before = (await times(id)).content_updated_at.getTime();

    await db.query("update public.deals set view_count = view_count + 1, click_count = click_count + 1 where id = $1", [id]);
    expect((await times(id)).content_updated_at.getTime()).toBe(before);

    await db.query("update public.deals set terms = 'Dine-in only.' where id = $1", [id]);
    expect((await times(id)).content_updated_at.getTime()).toBeGreaterThan(before);
  });
});

describe("when MegaDeal last approved a deal", () => {
  it("is set when a submitted deal goes live", async () => {
    const id = await submittedDeal();
    await db.query("update public.deals set status = 'Live', first_published_at = now(), expires_at = now() + interval '7 days' where id = $1", [id]);
    expect((await times(id)).approved_at).toBeInstanceOf(Date);
  });

  it("moves when an admin changes what a live deal says, not when the business pauses it", async () => {
    const id = await submittedDeal();
    await db.query("update public.deals set status = 'Live', first_published_at = now() where id = $1", [id]);
    await age(id);
    const approved = (await times(id)).approved_at!.getTime();

    await db.query("update public.deals set status = 'Paused', paused_by = 'business' where id = $1", [id]);
    expect((await times(id)).approved_at!.getTime()).toBe(approved);

    await db.query("update public.deals set price_now = 45 where id = $1", [id]);
    expect((await times(id)).approved_at!.getTime()).toBeGreaterThan(approved);
  });

  it("doesn't move when the app writes the same dates back without their microseconds", async () => {
    // The app reads and writes whole rows through JavaScript dates, which
    // keep milliseconds only: a business confirming its deal rewrites the
    // end date it already had.
    const id = await submittedDeal();
    await db.query(
      "update public.deals set status = 'Live', first_published_at = '2026-10-13 06:26:27.353803+00', expires_at = '2026-10-20 06:26:27.353803+00' where id = $1",
      [id]
    );
    await age(id);
    const before = await times(id);
    await db.query(
      "update public.deals set first_published_at = '2026-10-13T06:26:27.353Z', expires_at = '2026-10-20T06:26:27.353Z', merchant_confirmed_at = now() where id = $1",
      [id]
    );
    const after = await times(id);
    expect(after.content_updated_at.getTime()).toBe(before.content_updated_at.getTime());
    expect(after.approved_at!.getTime()).toBe(before.approved_at!.getTime());
  });

  it("isn't moved by a business restarting a deal paused before it first went live", async () => {
    const id = await submittedDeal();
    await db.query("update public.deals set status = 'Paused', paused_by = 'business' where id = $1", [id]);
    await age(id);
    const approved = (await times(id)).approved_at;
    // Paused straight from review counts as reviewed (approved); the
    // business restarting it later starts its clock but isn't a new
    // approval.
    await db.query("update public.deals set status = 'Live', paused_by = null, first_published_at = now(), expires_at = now() + interval '7 days' where id = $1", [id]);
    expect((await times(id)).approved_at?.getTime()).toBe(approved?.getTime());
  });

  it("isn't set by editing a draft", async () => {
    const id = await insert("deals", { merchant_id: merchantId, status: "Draft" });
    await db.query("update public.deals set name = 'Lunch' where id = $1", [id]);
    expect((await times(id)).approved_at).toBeNull();
  });
});

describe("more photos", () => {
  it("count as a change to what customers see, up to four", async () => {
    const id = await submittedDeal();
    await age(id);
    const before = (await times(id)).content_updated_at.getTime();
    await db.query("update public.deals set gallery = '{https://megadeal.co.nz/media/a.jpg}' where id = $1", [id]);
    expect((await times(id)).content_updated_at.getTime()).toBeGreaterThan(before);
    await expect(db.query("update public.deals set gallery = '{a,b,c,d,e}' where id = $1", [id])).rejects.toThrow();
  });
});

describe("tags", () => {
  it("are short lower-case words from a list, a few at most", async () => {
    const id = await submittedDeal();
    await db.query("update public.deals set tags = '{date-night,groups}' where id = $1", [id]);
    await expect(db.query("update public.deals set tags = '{Date Night}' where id = $1", [id])).rejects.toThrow();
    await expect(db.query(`update public.deals set tags = '{${Array.from({ length: 9 }, (_, i) => `t${i}`).join(",")}}' where id = $1`, [id])).rejects.toThrow();
  });
});

describe("when a business was claimed", () => {
  it("is set when its owner's login is first linked, and kept after", async () => {
    const id = await insert("merchants", { email: "new@cafe.nz", business_name: "Cafe", status: "Pending" });
    expect((await one("select claimed_at from public.merchants where id = $1", [id])).claimed_at).toBeNull();
    const [user] = (await db.query<{ id: string }>("insert into auth.users (id) values (gen_random_uuid()) returning id")).rows;
    await db.query("update public.merchants set owner_id = $2 where id = $1", [id, user.id]);
    const claimed = (await one("select claimed_at from public.merchants where id = $1", [id])).claimed_at as Date;
    expect(claimed).toBeInstanceOf(Date);
    await db.query("update public.merchants set bio = 'Hello' where id = $1", [id]);
    expect(((await one("select claimed_at from public.merchants where id = $1", [id])).claimed_at as Date).getTime()).toBe(claimed.getTime());
  });
});
