import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCHEDULED_JOBS, runScheduledJob } from "./scheduledJobs";
import { internalCallToken } from "./internalCall";

/** Cloudflare's Cron Triggers (wrangler.toml) run the site's /api/cron routes (worker.mjs). */

describe("scheduled jobs", () => {
  it("every schedule in wrangler.toml has a job, and every job a schedule", () => {
    const toml = readFileSync("wrangler.toml", "utf8");
    const block = /\[triggers\][\s\S]*?crons\s*=\s*\[([^\]]*)\]/.exec(toml)?.[1] ?? "";
    const crons = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(crons.sort()).toEqual(Object.keys(SCHEDULED_JOBS).sort());
  });

  it("calls the route with CRON_SECRET, inside the Worker", async () => {
    const seen: Request[] = [];
    const result = await runScheduledJob("23 14 * * *", { CRON_SECRET: "s3cret" }, async (req) => (seen.push(req), new Response("{}", { status: 200 })));
    expect(result).toBe("/api/cron/backup: 200");
    expect(seen[0].method).toBe("POST");
    expect(seen[0].url).toBe("https://megadeal.co.nz/api/cron/backup");
    expect(seen[0].headers.get("authorization")).toBe("Bearer s3cret");
  });

  it("runs without CRON_SECRET, with the site's own password, which the routes accept", async () => {
    const seen: Request[] = [];
    const result = await runScheduledJob("17 * * * *", {}, async (req) => (seen.push(req), new Response("{}")));
    expect(result).toBe("/api/cron/expired-deals: 200, /api/cron/watch: 200");
    const bearer = seen[0].headers.get("authorization") ?? "";
    expect(bearer).toBe(`Bearer ${internalCallToken()}`);
    expect(internalCallToken()).toMatch(/^[0-9a-f]{64}$/);
    // The same password each time within this running copy.
    expect(seen[1].headers.get("authorization")).toBe(bearer);
  });

  it("fails the run when the route fails, so Cloudflare records it", async () => {
    await expect(runScheduledJob("23 14 * * *", { CRON_SECRET: "s" }, async () => new Response("{}", { status: 500 }))).rejects.toThrow(/backup answered 500/);
    // One failing doesn't stop the others in the same run.
    const ran: string[] = [];
    await expect(
      runScheduledJob("17 * * * *", { CRON_SECRET: "s" }, async (req) => {
        ran.push(new URL(req.url).pathname);
        return new Response("{}", { status: ran.length === 1 ? 500 : 200 });
      })
    ).rejects.toThrow(/expired-deals answered 500/);
    expect(ran).toEqual(["/api/cron/expired-deals", "/api/cron/watch"]);
    await expect(runScheduledJob("0 0 * * *", { CRON_SECRET: "s" }, async () => new Response())).rejects.toThrow(/No job/);
  });
});
