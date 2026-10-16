import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { withDb } from "@/lib/db/connection";
import { dealStats, statsDays } from "@/lib/dealEventLog";

export const dynamic = "force-dynamic";

/** Every business's deal figures together, for MegaDeal (admins only). */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const days = statsDays(req.nextUrl.searchParams.get("days"));
  try {
    const stats = await withDb(async (db) => {
      const [{ ready }] = await db.query<{ ready: boolean }>("select to_regclass('public.deal_events') is not null as ready");
      return ready ? dealStats(db, null, days) : null;
    });
    return NextResponse.json(stats ? { stats } : { stats: null, notReady: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[admin/deal-stats] failed", err);
    return NextResponse.json({ error: "Couldn't load the figures." }, { status: 500 });
  }
}
