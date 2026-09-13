import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSessionToken, verifyAdminPassword } from "@/lib/adminSession";
import {
  getClientIp,
  checkIpLockout,
  recordFailedIpAttempt,
  clearIpAttempts,
} from "@/lib/adminRateLimit";

export async function POST(req: NextRequest) {
  let password: string;
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const lockStatus = await checkIpLockout(ip);
  if (lockStatus.locked) {
    return NextResponse.json(
      {
        error: `Too many incorrect attempts. Try again in ${lockStatus.minutesLeft} minute${
          lockStatus.minutesLeft === 1 ? "" : "s"
        }.`,
      },
      { status: 429 }
    );
  }

  if (!password || !verifyAdminPassword(password)) {
    const result = await recordFailedIpAttempt(ip);
    if (result.locked) {
      return NextResponse.json(
        {
          error: `Too many incorrect attempts. Try again in ${result.minutesLeft} minute${
            result.minutesLeft === 1 ? "" : "s"
          }.`,
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: `Incorrect password. ${result.remaining} attempt${result.remaining === 1 ? "" : "s"} remaining.` },
      { status: 401 }
    );
  }

  await clearIpAttempts(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    // Matches the convention the other two cookies in this app already
    // follow (lib/memberSession.ts, middleware.ts): always secure in
    // production, off locally so http://localhost works. Hardcoded true,
    // the browser silently refused to store this over plain HTTP, so a
    // local admin login appeared to succeed and then every request to the
    // dashboard came back 401 with nothing on screen explaining why.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
