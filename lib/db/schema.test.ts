import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, PUBLIC, SERVER, type Who } from "./testDb";

/**
 * The Supabase schema (supabase/migrations) loaded into a real, in-process
 * Postgres (lib/db/testDb.ts) and tested from the outside: as the public,
 * as a signed-in business and as the website's server.
 */

const A_USER = "11111111-1111-1111-1111-111111111111";
const B_USER = "22222222-2222-2222-2222-222222222222";

let db: PGlite;
let as: Awaited<ReturnType<typeof createTestDb>>["as"];
let merchantA = "";
let merchantB = "";
let pending = "";

const BUSINESS_A: Who = { role: "authenticated", uid: A_USER };
const BUSINESS_B: Who = { role: "authenticated", uid: B_USER };

/** A complete submitted deal for `merchant`, with overrides. */
async function insertDeal(merchant: string, fields: Record<string, unknown> = {}): Promise<string> {
  const row = {
    merchant_id: merchant,
    slug: `deal-${Math.random().toString(36).slice(2, 10)}`,
    name: "Two-course dinner",
    description: "Mains and dessert",
    category_slug: "food-drink",
    price_now: 49,
    price_was: 80,
    status: "Live",
    ...fields,
  };
  const keys = Object.keys(row);
  const [{ id }] = await as<{ id: string }>(
    SERVER,
    `insert into public.deals (${keys.join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    Object.values(row)
  );
  return id;
}

beforeAll(async () => {
  ({ db, as } = await createTestDb());
  await db.exec(`insert into auth.users (id) values ('${A_USER}'), ('${B_USER}')`);

  const insertMerchant = (email: string, name: string, status: string, owner: string | null, credits = 0) =>
    as<{ id: string }>(
      SERVER,
      `insert into public.merchants (email, business_name, status, owner_id, credits_balance, category_slug)
       values ($1, $2, $3, $4, $5, 'food-drink') returning id`,
      [email, name, status, owner, credits]
    );
  [{ id: merchantA }] = await insertMerchant("owner@harbourbistro.co.nz", "Harbour Bistro", "Approved", A_USER, 10);
  [{ id: merchantB }] = await insertMerchant("hello@glowspa.co.nz", "Glow Spa", "Approved", B_USER, 4);
  [{ id: pending }] = await insertMerchant("new@pending.co.nz", "Not Yet Approved", "Pending", null);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("schema", () => {
  it("has the site's six categories", async () => {
    const rows = await as<{ name: string }>(PUBLIC, "select name from public.categories order by sort_order");
    expect(rows.map((r) => r.name)).toEqual([
      "Food & Drink",
      "Beauty & Spa",
      "Things To Do",
      "Travel & Getaways",
      "Health & Fitness",
      "Home & Car",
    ]);
  });
});

describe("the public", () => {
  it("sees live deals of approved businesses only", async () => {
    const live = await insertDeal(merchantA);
    const paused = await insertDeal(merchantA, { status: "Paused", paused_by: "business" });
    const test = await insertDeal(merchantA, { is_test: true });
    const ended = await insertDeal(merchantA, { expires_at: new Date(Date.now() - 60_000).toISOString() });
    const scheduled = await insertDeal(merchantA, { first_published_at: new Date(Date.now() + 3_600_000).toISOString() });
    const unapproved = await insertDeal(pending);

    const ids = (await as<{ id: string }>(PUBLIC, "select id from public.public_deals")).map((r) => r.id);
    expect(ids).toContain(live);
    for (const hidden of [paused, test, ended, scheduled, unapproved]) expect(ids).not.toContain(hidden);
  });

  it("gets no private columns from the public views", async () => {
    const [deal] = await as(PUBLIC, "select * from public.public_deals limit 1");
    const [business] = await as(PUBLIC, "select * from public.public_businesses limit 1");
    for (const key of ["credits_charged", "status_note", "ai_review", "draft_data", "merchant_id"]) expect(deal).not.toHaveProperty(key);
    for (const key of ["email", "credits_balance", "contact_phone", "nzbn", "owner_id", "coupon_code", "status"]) {
      expect(business).not.toHaveProperty(key);
    }
  });

  it("sees approved businesses only", async () => {
    const names = (await as<{ business_name: string }>(PUBLIC, "select business_name from public.public_businesses")).map((r) => r.business_name);
    expect(names).toEqual(expect.arrayContaining(["Harbour Bistro", "Glow Spa"]));
    expect(names).not.toContain("Not Yet Approved");
  });

  it("can't read the tables behind the views", async () => {
    for (const table of ["merchants", "deals", "merchant_activity", "email_signups", "contact_messages", "api_usage_counters"]) {
      await expect(as(PUBLIC, `select * from public.${table}`), table).rejects.toThrow(/permission denied/);
    }
  });

  it("can't write anything", async () => {
    await expect(as(PUBLIC, "insert into public.contact_messages (name, email, message) values ('x', 'x@y.nz', 'hi')")).rejects.toThrow(
      /permission denied/
    );
    await expect(as(PUBLIC, "update public.categories set name = 'Hacked'")).rejects.toThrow(/permission denied/);
    await expect(as(PUBLIC, "select public.grant_credits($1, 100)", [merchantA])).rejects.toThrow(/permission denied/);
  });
});

describe("a signed-in business", () => {
  it("reads only its own business", async () => {
    const rows = await as<{ id: string }>(BUSINESS_A, "select id from public.merchants");
    expect(rows.map((r) => r.id)).toEqual([merchantA]);
  });

  it("reads only its own deals, drafts included", async () => {
    const mine = await insertDeal(merchantA, { status: "Draft", slug: null });
    const theirs = await insertDeal(merchantB);
    const ids = (await as<{ id: string }>(BUSINESS_A, "select id from public.deals")).map((r) => r.id);
    expect(ids).toContain(mine);
    expect(ids).not.toContain(theirs);
  });

  it("reads only its own activity", async () => {
    await as(SERVER, "insert into public.merchant_activity (merchant_id, type, amount, description) values ($1, 'credit', 5, 'Top-up'), ($2, 'credit', 3, 'Top-up')", [
      merchantA,
      merchantB,
    ]);
    const rows = await as<{ merchant_id: string }>(BUSINESS_B, "select merchant_id from public.merchant_activity");
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((r) => r.merchant_id))).toEqual(new Set([merchantB]));
  });

  it("can't change anything directly, even its own record", async () => {
    await expect(as(BUSINESS_A, "update public.merchants set credits_balance = 9999 where id = $1", [merchantA])).rejects.toThrow(
      /permission denied/
    );
    await expect(as(BUSINESS_A, "update public.merchants set status = 'Approved' where id = $1", [pending])).rejects.toThrow(
      /permission denied/
    );
    await expect(as(BUSINESS_A, "update public.deals set status = 'Live' where merchant_id = $1", [merchantA])).rejects.toThrow(
      /permission denied/
    );
    await expect(as(BUSINESS_A, "delete from public.deals where merchant_id = $1", [merchantB])).rejects.toThrow(/permission denied/);
  });

  it("can't call the credit functions", async () => {
    await expect(as(BUSINESS_A, "select public.grant_credits($1, 100)", [merchantA])).rejects.toThrow(/permission denied/);
    await expect(as(BUSINESS_A, "select public.debit_credits($1, 1)", [merchantB])).rejects.toThrow(/permission denied/);
  });

  it("sees nothing when signed in to an account with no business", async () => {
    const stranger = { role: "authenticated" as const, uid: "33333333-3333-3333-3333-333333333333" };
    expect(await as(stranger, "select * from public.merchants")).toEqual([]);
    expect(await as(stranger, "select * from public.deals")).toEqual([]);
  });
});

describe("credits", () => {
  const balance = async (id: string) =>
    (await as<{ credits_balance: number }>(SERVER, "select credits_balance from public.merchants where id = $1", [id]))[0].credits_balance;

  it("can't go below zero, even by a direct update", async () => {
    await expect(as(SERVER, "update public.merchants set credits_balance = -1 where id = $1", [merchantB])).rejects.toThrow(/check constraint/);
  });

  it("are only taken when there are enough, and never twice", async () => {
    const start = await balance(merchantB);
    const first = await as<{ debit_credits: number | null }>(SERVER, "select public.debit_credits($1, $2)", [merchantB, start]);
    expect(first[0].debit_credits).toBe(0);
    const second = await as<{ debit_credits: number | null }>(SERVER, "select public.debit_credits($1, 1)", [merchantB]);
    expect(second[0].debit_credits).toBeNull();
    expect(await balance(merchantB)).toBe(0);
  });

  it("refuse zero or negative amounts", async () => {
    const before = await balance(merchantA);
    for (const amount of [0, -5]) {
      expect((await as<{ debit_credits: number | null }>(SERVER, "select public.debit_credits($1, $2)", [merchantA, amount]))[0].debit_credits).toBeNull();
      expect((await as<{ grant_credits: number | null }>(SERVER, "select public.grant_credits($1, $2)", [merchantA, amount]))[0].grant_credits).toBeNull();
    }
    expect(await balance(merchantA)).toBe(before);
  });

  it("are added by grant_credits", async () => {
    const before = await balance(merchantA);
    const [{ grant_credits }] = await as<{ grant_credits: number }>(SERVER, "select public.grant_credits($1, 4)", [merchantA]);
    expect(grant_credits).toBe(before + 4);
  });
});

describe("data rules", () => {
  it("refuses links that aren't plain http(s)", async () => {
    for (const url of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.nz", "https://exa mple.com"]) {
      await expect(as(SERVER, "update public.merchants set website = $1 where id = $2", [url, merchantA]), url).rejects.toThrow(/check constraint/);
      await expect(insertDeal(merchantA, { photo_url: url }), url).rejects.toThrow(/check constraint/);
    }
    await as(SERVER, "update public.merchants set website = 'https://harbourbistro.co.nz' where id = $1", [merchantA]);
  });

  it("needs a deal customers can see to be complete, but not a draft or one being submitted", async () => {
    await expect(insertDeal(merchantA, { status: "Live", slug: null })).rejects.toThrow(/deals_public_complete/);
    await expect(insertDeal(merchantA, { status: "Paused", paused_by: "business", category_slug: null })).rejects.toThrow(/deals_public_complete/);
    await expect(insertDeal(merchantA, { status: "Pending Approval", slug: null })).resolves.toBeTruthy();
    await expect(insertDeal(merchantA, { status: "Draft", slug: null, name: "", price_now: null, category_slug: null })).resolves.toBeTruthy();
  });

  it("refuses an original price below the deal price, and unknown statuses and categories", async () => {
    await expect(insertDeal(merchantA, { price_now: 50, price_was: 40 })).rejects.toThrow(/deals_was_not_below_now/);
    await expect(insertDeal(merchantA, { status: "Approved" })).rejects.toThrow(/check constraint/);
    await expect(insertDeal(merchantA, { category_slug: "gambling" })).rejects.toThrow(/foreign key/);
  });

  it("records who paused a deal, and only for paused deals", async () => {
    await expect(insertDeal(merchantA, { status: "Paused" })).rejects.toThrow(/deals_paused_by_only_when_paused/);
    await expect(insertDeal(merchantA, { status: "Live", paused_by: "admin" })).rejects.toThrow(/deals_paused_by_only_when_paused/);
    await expect(insertDeal(merchantA, { status: "Paused", paused_by: "admin" })).resolves.toBeTruthy();
  });

  it("allows one business per email address, whatever its capitals", async () => {
    await expect(
      as(SERVER, "insert into public.merchants (email, business_name) values ('OWNER@HarbourBistro.co.nz', 'Copycat')")
    ).rejects.toThrow(/merchants_email_key/);
  });

  it("allows one launch-update sign-up per address and audience", async () => {
    await as(SERVER, "insert into public.email_signups (email, audience) values ('fan@example.co.nz', 'customer')");
    await as(SERVER, "insert into public.email_signups (email, audience) values ('fan@example.co.nz', 'merchant')");
    await expect(as(SERVER, "insert into public.email_signups (email, audience) values ('Fan@Example.co.nz', 'customer')")).rejects.toThrow(
      /email_signups_email_audience_key/
    );
  });

  it("keeps a deal's business when the business would be deleted", async () => {
    await insertDeal(merchantB);
    await expect(as(SERVER, "delete from public.merchants where id = $1", [merchantB])).rejects.toThrow(/foreign key/);
  });
});

describe("counters", () => {
  it("count the named deal events and refuse anything else", async () => {
    const deal = await insertDeal(merchantA);
    await as(SERVER, "select public.increment_deal_counter($1, 'view')", [deal]);
    await as(SERVER, "select public.increment_deal_counter($1, 'view')", [deal]);
    await as(SERVER, "select public.increment_deal_counter($1, 'code_copy')", [deal]);
    const [row] = await as(SERVER, "select view_count, code_copy_count from public.deals where id = $1", [deal]);
    expect(row).toEqual({ view_count: 2, code_copy_count: 1 });
    await expect(as(SERVER, "select public.increment_deal_counter($1, 'credits_balance')", [deal])).rejects.toThrow(/unknown deal counter/);
  });

  it("stop an outside API at its daily limit", async () => {
    const day = "2026-10-06";
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const [{ use_api_allowance }] = await as<{ use_api_allowance: boolean }>(SERVER, "select public.use_api_allowance('places', 3, $1)", [day]);
      results.push(use_api_allowance);
    }
    expect(results).toEqual([true, true, true, false]);
  });
});
