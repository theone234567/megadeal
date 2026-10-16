import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createDataClient } from "@/lib/dataClient";
import { getOrClaimMerchant } from "@/lib/merchant";
import { withDb } from "@/lib/db/connection";
import { dealStats, statsDays } from "@/lib/dealEventLog";

export const dynamic = "force-dynamic";

/**
 * The signed-in business's own deal figures for the last 7, 30 or 90 days
 * (lib/dealEventLog.ts). The business comes from the sign-in, never from
 * the request, so no one can read another business's figures. Totals only:
 * no visitor's events are ever sent.
 */
export async function GET(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const days = statsDays(req.nextUrl.searchParams.get("days"));
  try {
    const merchant = await getOrClaimMerchant(createDataClient(), member);
    if (!merchant?.email) return NextResponse.json({ error: "No business found for this account." }, { status: 404 });
    const stats = await withDb(async (db) => {
      const [row] = await db.query<{ id: string }>("select id from public.merchants where lower(email) = lower($1)", [merchant.email]);
      if (!row) return null;
      const [{ ready }] = await db.query<{ ready: boolean }>("select to_regclass('public.deal_events') is not null as ready");
      return ready ? dealStats(db, row.id, days) : "not_ready";
    });
    if (stats === null) return NextResponse.json({ error: "No business found for this account." }, { status: 404 });
    if (stats === "not_ready") return NextResponse.json({ stats: null, notReady: true });
    return NextResponse.json({ stats }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[merchants/deal-stats] failed", err);
    return NextResponse.json({ error: "Couldn't load your figures. Please try again." }, { status: 500 });
  }
}
