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

const { GET, HEAD } = await import("@/app/api/health/route");
const req = () => new Request("https://megadeal.co.nz/api/health");

afterEach(() => {
  vi.unstubAllEnvs();
  dbWorks = true;
  vi.restoreAllMocks();
});

describe("/api/health", () => {
  it("is fine on Wix, with nothing of ours to check", async () => {
    vi.stubEnv("DATA_BACKEND", "wix");
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, database: "not in use" });
  });

  it("checks the database once the site uses it", async () => {
    vi.stubEnv("DATA_BACKEND", "postgres");
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
});
