import { NextRequest, NextResponse } from "next/server";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { createTestDeal, listTestDeals } from "@/lib/testDealStore";
import { testDealRunning, testDealToDeal } from "@/lib/testDeals";

export const dynamic = "force-dynamic";

// Admin only: test deals (lib/testDeals.ts). Never cached.
const NO_STORE = { "Cache-Control": "private, no-store" };

/** The list for the admin tab, or with ?view=deals the running ones as
 *  deals, for the customer-page previews to add to their listings. */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  try {
    const list = await listTestDeals();
    if (req.nextUrl.searchParams.get("view") === "deals") {
      const now = Date.now();
      return NextResponse.json({ deals: list.filter((t) => testDealRunning(t, now)).map(testDealToDeal) }, { headers: NO_STORE });
    }
    return NextResponse.json({ items: list }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/test-deals] read failed", err);
    return NextResponse.json({ error: "Couldn't load the test deals. Please try again." }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const body = await req.json().catch(() => null);
  try {
    const result = await createTestDeal(body?.deal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
    }
    await logAdminAction({ action: "Test deal added", target: auditTarget(result.deal.dealName, result.deal.id) });
    return NextResponse.json({ item: result.deal }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/test-deals] create failed", err);
    return NextResponse.json({ error: "Couldn't save the test deal. Please try again." }, { status: 503, headers: NO_STORE });
  }
}
