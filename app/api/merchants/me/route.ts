import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { getOrClaimMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

/**
 * Returns the signed-in member's Merchants record, claiming an unclaimed
 * application by matching email if they applied before creating an
 * account. The portal and new-deal pages read through this instead of
 * querying the Merchants collection directly from the browser, since a
 * freshly-claimed record wouldn't yet satisfy Wix's own
 * "only items this member authored" read permission.
 */
export async function GET(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const adminClient = createWixAdminClient();
  const merchant = await getOrClaimMerchant(adminClient, member);
  return NextResponse.json({ item: merchant });
}
