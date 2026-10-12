import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, clearSessionCookies } from "@/lib/authSession";
import { signOut } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

/**
 * Ends the session: tells the login service (so the refresh token stops
 * working) and clears the httpOnly cookies, whatever it says.
 */
export async function POST(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  if (access) await signOut(access).catch(() => null);
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
