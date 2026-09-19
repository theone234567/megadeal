import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createWixAdminClient } from "@/lib/wixAdmin";

export const dynamic = "force-dynamic";

/**
 * One of the caller's own deals, for the "Duplicate this deal" prefill.
 *
 * The new-deal form used to fetch this from the browser and then check
 * ownership in the page — which decided what to *show*, not what to
 * release: the record had already been handed to the client by then. The
 * check is server-side now, so a deal belonging to someone else is never
 * sent at all.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const adminClient = createWixAdminClient();
    const deal = await adminClient.items.get("Deals", params.id);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }
    if ((deal.merchantEmail || "").toLowerCase() !== member.email.toLowerCase()) {
      return NextResponse.json({ error: "This isn't your deal." }, { status: 403 });
    }
    return NextResponse.json({ item: deal });
  } catch (err) {
    console.error("[deals/[id]] GET failed", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/**
 * Throws away one of the caller's drafts.
 *
 * Drafts only. A submitted deal is withdrawn by moving it to Cancelled,
 * which keeps the record, the credit history and anything the admin has
 * said about it — deleting outright would destroy an audit trail that
 * someone may need to explain a decision later. A draft has none of that
 * behind it: nothing was charged, nothing was reviewed, nothing was ever
 * public.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (await memberRateLimited("deal-delete", member.id, 30, HOUR)) {
    return NextResponse.json({ error: "That's a lot of deletes at once — please try again shortly." }, { status: 429 });
  }

  try {
    const adminClient = createWixAdminClient();
    const deal = await adminClient.items.get("Deals", params.id);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }
    if ((deal.merchantEmail || "").toLowerCase() !== member.email.toLowerCase()) {
      return NextResponse.json({ error: "This isn't your deal." }, { status: 403 });
    }
    if (deal.status !== "Draft") {
      return NextResponse.json(
        { error: "Only a draft can be deleted. Cancel the deal instead." },
        { status: 409 }
      );
    }
    await adminClient.items.remove("Deals", params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[deals/[id]] DELETE failed", err);
    return NextResponse.json({ error: "Couldn't delete that draft." }, { status: 500 });
  }
}
