import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./db/testDb";
import type { Sql } from "./db/sql";

/**
 * "Email them a set-password link" (lib/loginInvites.ts), driven the way
 * the admin page drives it: batch after batch until there's nothing left
 * to try. Addresses that fail are passed over for an hour; the email
 * service's daily limit stops the run without counting against anyone.
 */

let pglite: PGlite;
let db: Sql;
const kvStore = new Map<string, string>();
const sentTo: string[] = [];
let quotaAfter = Infinity;
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => ({ get: async (k: string) => kvStore.get(k) ?? null, put: async (k: string, v: string) => void kvStore.set(k, v) }),
}));
vi.mock("./passwordResetTokens", () => ({ INVITE_TTL_SECONDS: 7 * 24 * 3600, createPasswordResetToken: async () => "tok" }));
vi.mock("./sendEmail", () => ({
  sendEmail: async ({ to }: { to: string }) => {
    if (sentTo.length >= quotaAfter) return { ok: false, reason: "quota" };
    if (to.startsWith("bad")) return { ok: false };
    sentTo.push(to);
    return { ok: true };
  },
}));

// 12 addresses that can never be sent to, signed up first, then 15 that can.
const BAD = Array.from({ length: 12 }, (_, i) => `bad${i}@example.nz`);
const GOOD = Array.from({ length: 15 }, (_, i) => `good${i}@example.nz`);

/** The admin page's loop (app/admin/move-off-wix, LoginInvites). */
async function pressButton() {
  const { sendLoginInvites } = await import("./loginInvites");
  let sent = 0;
  for (let i = 0; i < 100; i++) {
    const r = await sendLoginInvites(db, "https://megadeal.co.nz");
    sent += r.sent;
    if (r.remaining === 0 || r.quotaReached || (r.sent === 0 && r.failed.length === 0)) return { sent, waiting: r.waiting, quotaReached: r.quotaReached };
  }
  throw new Error("didn't finish");
}

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
  await pglite.exec("alter table auth.users add column email text, add column deleted_at timestamptz");
  let n = 0;
  for (const email of [...BAD, ...GOOD]) {
    await pglite.query(
      `insert into public.merchants (email, business_name, status, category_slug, created_at) values ($1, $2, 'Approved', 'food-drink', now() + ($3 || ' seconds')::interval)`,
      [email, `Business ${email}`, String(n++)]
    );
  }
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});
beforeEach(() => {
  kvStore.clear();
  sentTo.length = 0;
  quotaAfter = Infinity;
});

describe("emailing set-password links", () => {
  it("addresses that fail don't stop everyone after them", async () => {
    const run = await pressButton();
    expect(run.sent).toBe(15);
    expect([...sentTo].sort()).toEqual([...GOOD].sort());
    // And pressing again emails nobody twice; the failed ones wait an hour.
    const again = await pressButton();
    expect(again).toMatchObject({ sent: 0, waiting: 12 });
    expect(sentTo).toHaveLength(15);
  });

  it("stops at the daily sending limit, and carries on another day", async () => {
    quotaAfter = 4;
    const first = await pressButton();
    expect(first).toMatchObject({ sent: 4, quotaReached: true });

    quotaAfter = Infinity;
    const next = await pressButton();
    expect(next.sent).toBe(11);
    expect(new Set(sentTo).size).toBe(15);
    expect(sentTo).toHaveLength(15);
  });

  it("only businesses without a login yet", async () => {
    await pglite.query("insert into auth.users (id, email) values (gen_random_uuid(), 'good0@example.nz')");
    await pressButton();
    expect(sentTo).not.toContain("good0@example.nz");
    expect(sentTo).toHaveLength(14);
    await pglite.query("delete from auth.users");
  });
});
