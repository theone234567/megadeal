import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isAdminRequest, revokeAllAdminSessions } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Logged only for a real admin session, so nobody else can write to the
  // audit log by calling this.
  if (await isAdminRequest(req)) {
    await logAdminAction({ action: "Signed out", detail: "Every admin session ended", ip: getClientIp(req) });
  }
  // Invalidates every admin session server-side, not just this browser's
  // cookie — see the comment on revokeAllAdminSessions for why that matters.
  await revokeAllAdminSessions();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
