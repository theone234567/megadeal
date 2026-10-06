import { NextRequest, NextResponse } from "next/server";
import { authPreflight, PASSWORD_RULE, passwordOk } from "@/lib/authRoutes";
import { signUp } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

/**
 * Creates a business account; Supabase then emails a 6-digit code
 * (app/api/auth/email-hook) to enter at /api/auth/verify. The answer is
 * the same whether or not the address already has an account, so this
 * can't be used to find out who has signed up.
 */
export async function POST(req: NextRequest) {
  const pre = await authPreflight(req, { limitKey: "register", perIp: 10, captcha: true });
  if ("stop" in pre) return pre.stop;
  if (!passwordOk(pre.body.password)) return NextResponse.json({ error: PASSWORD_RULE }, { status: 400 });
  const res = await signUp(pre.email, pre.body.password, pre.ip);
  if (!res.ok && res.code === "weak_password") return NextResponse.json({ error: "Choose a stronger password: longer, and not a common one." }, { status: 400 });
  if (!res.ok && !["user_already_exists", "email_exists", "over_email_send_rate_limit"].includes(res.code)) {
    console.error("[auth/register] refused", res.status, res.code);
    return NextResponse.json({ error: "We couldn't create your account just now. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ status: "verify" });
}
