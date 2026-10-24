import { NextRequest, NextResponse } from "next/server";
import { authPreflight, passwordOk } from "@/lib/authRoutes";
import { setSessionCookies } from "@/lib/authSession";
import { SIGNED_UP_AGAIN, setPasswordAfterCode, verifySignupCode } from "@/lib/supabaseAuth";
import { MAX_WRONG_CODES, TOO_MANY_WRONG_CODES, clearWrongCodes, noteWrongCode, wrongCodesSoFar } from "@/lib/signupCodeAttempts";

export const dynamic = "force-dynamic";

/** The 6-digit sign-up code from the email: confirms the account and
 *  signs it in. Limited per address and IP (lib/authRoutes.ts), and a code
 *  stops working after 5 wrong tries (lib/signupCodeAttempts.ts); each
 *  code works once and runs out after 10 minutes.
 *
 *  `password`: the one the code screen still has, if any. On an address
 *  signed up more than once it becomes the account's password: whoever
 *  proves the address chooses it, not an earlier sign-up by someone else
 *  (T241, lib/supabaseAuth.ts). */
export async function POST(req: NextRequest) {
  const pre = await authPreflight(req, { limitKey: "verify", perIp: 30, captcha: false, perEmailAndIp: true });
  if ("stop" in pre) return pre.stop;
  const code = typeof pre.body.code === "string" ? pre.body.code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });
  if ((await wrongCodesSoFar(pre.email)) >= MAX_WRONG_CODES) {
    return NextResponse.json({ error: TOO_MANY_WRONG_CODES, newCodeNeeded: true }, { status: 400 });
  }
  const res = await verifySignupCode(pre.email, code, pre.ip);
  if (!res.ok) {
    const left = await noteWrongCode(pre.email);
    if (left === 0) return NextResponse.json({ error: TOO_MANY_WRONG_CODES, newCodeNeeded: true }, { status: 400 });
    return NextResponse.json(
      {
        error: `That code isn't right or has run out. Check the latest email, or send a new code. ${left} ${left === 1 ? "try" : "tries"} left for this code.`,
        triesLeft: left,
      },
      { status: 400 },
    );
  }
  await clearWrongCodes(pre.email);
  let session = res.data;
  if (session.user?.app_metadata?.[SIGNED_UP_AGAIN]) {
    const password = typeof pre.body.password === "string" && passwordOk(pre.body.password) ? pre.body.password : null;
    const fresh = await setPasswordAfterCode(pre.email, session.user.id, password, pre.ip);
    // The email is confirmed either way; the sign-in page takes it from here.
    if (!fresh) return NextResponse.json({ error: "Your email is confirmed. Please sign in to carry on." }, { status: 409 });
    session = fresh;
  }
  const out = NextResponse.json({ status: "success" });
  setSessionCookies(out, session);
  return out;
}
