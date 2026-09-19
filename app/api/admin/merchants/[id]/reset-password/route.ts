import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { adminResetMemberPassword } from "@/lib/adminResetPassword";

/**
 * Stopgap while "Forgot password" (app/list-your-business/MerchantLoginForm.tsx)
 * 404s — see lib/adminResetPassword.ts for why. Lets an admin unblock a
 * locked-out business from the dashboard: generates a new password and sets
 * it directly, no email involved. The admin is responsible for relaying it
 * to the business themselves.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createWixAdminClient();
    const merchant = await adminClient.items.get("Merchants", params.id);
    if (!merchant) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    const email = String(merchant.email || "").trim();
    if (!email) {
      return NextResponse.json(
        { error: "This business has no account email on file." },
        { status: 400 }
      );
    }

    const password = await adminResetMemberPassword(email);
    return NextResponse.json({ password });
  } catch (err: any) {
    console.error("[admin/merchants/[id]/reset-password] failed", err);
    return NextResponse.json(
      { error: err?.message || "Couldn't reset the password. Please try again." },
      { status: 500 }
    );
  }
}
