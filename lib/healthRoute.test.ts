import { afterEach, describe, expect, it, vi } from "vitest";

/** /api/health: what an uptime monitor sees. */

let dbWorks = true;
vi.mock("@/lib/db/connection", async (orig) => ({
  ...(await orig<typeof import("./db/connection")>()),
  withDb: async () => {
    if (!dbWorks) throw new Error("connect ECONNREFUSED db.secret-host:5432");
    return [{ "?column?": 1 }];
  },
}));

let bucket: { head: () => Promise<null> } | null = null;
vi.mock("@/lib/photoStorage", () => ({ photoBucket: async () => bucket }));

const { GET, HEAD } = await import("@/app/api/health/route");
const req = () => new Request("https://megadeal.co.nz/api/health");

afterEach(() => {
  vi.unstubAllEnvs();
  dbWorks = true;
  bucket = null;
  vi.restoreAllMocks();
});

describe("/api/health", () => {
  it("checks the database answers, without saying why when it doesn't", async () => {
    expect((await GET(req())).status).toBe(200);
    dbWorks = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const down = await GET(req());
    expect(down.status).toBe(503);
    const text = await down.text();
    expect(JSON.parse(text)).toMatchObject({ ok: false, database: "down" });
    expect(text).not.toContain("secret-host");
    expect((await HEAD(req())).status).toBe(503);
  });

  it("checks the photo storage too, where there is one", async () => {
    expect(await (await GET(req())).json()).toMatchObject({ ok: true, storage: "none" });
    bucket = { head: async () => null };
    expect(await (await GET(req())).json()).toMatchObject({ ok: true, storage: "ok" });
    bucket = { head: async () => Promise.reject(new Error("R2 down")) };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const down = await GET(req());
    expect(down.status).toBe(503);
    expect(await down.json()).toMatchObject({ ok: false, database: "ok", storage: "down" });
  });
});
