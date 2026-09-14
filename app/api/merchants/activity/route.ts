import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { queryAllByEmail } from "@/lib/queryAll";
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

  try {
    const adminClient = createWixAdminClient();
    const merchant = await getOrClaimMerchant(adminClient, member);
    if (!merchant?.email) {
      return NextResponse.json({ items: [] });
    }

    // Read everything before sorting. Wix returns a default page of 50 in
    // no particular order, so sorting after that picked the newest of an
    // arbitrary 50 — once a merchant passed that many entries, genuinely
    // new ones could stop appearing at the top of their own ledger.
    const rows = await queryAllByEmail(
      (email) => adminClient.items.query("MerchantActivity").eq("merchantEmail", email),
      merchant.email,
      "MerchantActivity (portal)"
    );

    const items = rows
      .sort(
        (a: any, b: any) =>
          new Date(b._createdDate ?? 0).getTime() - new Date(a._createdDate ?? 0).getTime()
      )
      .slice(0, MAX_ITEMS);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[merchants/activity] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
