import { NextRequest, NextResponse } from "next/server";
import { authPreflight } from "@/lib/authRoutes";
import { resendSignupCode } from "@/lib/supabaseAuth";
import { codeDidNotGoOut, noteSignupCodeProblem } from "@/lib/signupHealth";
import { checkRateLimit } from "@/lib/rateLimit";
import { clearWrongCodes } from "@/lib/signupCodeAttempts";

export const dynamic = "force-dynamic";

/** Sends the sign-up code again. Same answer whatever the address. */
export async function POST(req: NextRequest) {
  const pre = await authPreflight(req, { limitKey: "resend", perIp: 10, captcha: false });
  if ("stop" in pre) return pre.stop;
  // One every 30 seconds per address, on the server too (security pack
  // T157): the form's own countdown was the only one.
  if ((await checkRateLimit(`resend-cooldown:${pre.email}`, 1, 30, { failClosed: true })).limited) {
    return NextResponse.json({ error: "A code was just sent. Please wait half a minute before asking for another." }, { status: 429 });
  }
  const res = await resendSignupCode(pre.email, pre.ip);
  // A new code replaces the old one, so its wrong tries start again.
  if (res.ok) await clearWrongCodes(pre.email);
  if (!res.ok && res.code !== "over_email_send_rate_limit") console.error("[auth/resend-code] refused", res.status, res.code);
  if (!res.ok && codeDidNotGoOut(res)) await noteSignupCodeProblem(res.code);
  return NextResponse.json({ status: "sent" });
}
