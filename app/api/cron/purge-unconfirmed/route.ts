import { NextRequest, NextResponse } from "next/server";
import { cronCaller } from "@/lib/cronAuth";
import { withDb } from "@/lib/db/connection";
import { purgeStaleUnconfirmed } from "@/lib/unconfirmedSignups";
import { adminDeleteUser } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

/**
 * Nightly (lib/scheduledJobs.ts): deletes sign-ups nobody confirmed with
 * the emailed code within a day (lib/unconfirmedSignups.ts, T241). Says
 * only how many, never who.
 */
export async function POST(req: NextRequest) {
  const caller = cronCaller(req);
  if (caller === "unset") return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (caller === "refused") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const result = await withDb((db) => purgeStaleUnconfirmed(db, adminDeleteUser));
    console.log("[cron/purge-unconfirmed]", result);
    return NextResponse.json({ result }, { status: result.failed ? 502 : 200 });
  } catch (err) {
    console.error("[cron/purge-unconfirmed] failed", err);
    return NextResponse.json({ error: "Couldn't clear old sign-ups." }, { status: 500 });
  }
}
