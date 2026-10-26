import { NextRequest, NextResponse } from "next/server";
import { JSON_BODY_MAX, readSmallJson } from "@/lib/readJsonBody";
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
import {
  ADMIN_GLOBAL_LOCK_SECONDS,
  ADMIN_GLOBAL_MAX_FAILURES,
  ADMIN_GLOBAL_WINDOW_SECONDS,
  GLOBAL_KEY,
  adminSignInMode,
} from "@/lib/adminSignIn";
import { verifyTurnstile } from "@/lib/turnstile";

const TOTP_LAST_STEP_KEY = "admin-totp-last-step";
const NO_STORE = { "Cache-Control": "private, no-store" };

const minutes = (n: number) => `${n} minute${n === 1 ? "" : "s"}`;

/** What the sign-in page should ask for (lib/adminSignIn.ts). */
export async function GET() {
  return NextResponse.json({ mode: adminSignInMode() }, { headers: NO_STORE });
}

/** Sign-in paused for everyone after many failures from many addresses. */
async function globalLockMinutes(): Promise<number> {
  const left = await (await import("@/lib/securityStore")).adminLockSecondsLeft(GLOBAL_KEY);
  return typeof left === "number" && left > 0 ? Math.max(1, Math.ceil(left / 60)) : 0;
}

/** Counts a failure towards the all-addresses limit; tells the owner once
 *  when it pauses sign-in. */
async function recordGlobalFailure(ip: string): Promise<void> {
  const r = await (await import("@/lib/securityStore")).recordAdminFailure(
    GLOBAL_KEY,
    ADMIN_GLOBAL_MAX_FAILURES,
    ADMIN_GLOBAL_WINDOW_SECONDS,
    ADMIN_GLOBAL_LOCK_SECONDS,
  );
  if (r === "unavailable" || !r.locked) return;
  await logAdminAction({ action: "Admin sign-in paused", detail: `${ADMIN_GLOBAL_MAX_FAILURES} failed sign-ins within an hour; last from this address`, ip });
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const { sendTransactionalEmail } = await import("@/lib/sendEmail");
  const { brandedEmailHtml } = await import("@/lib/emailTemplate");
  await sendTransactionalEmail({
    to,
    subject: "MegaDeal admin sign-in paused after many failed attempts",
    html: brandedEmailHtml(`
      <p style="margin:0 0 16px;">There were ${ADMIN_GLOBAL_MAX_FAILURES} failed admin sign-ins within an hour, so admin sign-in is paused for ${minutes(ADMIN_GLOBAL_LOCK_SECONDS / 60)}.</p>
      <p style="margin:0 0 16px;">If that wasn't you, someone may be guessing. The admin audit log has the details. Putting Cloudflare Access in front of /admin stops this kind of guessing altogether.</p>
    `),
  }).catch(() => false);
}

export async function POST(req: NextRequest) {
  let password: string;
  let code: string;
  let captchaToken: unknown;
  try {
    const body = await readSmallJson(req, JSON_BODY_MAX);
    if (!body || typeof body !== "object") throw new Error("not JSON");
    password = String(body?.password ?? "");
    code = String(body?.code ?? "").replace(/\s/g, "");
    captchaToken = body?.captchaToken;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const mode = adminSignInMode();
  if (mode === "setup-needed") {
    return NextResponse.json(
      { setupNeeded: true, error: "Admin sign-in is off until two-factor sign-in is set up." },
      { status: 503, headers: NO_STORE },
    );
  }

  const ip = getClientIp(req);
  const lockStatus = await checkIpLockout(ip);
  if (lockStatus.locked) {
    return NextResponse.json({ error: `Too many incorrect attempts. Try again in ${minutes(lockStatus.minutesLeft)}.` }, { status: 429 });
  }
  const pausedFor = await globalLockMinutes();
  if (pausedFor > 0) {
    return NextResponse.json({ error: `Admin sign-in is paused after many failed attempts. Try again in ${minutes(pausedFor)}.` }, { status: 429 });
  }
  // The robot check, as on business sign-in.
  if (!(await verifyTurnstile(captchaToken, ip))) {
    return NextResponse.json({ error: "The security check didn't pass. Please try again." }, { status: 400 });
  }

  /** A failed attempt: counted per address and for everyone together. */
  const fail = async (detail: string, message: string) => {
    const result = await recordFailedIpAttempt(ip);
    await recordGlobalFailure(ip);
    await logAdminAction({ action: "Failed sign-in", detail: result.locked ? `${detail}; locked out` : detail, ip });
    if (result.locked) {
      return NextResponse.json({ error: `Too many incorrect attempts. Try again in ${minutes(result.minutesLeft)}.` }, { status: 429 });
    }
    return NextResponse.json(
      { ...(mode === "password-and-code" ? { needsCode: true } : {}), error: `${message} ${result.remaining} attempt${result.remaining === 1 ? "" : "s"} remaining.` },
      { status: 401 },
    );
  };

  const passwordOk = Boolean(password) && verifyAdminPassword(password);

  if (mode === "password-and-code") {
    // The password and the code are checked together and answered the
    // same way, so the password can't be guessed on its own first (it
    // used to answer "now the code" to a right password, uncounted).
    const totpSecret = process.env.ADMIN_TOTP_SECRET!.trim();
    const step = code ? verifyTotp(totpSecret, code) : null;
    let fresh = false;
    // A code is only used up by a right password, so wrong guesses can't
    // burn the admin's current code.
    if (passwordOk && step !== null) {
      // Each code works once: a code seen over someone's shoulder, or
      // replayed from a captured request, is refused. Claimed in one
      // database statement where there is one, so the same code sent twice
      // at once can't sign in twice; KV otherwise.
      const claimed = await (await import("@/lib/securityStore")).claimTotpStep(step);
      if (claimed !== "unavailable") {
        fresh = claimed;
      } else {
        const kv = await getRateLimitKv();
        const lastStep = Number((await kv?.get(TOTP_LAST_STEP_KEY)) ?? NaN);
        fresh = !(Number.isFinite(lastStep) && step <= lastStep);
      }
      if (fresh) await (await getRateLimitKv())?.put(TOTP_LAST_STEP_KEY, String(step), { expirationTtl: 60 * 60 });
    }
    if (!passwordOk || !fresh) {
      return fail(
        !passwordOk ? "Wrong password" : !code ? "Right password, no code" : "Right password, wrong or reused code",
        "Wrong password or code.",
      );
    }
  } else if (!passwordOk) {
    return fail("Wrong password", "Incorrect password.");
  }

  await clearIpAttempts(ip);
  await logAdminAction({ action: "Signed in", detail: mode === "password-and-code" ? "Password and authenticator code" : "Password (development)", ip });

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
