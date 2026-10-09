import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";

/** Admin > Messages (app/api/admin/contact-messages). */

let pglite: PGlite;
let db: Sql;
let admin = true;
const kv = new Map<string, string>();

vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/authSession", () => ({ fromOwnSite: () => true }));
vi.mock("@/lib/db/connection", () => ({ dataBackend: () => "postgres", withDb: (fn: (db: Sql) => unknown) => fn(db) }));
vi.mock("@/lib/rateLimit", () => ({
  getRateLimitKv: async () => ({ get: async (k: string) => kv.get(k) ?? null, put: async (k: string, v: string) => void kv.set(k, v) }),
}));

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});

const URL_ = "https://megadeal.co.nz/api/admin/contact-messages";
async function list(query = "") {
  const { GET } = await import("@/app/api/admin/contact-messages/route");
  const res = await GET(new NextRequest(URL_ + query));
  return { status: res.status, body: await res.json() };
}
async function markSeen(id: string) {
  const { POST } = await import("@/app/api/admin/contact-messages/route");
  return POST(new NextRequest(URL_, { method: "POST", body: JSON.stringify({ id }) }));
}

describe("the admin's list of contact messages", () => {
  it("shows them newest first, and only to an admin", async () => {
    await db.query(
      `insert into public.contact_messages (name, email, message, created_at) values
         ('Ana', 'ana@example.nz', 'First', now() - interval '1 day'),
         ('Ben', 'ben@example.nz', 'Second <b>line</b>', now() - interval '1 hour')`
    );
    const { status, body } = await list();
    expect(status).toBe(200);
    expect(body.items.map((m: { name: string; message: string }) => [m.name, m.message])).toEqual([
      ["Ben", "Second <b>line</b>"],
      ["Ana", "First"],
    ]);
    admin = false;
    expect((await list()).status).toBe(401);
    expect((await markSeen("1")).status).toBe(401);
    admin = true;
  });

  it("counts the unread ones until the tab has shown them, never one that came in after", async () => {
    expect((await list("?summary=1")).body).toEqual({ unseen: 2 });
    const shown = (await list()).body.items;
    // A message arrives after the tab loaded, before it marks them read.
    await db.query(`insert into public.contact_messages (name, email, message) values ('Cat', 'cat@example.nz', 'Later')`);
    expect((await markSeen(shown[0].id)).status).toBe(200);
    expect((await list("?summary=1")).body).toEqual({ unseen: 1 });
    // An older tab can't make read ones unread again.
    expect((await markSeen(shown[1].id)).status).toBe(200);
    expect((await list("?summary=1")).body).toEqual({ unseen: 1 });
    expect((await markSeen("not a number")).status).toBe(400);
  });
});
