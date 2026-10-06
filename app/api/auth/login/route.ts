import { NextRequest, NextResponse } from "next/server";
import { authPreflight } from "@/lib/authRoutes";
import { setSessionCookies } from "@/lib/authSession";
import { resendSignupCode, signInWithPassword } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

/**
 * Signs a business in with email and password. A wrong password and an
 * unknown address get the same answer. An account whose email was never
 * confirmed gets a fresh code and is asked for it, as Wix did.
 */
export async function POST(req: NextRequest) {
  const pre = await authPreflight(req, { limitKey: "login", perIp: 20, captcha: true });
  if ("stop" in pre) return pre.stop;
  const password = typeof pre.body.password === "string" ? pre.body.password.slice(0, 200) : "";
  if (!password) return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  const res = await signInWithPassword(pre.email, password, pre.ip);
  if (res.ok) {
    const out = NextResponse.json({ status: "success" });
    setSessionCookies(out, res.data);
    return out;
  }
  if (res.code === "email_not_confirmed") {
    await resendSignupCode(pre.email, pre.ip);
    return NextResponse.json({ status: "verify" });
  }
  if (res.code === "invalid_credentials") {
    return NextResponse.json({ error: 'That email and password don\'t match. Try again, or use "Forgot password".' }, { status: 400 });
  }
  console.error("[auth/login] refused", res.status, res.code);
  return NextResponse.json({ error: "We couldn't sign you in just now. Please try again." }, { status: res.status === 429 ? 429 : 502 });
}
