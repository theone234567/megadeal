import { NextRequest, NextResponse } from "next/server";
import { JSON_BODY_MAX, readSmallJson } from "@/lib/readJsonBody";
import { ADMIN_COOKIE_NAME, endAdminSession, isAdminRequest, revokeAllAdminSessions } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * Admin sign-out. Only a signed-in admin can end admin sessions (security
 * pack T164): this used to end every admin session for anyone who called
 * it, so a script could keep the owner signed out of admin.
 *
 * Body `{ "everywhere": true }` ends every admin session on every device
 * (a lost laptop, a shared computer); otherwise just this one.
 */
export async function POST(req: NextRequest) {
  const clearCookie = (res: NextResponse) => {
    res.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  };
  const ip = getClientIp(req);

  if (!(await isAdminRequest(req))) {
    // Noted for the owner, but at most once an hour per address and a few
    // times an hour in all, so it can't flood the audit log.
    const noteIt =
      !(await checkRateLimit(`admin-logout-anon:${ip}`, 1, 60 * 60)).limited &&
      !(await checkRateLimit("admin-logout-anon-all", 10, 60 * 60)).limited;
    if (noteIt) await logAdminAction({ action: "Sign-out refused", detail: "Called without an admin session; no session was ended", ip });
    return clearCookie(NextResponse.json({ error: "Not signed in." }, { status: 401 }));
  }

  const body = await readSmallJson(req, JSON_BODY_MAX);
  const everywhere = Boolean(body && typeof body === "object" && (body as Record<string, unknown>).everywhere === true);
  if (everywhere) {
    // Invalidates every admin session server-side, not just this browser's
    // cookie — see the comment on revokeAllAdminSessions for why that matters.
    await revokeAllAdminSessions();
  } else {
    await endAdminSession(req.cookies.get(ADMIN_COOKIE_NAME)!.value);
  }
  await logAdminAction({ action: "Signed out", detail: everywhere ? "Every admin session ended" : "This session ended", ip });
  return clearCookie(NextResponse.json({ ok: true }));
}
