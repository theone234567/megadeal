import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, revokeAllAdminSessions } from "@/lib/adminSession";

export async function POST() {
  // Invalidates every admin session server-side, not just this browser's
  // cookie — see the comment on revokeAllAdminSessions for why that matters.
  await revokeAllAdminSessions();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
