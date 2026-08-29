import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { getOrClaimMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 30;

/**
 * The signed-in merchant's own credit ledger / activity feed — MerchantActivity
 * is admin-only readable, so this route (backed by the admin client) is the
 * only way the portal can show it. Filtered to the caller's own email only.
 */
export async function GET(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const adminClient = createWixAdminClient();
  const merchant = await getOrClaimMerchant(adminClient, member);
  if (!merchant?.email) {
    return NextResponse.json({ items: [] });
  }

  const result = await adminClient.items
    .query("MerchantActivity")
    .eq("merchantEmail", merchant.email)
    .find();

  const items = (result.items ?? [])
    .sort(
      (a: any, b: any) =>
        new Date(b._createdDate ?? 0).getTime() - new Date(a._createdDate ?? 0).getTime()
    )
    .slice(0, MAX_ITEMS);

  return NextResponse.json({ items });
}
