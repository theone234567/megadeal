import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { existingInternalCallToken } from "./internalCall";

// Hashed first so the comparison is constant-time whatever the lengths.
function same(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * The scheduled jobs (Cloudflare Cron Triggers, lib/scheduledJobs.ts) call
 * app/api/cron/* with the site's own password (lib/internalCall.ts), or
 * anyone may with CRON_SECRET, a Cloudflare Worker secret. "unset" when
 * there's no CRON_SECRET and the call isn't the site's own.
 */
export function cronCaller(req: NextRequest): "ok" | "unset" | "refused" {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const own = existingInternalCallToken();
  if (given && own && same(given, own)) return "ok";
  const expected = process.env.CRON_SECRET;
  if (!expected) return "unset";
  if (!given) return "refused";
  return same(given, expected) ? "ok" : "refused";
}
