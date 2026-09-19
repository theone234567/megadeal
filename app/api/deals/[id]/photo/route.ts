import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { isWixMediaUrl } from "@/lib/photoUrl";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (await memberRateLimited("deal-photo", member.id, 30, HOUR)) {
    return NextResponse.json({ error: "That's a lot of photo changes at once — please try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const photoUrl = body?.photoUrl;
  if (!isWixMediaUrl(photoUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
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
    if (deal.status === "Cancelled") {
      return NextResponse.json({ error: "This deal is cancelled." }, { status: 400 });
    }
    // A draft must not be reachable here. This route moves a deal to
    // "Pending Approval" as a side effect of changing its photo, which for
    // a draft would push it into review with no Wix product behind it and
    // no credit spent — a free listing slot and a deal that can be
    // approved but can never appear. Drafts change their photo in the deal
    // form, through /api/deals/draft.
    if (deal.status === "Draft") {
      return NextResponse.json(
        { error: "This deal is still a draft — open it to make changes." },
        { status: 409 }
      );
    }

    const nextStatus = "Pending Approval";
    const updated = await adminClient.items.update("Deals", {
      ...deal,
      photoUrl,
      status: nextStatus,
    });
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[deals/[id]/photo] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
