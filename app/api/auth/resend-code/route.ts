import { NextRequest, NextResponse } from "next/server";
import { authPreflight } from "@/lib/authRoutes";
import { resendSignupCode } from "@/lib/supabaseAuth";
import { reportCodeSend } from "@/lib/signupHealth";
import { checkRateLimit } from "@/lib/rateLimit";
import { clearWrongCodes } from "@/lib/signupCodeAttempts";

export const dynamic = "force-dynamic";

/** Seconds between codes for one address: Supabase's own gap, so the
 *  code screen's countdown and both limits agree (T157, T240). */
export const RESEND_GAP_SECONDS = 60;

/** Sends the sign-up code again, by email address alone: no password or
 *  robot check, so a stale one can't get in the way (T240). Same answer
 *  whatever the address, except when the code couldn't go out:
 *  { status: "sent" } or { status: "not-sent", reason, retryAfterSec }. */
export async function POST(req: NextRequest) {
  const pre = await authPreflight(req, { limitKey: "resend", perIp: 10, captcha: false });
  if ("stop" in pre) return pre.stop;
  // One a minute per address, on the server too (security pack T157): the
  // form's own countdown was the only one.
  if ((await checkRateLimit(`resend-cooldown:${pre.email}`, 1, RESEND_GAP_SECONDS, { failClosed: true })).limited) {
    return NextResponse.json(
      { error: "Please wait a minute before asking for another code.", reason: "rate_limited", retryAfterSec: RESEND_GAP_SECONDS },
      { status: 429 },
    );
  }
  const res = await resendSignupCode(pre.email, pre.ip);
  // A new code replaces the old one, so its wrong tries start again.
  if (res.ok) await clearWrongCodes(pre.email);
  const send = await reportCodeSend(res, "auth/resend-code");
  return NextResponse.json(send.sent ? { status: "sent" } : { status: "not-sent", ...send });
}
