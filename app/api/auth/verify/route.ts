import { NextRequest, NextResponse } from "next/server";
import { authPreflight } from "@/lib/authRoutes";
import { setSessionCookies } from "@/lib/authSession";
import { verifySignupCode } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

/** The 6-digit sign-up code from the email: confirms the account and
 *  signs it in. Limited per address (lib/authRoutes.ts) so a code can't
 *  be guessed; each code works once and runs out after 10 minutes. */
export async function POST(req: NextRequest) {
  const pre = await authPreflight(req, { limitKey: "verify", perIp: 30, captcha: false });
  if ("stop" in pre) return pre.stop;
  const code = typeof pre.body.code === "string" ? pre.body.code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });
  const res = await verifySignupCode(pre.email, code, pre.ip);
  if (!res.ok) return NextResponse.json({ error: "That code isn't right or has run out. Check the latest email, or send a new code." }, { status: 400 });
  const out = NextResponse.json({ status: "success" });
  setSessionCookies(out, res.data);
  return out;
}
