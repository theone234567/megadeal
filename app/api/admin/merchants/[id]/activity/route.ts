import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { queryAllByEmail } from "@/lib/queryAll";

const MAX_ITEMS = 100;

/**
 * The credit/activity ledger for one specific business, for the admin
 * detail page — same MerchantActivity collection the business's own portal
 * reads from (see /api/merchants/activity), just admin-scoped to a given
 * business by ID instead of the caller's own account.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createWixAdminClient();
    const merchant = await adminClient.items.get("Merchants", params.id);
    if (!merchant?.email) {
      return NextResponse.json({ items: [] });
    }

    // Same as the merchant-facing feed: read everything, then sort, then
    // slice. Sorting a default page of 50 unordered rows made the
    // MAX_ITEMS slice below unreachable and hid recent entries.
    const rows = await queryAllByEmail(
      (email) => adminClient.items.query("MerchantActivity").eq("merchantEmail", email),
      merchant.email,
      "MerchantActivity (admin)"
    );

    const items = rows
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
