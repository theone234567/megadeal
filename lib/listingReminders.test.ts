import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db/testDb";
import type { Sql } from "./db/connection";

process.env.ADMIN_SESSION_SECRET = "test-secret-for-vitest";
const kv = new Map<string, string>();
const sent: { to: string; html: string }[] = [];
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => ({
    get: async (k: string) => kv.get(k) ?? null,
    put: async (k: string, v: string) => void kv.set(k, v),
    delete: async (k: string) => void kv.delete(k),
  }),
}));
vi.mock("./sendEmail", () => ({
  sendTransactionalEmail: async (m: { to: string; html: string }) => (sent.push(m), true),
}));

const { reminderCandidates, sendListingReminders, listingGaps } = await import("./listingReminders");

let db: Sql;
beforeAll(async () => {
  const t = await createTestDb();
  db = { query: async (text, params) => (await t.db.query(text, params as any[])).rows as any };
  const user = async () => {
    const [u] = await db.query<{ id: string }>("insert into auth.users (id) values (gen_random_uuid()) returning id");
    return u.id;
  };
  const add = async (name: string, extra: Record<string, unknown>) => {
    const row: Record<string, unknown> = {
      business_name: name,
      email: `hello@${name.toLowerCase().replace(/\W/g, "")}.co.nz`,
      status: "Pending",
      owner_id: await user(),
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      ...extra,
    };
    const cols = Object.keys(row);
    const vals = Object.values(row);
    await db.query(`insert into public.merchants (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`, vals);
  };
  await add("Half Done Cafe", { phone: "09 123 4567" });
  await add("Finished Spa", { phone: "09 1", address: "1 Main St", legal_business_name: "Finished Ltd", bio: "Nice", photos: JSON.stringify(["https://x/p.jpg"]) });
  await add("Brand New Barber", { created_at: new Date().toISOString() });
  await add("Approved Bistro", { status: "Approved" });
  await add("Test Bistro", { email: "owner+test@gmail.com" });
});

describe("finish-your-listing reminders", () => {
  it("names what's missing in plain words", () => {
    expect(listingGaps({ address: null, phone: "1", legal_business_name: "", bio: "x", photo_count: 0 })).toEqual([
      "your address",
      "your registered business name",
      "a photo",
    ]);
  });

  it("only reminds unfinished, pending businesses that signed up over a day ago", async () => {
    const list = await reminderCandidates(db);
    expect(list.map((c) => c.businessName)).toEqual(["Half Done Cafe"]);
    expect(list[0].missing).toContain("a short description");
  });

  it("sends once, not again within a week, and never more than twice", async () => {
    const first = await sendListingReminders(db, "https://megadeal.co.nz");
    expect(first.sent).toBe(1);
    expect(sent[0].to).toBe("hello@halfdonecafe.co.nz");
    expect(sent[0].html).toContain("https://megadeal.co.nz/portal");
    expect(sent[0].html).toContain("your address");
    expect((await sendListingReminders(db, "https://megadeal.co.nz")).sent).toBe(0);

    const key = [...kv.keys()][0];
    kv.set(key, JSON.stringify({ count: 1, last: new Date(Date.now() - 8 * 86_400_000).toISOString() }));
    expect((await sendListingReminders(db, "https://megadeal.co.nz")).sent).toBe(1);
    kv.set(key, JSON.stringify({ count: 2, last: new Date(Date.now() - 30 * 86_400_000).toISOString() }));
    expect((await reminderCandidates(db))).toEqual([]);
  });
});

describe("a business that unsubscribed", () => {
  it("is never sent a reminder", async () => {
    kv.clear();
    const fresh = await reminderCandidates(db);
    expect(fresh.length).toBeGreaterThan(0);
    kv.set(`biz-email-opt-out:${fresh[0].id}`, new Date().toISOString());
    expect((await reminderCandidates(db)).map((c) => c.id)).not.toContain(fresh[0].id);
  });
});
