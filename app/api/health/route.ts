import { NextResponse } from "next/server";
import { dataBackend, withDb } from "@/lib/db/connection";

export const dynamic = "force-dynamic";

/**
 * For an uptime monitor (docs/WIX-MIGRATION.md, "Monitoring"): 200 when
 * the site can serve pages, 503 when it can't, so the owner hears about an
 * outage from the monitor rather than from a business.
 *
 * Checks the database once the site uses it (DATA_BACKEND=postgres); on
 * Wix there's nothing of ours to check. Says only "ok" or "down", never
 * why: an error can name hosts and users.
 *
 * Each answer is kept for 30 seconds at the edge, so however often this is
 * requested, the database is asked at most twice a minute per data centre.
 */

const TTL_SECONDS = 30;

type Health = { ok: boolean; database: "ok" | "down" | "not in use"; checkedAt: string };

async function check(): Promise<Health> {
  const checkedAt = new Date().toISOString();
  if (dataBackend() !== "postgres") return { ok: true, database: "not in use", checkedAt };
  try {
    await Promise.race([
      withDb((db) => db.query("select 1")),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), 5000)),
    ]);
    return { ok: true, database: "ok", checkedAt };
  } catch (err) {
    console.error("[health] database check failed", err);
    return { ok: false, database: "down", checkedAt };
  }
}

function edgeCache(): Cache | null {
  const c = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return c?.default ?? null;
}

async function health(req: Request): Promise<Response> {
  const key = new Request(new URL("/api/health", req.url).toString());
  const cache = edgeCache();
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) return hit;
  const h = await check();
  const res = NextResponse.json(h, {
    status: h.ok ? 200 : 503,
    // Kept briefly at the edge; never in browsers or by the monitor.
    headers: { "Cache-Control": `public, s-maxage=${TTL_SECONDS}, max-age=0, must-revalidate`, "X-Robots-Tag": "noindex" },
  });
  await cache?.put(key, res.clone()).catch(() => undefined);
  return res;
}

export async function GET(req: Request) {
  return health(req);
}

/** Many monitors only ask for the status. */
export async function HEAD(req: Request) {
  const res = await health(req);
  return new Response(null, { status: res.status, headers: res.headers });
}
