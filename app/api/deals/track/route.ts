import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";

export const dynamic = "force-dynamic";

/**
 * Best-effort, anonymous view/click counters for merchant-facing deal
 * analytics. Not auth-gated (it just increments a counter keyed by the
 * public product id) and not precision-critical, so a lost or duplicated
 * increment under a race is an acceptable tradeoff for staying simple —
 * this never blocks or fails a request from the visitor's point of view.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const productId = body?.productId ? String(body.productId) : "";
  const event = body?.event;

  if (!productId || (event !== "view" && event !== "click")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const adminClient = createWixAdminClient();
    const result = await adminClient.items.query("Deals").eq("productId", productId).find();
    const record = result.items?.[0];
    if (!record) {
      // Legacy/admin-managed products have no Deals row to track against.
      return NextResponse.json({ ok: true });
    }

    const field = event === "view" ? "viewCount" : "clickCount";
    await adminClient.items.update("Deals", {
      ...record,
      [field]: (Number(record[field]) || 0) + 1,
    });
  } catch (err) {
    console.error("[deals/track] failed", err);
  }

  return NextResponse.json({ ok: true });
}
