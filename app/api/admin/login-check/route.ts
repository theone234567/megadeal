import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { authBackend, loginInfo } from "@/lib/authSession";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin > Check a login: whether an email has a business login and its
 * state (lib/authSession.ts loginInfo), for "my password doesn't work".
 * Admin only, and each look-up is in the audit log.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (authBackend() !== "supabase") {
    return NextResponse.json({ error: "Logins are still Wix's, so there's nothing to check here." }, { status: 409 });
  }
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().slice(0, 254);
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  try {
    const info = await loginInfo(email);
    await logAdminAction({ action: "Checked a login", target: email }).catch(() => {});
    return NextResponse.json({ info }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin/login-check] failed", err);
    return NextResponse.json({ error: "Couldn't check that just now. Please try again." }, { status: 500 });
  }
}
