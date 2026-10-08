import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** The hourly database check (app/api/cron/watch): one email when it stops answering, one when it's back. */

let dbUp = true;
const kv = new Map<string, string>();
const emailed: { to: string; subject: string; html: string }[] = [];
vi.mock("@/lib/db/connection", () => ({
  dataBackend: () => process.env.DATA_BACKEND ?? "wix",
  withDb: async () => {
    if (!dbUp) throw new Error("connect ECONNREFUSED db.internal:5432 user=postgres");
    return [{ "?column?": 1 }];
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  getRateLimitKv: async () => ({ get: async (k: string) => kv.get(k) ?? null, put: async (k: string, v: string) => void kv.set(k, v) }),
}));
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async (m: { to: string; subject: string; html: string }) => (emailed.push(m), true) }));

async function run(secret = "s3cret") {
  const { POST } = await import("@/app/api/cron/watch/route");
  const res = await POST(new NextRequest("https://megadeal.co.nz/api/cron/watch", { method: "POST", headers: { authorization: `Bearer ${secret}` } }));
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.stubEnv("DATA_BACKEND", "postgres");
  vi.stubEnv("ADMIN_NOTIFY_EMAIL", "nick@megadeal.co.nz");
  vi.spyOn(console, "error").mockImplementation(() => {});
  dbUp = true;
  kv.clear();
  emailed.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const runNow = async () => {
  const p = run();
  await vi.runAllTimersAsync();
  return p;
};

describe("the hourly database check", () => {
  it("only answers the scheduler, and does nothing while the data is in Wix", async () => {
    expect((await run("a-guess")).status).toBe(401);
    vi.stubEnv("DATA_BACKEND", "wix");
    expect((await run()).body.skipped).toBeTruthy();
    expect(emailed).toHaveLength(0);
  });

  it("answers the site's own scheduler without CRON_SECRET, and no one else", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await run("a-guess")).status).toBe(503);
    const { internalCallToken } = await import("@/lib/internalCall");
    const own = internalCallToken();
    expect((await run("a-guess")).status).toBe(503);
    const p = run(own);
    await vi.runAllTimersAsync();
    expect((await p).body).toEqual({ database: "up" });
    // With CRON_SECRET set, both it and the site's own password work.
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await run("a-guess")).status).toBe(401);
    const q = run(own);
    await vi.runAllTimersAsync();
    expect((await q).status).toBe(200);
  });

  it("emails once when the database stops answering, and once when it's back", async () => {
    expect((await runNow()).body).toEqual({ database: "up" });
    expect(emailed).toHaveLength(0);

    dbUp = false;
    expect((await runNow()).status).toBe(503);
    expect((await runNow()).status).toBe(503); // still down: no second email
    expect(emailed.map((e) => e.subject)).toEqual(["MegaDeal: the database isn't answering"]);
    expect(emailed[0].to).toBe("nick@megadeal.co.nz");
    expect(emailed[0].html).not.toContain("db.internal");

    dbUp = true;
    expect((await runNow()).body).toEqual({ database: "up" });
    await runNow();
    expect(emailed.map((e) => e.subject)).toEqual(["MegaDeal: the database isn't answering", "MegaDeal: the database is answering again"]);
  });

  it("one blip isn't an outage: it tries again before emailing", async () => {
    let calls = 0;
    // Fails the first time only.
    const conn = await import("@/lib/db/connection");
    const spy = vi.spyOn(conn, "withDb").mockImplementation((async () => {
      calls++;
      if (calls === 1) throw new Error("blip");
      return [];
    }) as any);
    expect((await runNow()).body).toEqual({ database: "up" });
    expect(calls).toBe(2);
    expect(emailed).toHaveLength(0);
    spy.mockRestore();
  });
});
