import { NextRequest, NextResponse } from "next/server";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { createDataClient } from "@/lib/dataClient";
import { adminResetMemberPassword, generateTempPassword } from "@/lib/wixPassword";
import { accountIdForEmail, authBackend, endAllSessions } from "@/lib/authSession";
import { adminSetPassword } from "@/lib/supabaseAuth";

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
    const adminClient = createDataClient();
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
    // MegaDeal's own logins: set it through Supabase. A business brought
    // over from Wix has no login yet; this makes one, and the business is
    // linked to it the first time it signs in. Every session using the old
    // password ends.
    if (authBackend() === "supabase") {
      const password = generateTempPassword(16);
      const set = await adminSetPassword(email, password, await accountIdForEmail(email));
      if (!set.ok) {
        console.error("[admin/merchants/[id]/reset-password] refused", set.status, set.code);
        return NextResponse.json({ error: "Couldn't reset the password. Please try again." }, { status: 502 });
      }
      if (set.data.id) await endAllSessions(set.data.id);
      await logAdminAction({ action: "Business password reset", target: auditTarget(merchant.businessName || email, merchant._id) });
      return NextResponse.json({ password });
    }

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
    // The temporary password itself is never logged.
    await logAdminAction({ action: "Business password reset", target: auditTarget(merchant.businessName || email, merchant._id) });
    return NextResponse.json({ password });
  } catch (err) {
    // Never the provider's own text (security review finding 2).
    console.error("[admin/merchants/[id]/reset-password] failed", err);
    return NextResponse.json({ error: "Couldn't reset the password. Please try again." }, { status: 500 });
  }
}
