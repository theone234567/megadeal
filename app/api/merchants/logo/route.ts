import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { isWixMediaUrl } from "@/lib/photoUrl";

export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const logoUrl = body?.logoUrl;
  if (!isWixMediaUrl(logoUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  const adminClient = createWixAdminClient();
  const result = await adminClient.items.query("Merchants").eq("_owner", member.id).find();
  const merchant = result.items?.[0];
  if (!merchant) {
    return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
  }

  const updated = await adminClient.items.update("Merchants", {
    ...merchant,
    logoUrl,
    status: "Pending",
  });
  return NextResponse.json({ item: updated });
}
