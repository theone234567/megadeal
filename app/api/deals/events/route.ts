import { NextRequest, NextResponse } from "next/server";
import { withDb } from "@/lib/db/connection";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isAdminRequest } from "@/lib/adminSession";
import { readSmallJson } from "@/lib/readJsonBody";
import { deviceClass, looksLikeBot, parseIncomingEvent, recordDealEvents } from "@/lib/dealEventLog";

export const dynamic = "force-dynamic";

/**
 * Where the deal and profile pages send what customers do
 * (lib/trackDeal.ts → lib/dealEventLog.ts). Anonymous, so it's guarded:
 * known events only, at most ten per request, a per-address limit, no
 * crawlers, no admins checking deals. Always answers ok: a lost event must
 * never affect the visitor, and the answer tells an abuser nothing.
 */
export async function POST(req: NextRequest) {
  const body = await readSmallJson(req, 8192);
  const raw = Array.isArray(body?.events) ? body.events.slice(0, 10) : [];
  const events = raw.map(parseIncomingEvent).filter((e: ReturnType<typeof parseIncomingEvent>): e is NonNullable<typeof e> => e !== null);
  if (events.length === 0) return NextResponse.json({ ok: true });

  const ua = req.headers.get("user-agent");
  if (looksLikeBot(ua) || (await isAdminRequest(req))) return NextResponse.json({ ok: true });
  const { limited } = await checkRateLimit(`dealevents-ip:${getClientIp(req)}`, 600, 60 * 60);
  if (limited) return NextResponse.json({ ok: true });

  try {
    await withDb((db) => recordDealEvents(db, events, deviceClass(ua)));
  } catch (err) {
    // Before the database update is applied the table isn't there yet.
    console.error("[deals/events] failed", (err as Error)?.message);
  }
  return NextResponse.json({ ok: true });
}
