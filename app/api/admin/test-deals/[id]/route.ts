import { NextRequest, NextResponse } from "next/server";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { codeForDraft } from "@/lib/dealCode";
import { draftToRow } from "@/lib/dealDraft";
import { deleteTestDeal, getTestDeal, restartTestDeal, updateTestDeal } from "@/lib/testDealStore";
import { testDealToDraft } from "@/lib/testDeals";
import { createWixAdminClient } from "@/lib/wixAdmin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const unauthorized = () => NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
const failed = (what: string) =>
  NextResponse.json({ error: `Couldn't ${what}. Please try again.` }, { status: 503, headers: NO_STORE });

/** Same cap as a business's own drafts (app/api/deals/draft). */
const MAX_DRAFTS = 25;

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await props.params;
  const body = await req.json().catch(() => null);
  try {
    const result = await updateTestDeal(id, body?.deal);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
    await logAdminAction({ action: "Test deal edited", target: auditTarget(result.deal.dealName, result.deal.id) });
    return NextResponse.json({ item: result.deal }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/test-deals] update failed", err);
    return failed("save the test deal");
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await props.params;
  try {
    if (!(await deleteTestDeal(id))) {
      return NextResponse.json({ error: "That test deal no longer exists." }, { status: 404, headers: NO_STORE });
    }
    await logAdminAction({ action: "Test deal deleted", target: auditTarget(null, id) });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/test-deals] delete failed", err);
    return failed("delete the test deal");
  }
}

/**
 * { action: "restart" } starts the test deal's timer again from now.
 * { action: "copy", merchantId } makes an ordinary draft from it for that
 * business: a new Deals row with a new id and a fresh MEGA code, no photo
 * and no dates, which the business still has to finish, submit and get
 * approved. The test deal itself is unchanged.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await props.params;
  const body = await req.json().catch(() => null);

  if (body?.action === "restart") {
    try {
      const result = await restartTestDeal(id);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
      await logAdminAction({ action: "Test deal timer restarted", target: auditTarget(result.deal.dealName, result.deal.id) });
      return NextResponse.json({ item: result.deal }, { headers: NO_STORE });
    } catch (err) {
      console.error("[admin/test-deals] restart failed", err);
      return failed("restart the timer");
    }
  }

  if (body?.action === "copy") {
    const merchantId = typeof body.merchantId === "string" ? body.merchantId : "";
    if (!merchantId) return NextResponse.json({ error: "Pick a business." }, { status: 400, headers: NO_STORE });
    try {
      const test = await getTestDeal(id);
      if (!test) return NextResponse.json({ error: "That test deal no longer exists." }, { status: 404, headers: NO_STORE });

      const adminClient = createWixAdminClient();
      const merchant = await adminClient.items.get("Merchants", merchantId).catch(() => null);
      const email = typeof merchant?.email === "string" ? merchant.email.toLowerCase() : "";
      if (!merchant || !email) return NextResponse.json({ error: "That business couldn't be found." }, { status: 404, headers: NO_STORE });
      if (merchant.status === "Suspended") {
        return NextResponse.json({ error: "That business is suspended, so it can't be given a draft." }, { status: 409, headers: NO_STORE });
      }
      const drafts = await adminClient.items.query("Deals").eq("merchantEmail", email).eq("status", "Draft").find();
      if ((drafts.items?.length ?? 0) >= MAX_DRAFTS) {
        return NextResponse.json(
          { error: `${merchant.businessName || "That business"} already has ${MAX_DRAFTS} drafts, the most a business can keep.` },
          { status: 409, headers: NO_STORE }
        );
      }
      const created = await adminClient.items.insert("Deals", {
        ...draftToRow(testDealToDraft(test), email),
        dealCode: codeForDraft("", null),
      });
      await logAdminAction({
        action: "Test deal copied to a real draft",
        target: auditTarget(test.dealName, test.id),
        detail: `Draft for ${merchant.businessName || email}`,
      });
      return NextResponse.json({ draftId: created?._id ?? null, businessName: merchant.businessName ?? null }, { headers: NO_STORE });
    } catch (err) {
      console.error("[admin/test-deals] copy failed", err);
      return failed("create the draft");
    }
  }

  return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
}
