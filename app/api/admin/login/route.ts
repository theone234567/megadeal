import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_ATTEMPTS_COOKIE_NAME,
  MAX_ADMIN_LOGIN_ATTEMPTS,
  createAdminSessionToken,
  verifyAdminPassword,
  readAdminLoginAttempts,
  createAdminLoginAttemptsToken,
  recordFailedAdminLogin,
  isAdminLoginLocked,
} from "@/lib/adminSession";

export async function POST(req: NextRequest) {
  let password: string;
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const attempts = readAdminLoginAttempts(req.cookies.get(ADMIN_ATTEMPTS_COOKIE_NAME)?.value);
  if (isAdminLoginLocked(attempts)) {
    const minutesLeft = Math.max(1, Math.ceil((attempts.lockedUntil - Date.now()) / 60_000));
    return NextResponse.json(
      { error: `Too many incorrect attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` },
      { status: 429 }
    );
  }

  if (!password || !verifyAdminPassword(password)) {
    const updated = recordFailedAdminLogin(attempts);
    const locked = isAdminLoginLocked(updated);
    const remaining = MAX_ADMIN_LOGIN_ATTEMPTS - updated.failedCount;

    const res = NextResponse.json(
      {
        error: locked
          ? "Too many incorrect attempts. Try again in 15 minutes."
          : `Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      },
      { status: locked ? 429 : 401 }
    );
    res.cookies.set(ADMIN_ATTEMPTS_COOKIE_NAME, createAdminLoginAttemptsToken(updated), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    return res;
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  res.cookies.delete(ADMIN_ATTEMPTS_COOKIE_NAME);
  return res;
}
