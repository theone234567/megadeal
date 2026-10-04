import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSessionToken, verifyAdminPassword } from "@/lib/adminSession";
import {
  getClientIp,
  checkIpLockout,
  recordFailedIpAttempt,
  clearIpAttempts,
} from "@/lib/adminRateLimit";
import { verifyTotp } from "@/lib/totp";
import { logAdminAction } from "@/lib/adminAudit";
import { getRateLimitKv } from "@/lib/rateLimit";

const TOTP_LAST_STEP_KEY = "admin-totp-last-step";

export async function POST(req: NextRequest) {
  let password: string;
  let code: string;
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
    code = String(body?.code ?? "").replace(/\s/g, "");
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
    await logAdminAction({ action: "Failed sign-in", detail: result.locked ? "Wrong password; locked out" : "Wrong password", ip });
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

  // Two-factor sign-in (lib/totp.ts): on only while ADMIN_TOTP_SECRET is
  // set (Cloudflare → the Worker → Settings → Variables and Secrets).
  // Removing it switches it off again, which is the way back in if the
  // authenticator is lost. Set up at /admin/two-factor.
  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  if (totpSecret) {
    if (!code) {
      // The right password; now the code. Not a failed attempt.
      return NextResponse.json(
        { needsCode: true, error: "Enter the 6-digit code from your authenticator app." },
        { status: 401 }
      );
    }
    const step = verifyTotp(totpSecret, code);
    // Each code works once: a code seen over someone's shoulder, or replayed
    // from a captured request, is refused.
    const kv = await getRateLimitKv();
    const lastStep = Number((await kv?.get(TOTP_LAST_STEP_KEY)) ?? NaN);
    if (step === null || (Number.isFinite(lastStep) && step <= lastStep)) {
      const result = await recordFailedIpAttempt(ip);
      await logAdminAction({ action: "Failed sign-in", detail: result.locked ? "Right password, wrong or reused code; locked out" : "Right password, wrong or reused code", ip });
      if (result.locked) {
        return NextResponse.json(
          { error: `Too many incorrect attempts. Try again in ${result.minutesLeft} minute${result.minutesLeft === 1 ? "" : "s"}.` },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { needsCode: true, error: "That code didn't work. Enter the current code from your authenticator app." },
        { status: 401 }
      );
    }
    await kv?.put(TOTP_LAST_STEP_KEY, String(step), { expirationTtl: 60 * 60 });
  }

  await clearIpAttempts(ip);
  await logAdminAction({ action: "Signed in", detail: totpSecret ? "Password and authenticator code" : "Password", ip });

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
