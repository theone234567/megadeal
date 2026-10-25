import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies } from "@/lib/authSession";
import { refreshSession, signOut } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

/**
 * Ends the session: tells the login service (so the refresh token stops
 * working) and clears the httpOnly cookies, whatever it says. When the
 * short-lived access token has already run out, the refresh token is
 * swapped for a fresh one first and that session is ended instead, so a
 * copied refresh token can't outlive the sign-out (T248).
 */
export async function POST(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  let ended = access ? (await signOut(access).catch(() => null))?.ok === true : false;
  if (!ended && refresh) {
    const renewed = await refreshSession(refresh).catch(() => null);
    if (renewed?.ok) ended = (await signOut(renewed.data.access_token).catch(() => null))?.ok === true;
  }
  if (!ended && (access || refresh)) console.error("[auth/logout] the session couldn't be ended at the login service; cookies cleared");
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
