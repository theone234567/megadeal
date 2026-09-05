import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";

const MAX_ITEMS = 100;

/**
 * The credit/activity ledger for one specific business, for the admin
 * detail page — same MerchantActivity collection the business's own portal
 * reads from (see /api/merchants/activity), just admin-scoped to a given
 * business by ID instead of the caller's own account.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createWixAdminClient();
    const merchant = await adminClient.items.get("Merchants", params.id);
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
  } catch (err) {
    console.error("[admin/merchants/[id]/activity] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
