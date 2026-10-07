import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * The scheduled jobs (Cloudflare Cron Triggers, lib/scheduledJobs.ts) call
 * app/api/cron/* with CRON_SECRET, a Cloudflare Worker secret. "unset"
 * when the Worker has no secret yet.
 */
export function cronCaller(req: NextRequest): "ok" | "unset" | "refused" {
  const expected = process.env.CRON_SECRET;
  if (!expected) return "unset";
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!given) return "refused";
  // Hashed first so the comparison is constant-time whatever the lengths.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) ? "ok" : "refused";
}
