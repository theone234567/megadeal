import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";

/** Admin > Messages (app/api/admin/contact-messages). */

let pglite: PGlite;
let db: Sql;
let admin = true;

vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/db/connection", () => ({ dataBackend: () => "postgres", withDb: (fn: (db: Sql) => unknown) => fn(db) }));

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});

async function list() {
  const { GET } = await import("@/app/api/admin/contact-messages/route");
  const res = await GET(new NextRequest("https://megadeal.co.nz/api/admin/contact-messages"));
  return { status: res.status, body: await res.json() };
}

describe("the admin's list of contact messages", () => {
  it("shows them newest first, and only to an admin", async () => {
    await db.query(
      `insert into public.contact_messages (name, email, message, created_at) values
         ('Ana', 'ana@example.nz', 'First', now() - interval '1 day'),
         ('Ben', 'ben@example.nz', 'Second <b>line</b>', now())`
    );
    const { status, body } = await list();
    expect(status).toBe(200);
    expect(body.items.map((m: { name: string; message: string }) => [m.name, m.message])).toEqual([
      ["Ben", "Second <b>line</b>"],
      ["Ana", "First"],
    ]);
    admin = false;
    expect((await list()).status).toBe(401);
  });
});
