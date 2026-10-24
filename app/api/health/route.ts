import { NextResponse } from "next/server";
import { withDb } from "@/lib/db/connection";
import { photoBucket } from "@/lib/photoStorage";

export const dynamic = "force-dynamic";

/**
 * For an uptime monitor (docs/WIX-MIGRATION.md, "Monitoring"): 200 when
 * the site can serve pages, 503 when it can't, so the owner hears about an
 * outage from the monitor rather than from a business.
 *
 * Checks the database and the photo storage answer (security pack T77),
 * and how long that took. Says only "ok" or "down", never why: an error
 * can name hosts and users. Storage is "none" where there's no bucket
 * (local development) and doesn't fail the check there.
 *
 * Each answer is kept for 30 seconds at the edge, so however often this is
 * requested, the database is asked at most twice a minute per data centre.
 */

const TTL_SECONDS = 30;

type Health = { ok: boolean; database: "ok" | "down"; storage: "ok" | "down" | "none"; ms: number; checkedAt: string };

const within = <T,>(p: Promise<T>, ms = 5000) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))]);

async function databaseOk(): Promise<boolean> {
  try {
    await within(withDb((db) => db.query("select 1")));
    return true;
  } catch (err) {
    console.error("[health] database check failed", err);
    return false;
  }
}

async function storageState(): Promise<Health["storage"]> {
  const bucket = await photoBucket();
  if (!bucket?.head) return "none";
  try {
    // A key that never exists: R2 answers null, which is all this needs.
    await within(bucket.head("health-check/none"));
    return "ok";
  } catch (err) {
    console.error("[health] storage check failed", err);
    return "down";
  }
}

async function check(): Promise<Health> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  const [db, storage] = await Promise.all([databaseOk(), storageState()]);
  return { ok: db && storage !== "down", database: db ? "ok" : "down", storage, ms: Date.now() - started, checkedAt };
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
