import { NextRequest, NextResponse } from "next/server";
import { authPreflight } from "@/lib/authRoutes";
import { resendSignupCode } from "@/lib/supabaseAuth";
import { codeDidNotGoOut, noteSignupCodeProblem } from "@/lib/signupHealth";

export const dynamic = "force-dynamic";

/** Sends the sign-up code again. Same answer whatever the address. */
export async function POST(req: NextRequest) {
  const pre = await authPreflight(req, { limitKey: "resend", perIp: 10, captcha: false });
  if ("stop" in pre) return pre.stop;
  const res = await resendSignupCode(pre.email, pre.ip);
  if (!res.ok && res.code !== "over_email_send_rate_limit") console.error("[auth/resend-code] refused", res.status, res.code);
  if (!res.ok && codeDidNotGoOut(res)) await noteSignupCodeProblem(res.code);
  return NextResponse.json({ status: "sent" });
}
