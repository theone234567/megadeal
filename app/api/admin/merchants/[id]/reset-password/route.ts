import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { adminResetMemberPassword } from "@/lib/wixPassword";

/**
 * Manual override for when a business can't use the self-service "Forgot
 * password" flow (app/reset-password) — e.g. their reset email hasn't
 * arrived, or they've lost access to that inbox entirely. Generates a new
 * password and sets it directly, no email involved; the admin is
 * responsible for relaying it to the business themselves.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    // See app/api/auth/request-password-reset/route.ts for why this
    // matters: without a real Wix Member already linked (_owner set),
    // adminResetMemberPassword's Sign On step would silently create a
    // brand-new member for this email instead of resetting anything.
    if (!merchant._owner) {
      return NextResponse.json(
        {
          error:
            "Nobody has signed in with this business's email yet, so there's no account to reset. It'll link automatically the first time they sign in.",
        },
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
