import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { isWixMediaUrl } from "@/lib/photoUrl";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const photoUrl = body?.photoUrl;
  if (!isWixMediaUrl(photoUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

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

  const nextStatus = "Pending Approval";
  const updated = await adminClient.items.update("Deals", {
    ...deal,
    photoUrl,
    status: nextStatus,
  });
  return NextResponse.json({ item: updated });
}
