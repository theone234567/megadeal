import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db/testDb";
import type { Sql } from "./db/connection";

/**
 * The owner hears within the hour when something needs a decision, once
 * per new thing, never about test sign-ups or unfinished listings.
 */

process.env.ADMIN_NOTIFY_EMAIL = "owner@megadeal.co.nz";
const sent: { to: string; subject: string; html: string }[] = [];
let failSend = false;
vi.mock("./sendEmail", () => ({
  sendTransactionalEmail: async (m: { to: string; subject: string; html: string }) => {
    if (failSend) return false;
    sent.push(m);
    return true;
  },
}));

const { alertReviewQueue, reviewQueue } = await import("./reviewQueueAlert");

let db: Sql;
const complete = { phone: "09 123 4567", address: "1 Main St", legal_business_name: "Ltd", bio: "Nice place", photos: JSON.stringify(["https://x/p.jpg"]) };

async function business(name: string, extra: Record<string, unknown> = {}): Promise<string> {
  const [u] = await db.query<{ id: string }>("insert into auth.users (id) values (gen_random_uuid()) returning id");
  const row: Record<string, unknown> = {
    business_name: name,
    email: `hello@${name.toLowerCase().replace(/\W/g, "")}.co.nz`,
    status: "Pending",
    owner_id: u.id,
    ...extra,
  };
  const cols = Object.keys(row);
  const [m] = await db.query<{ id: string }>(
    `insert into public.merchants (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
    Object.values(row),
  );
  return m.id;
}

async function deal(merchantId: string, name: string, extra: Record<string, unknown> = {}): Promise<string> {
  const row: Record<string, unknown> = { merchant_id: merchantId, name, description: "x", category_slug: "food-drink", price_now: 20, price_was: 40, status: "Pending Approval", ...extra };
  const cols = Object.keys(row);
  const [d] = await db.query<{ id: string }>(
    `insert into public.deals (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
    Object.values(row),
  );
  return d.id;
}

let approvedId: string;
beforeAll(async () => {
  const t = await createTestDb();
  db = { query: async (text, params) => (await t.db.query(text, params as any[])).rows as any };
  await business("Ready Bistro", complete);
  await business("Half Done Cafe", { phone: "09 1" });
  await business("Test Bistro", { ...complete, email: "owner+test@gmail.com" });
  approvedId = await business("Approved Spa", { ...complete, status: "Approved" });
  await deal(approvedId, "Two-course dinner");
  await deal(approvedId, "Hidden test deal", { is_test: true });
});

beforeEach(() => {
  sent.length = 0;
  failSend = false;
});

describe("what's waiting for a decision", () => {
  it("is complete listings and submitted deals, never unfinished or test ones", async () => {
    const names = (await reviewQueue(db)).map((i) => `${i.kind}: ${i.name}`);
    expect(names).toEqual(["business: Ready Bistro", "deal: Two-course dinner (Approved Spa)"]);
  });
});

describe("emailing the owner", () => {
  it("sends once, then not again until something new arrives, and names only the new", async () => {
    expect(await alertReviewQueue(db, "https://megadeal.co.nz")).toBe("sent");
    expect(sent[0].to).toBe("owner@megadeal.co.nz");
    expect(sent[0].subject).toBe("MegaDeal: 1 business to approve, 1 deal to review waiting");
    expect(sent[0].html).toContain("Ready Bistro");
    expect(sent[0].html).toContain("https://megadeal.co.nz/admin");

    expect(await alertReviewQueue(db, "https://megadeal.co.nz")).toBe("nothing new");
    expect(sent).toHaveLength(1);

    await db.query("update public.deals set pending_photo_url = 'https://x/new.jpg', pending_photo_at = now() where name = 'Two-course dinner'");
    expect(await alertReviewQueue(db, "https://megadeal.co.nz")).toBe("sent");
    expect(sent[1].subject).toContain("1 new deal photo to approve");
    const newList = sent[1].html.split("New since the last email:")[1];
    expect(newList).toContain("Two-course dinner");
    expect(newList).not.toContain("Ready Bistro");
  });

  it("escapes what businesses typed", async () => {
    await business("<b>Bold</b> Bar", complete);
    await alertReviewQueue(db, "https://megadeal.co.nz");
    expect(sent[0].html).toContain("&lt;b&gt;Bold&lt;/b&gt; Bar");
    expect(sent[0].html).not.toContain("<b>Bold</b>");
  });

  it("tries again next hour when the email didn't go", async () => {
    await deal(approvedId, "Lunch special");
    failSend = true;
    expect(await alertReviewQueue(db, "https://megadeal.co.nz")).toBe("failed");
    failSend = false;
    expect(await alertReviewQueue(db, "https://megadeal.co.nz")).toBe("sent");
    expect(sent[0].html).toContain("Lunch special");
  });

  it("emails again about a deal that comes back for review after being dealt with", async () => {
    await db.query("update public.deals set status = 'Live', slug = 'lunch-special', first_published_at = now(), expires_at = now() + interval '7 days' where name = 'Lunch special'");
    expect(await alertReviewQueue(db, "https://megadeal.co.nz")).toBe("nothing new");
    await db.query("update public.deals set status = 'Pending Approval' where name = 'Lunch special'");
    expect(await alertReviewQueue(db, "https://megadeal.co.nz")).toBe("sent");
  });

  it("does nothing without an owner address", async () => {
    const before = process.env.ADMIN_NOTIFY_EMAIL;
    delete process.env.ADMIN_NOTIFY_EMAIL;
    expect(await alertReviewQueue(db, "https://megadeal.co.nz")).toBe("no address");
    process.env.ADMIN_NOTIFY_EMAIL = before;
  });
});
