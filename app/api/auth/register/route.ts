import { NextRequest, NextResponse } from "next/server";
import { authPreflight, PASSWORD_RULE, passwordOk } from "@/lib/authRoutes";
import { signUp, signUpHitExistingAccount } from "@/lib/supabaseAuth";
import { afterResponse } from "@/lib/afterResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { brandedEmailHtml } from "@/lib/emailTemplate";
import { SITE_URL } from "@/lib/siteConfig";
import { BREACHED_PASSWORD_MESSAGE, passwordSeenInBreaches } from "@/lib/pwnedPassword";
import { codeDidNotGoOut, noteSignupCodeProblem } from "@/lib/signupHealth";

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
  if (await passwordSeenInBreaches(pre.body.password)) return NextResponse.json({ error: BREACHED_PASSWORD_MESSAGE }, { status: 400 });
  const res = await signUp(pre.email, pre.body.password, pre.ip);
  if (!res.ok && res.code === "weak_password") return NextResponse.json({ error: "Choose a stronger password: longer, and not a common one." }, { status: 400 });
  if (!res.ok && !["user_already_exists", "email_exists", "over_email_send_rate_limit"].includes(res.code)) {
    console.error("[auth/register] refused", res.status, res.code);
    // Everyone's sign-up stops on this: Needs attention, and an email.
    if (codeDidNotGoOut(res)) await noteSignupCodeProblem(res.code);
    return NextResponse.json({ error: "We couldn't create your account just now. Please try again." }, { status: 502 });
  }
  // One business per email: the address already has an account (Supabase
  // won't make a second, and sends nothing). Without this the visitor
  // waited for a code that never came. The reply stays the same, so it
  // still can't be used to find out who has signed up, and the email
  // goes after it, so the timing doesn't tell either. At most twice a day
  // per address, so it can't be used to pester someone.
  if (res.ok && signUpHitExistingAccount(res.data)) {
    const to = pre.email;
    afterResponse(async () => {
      if ((await checkRateLimit(`register-exists:${to.toLowerCase()}`, 2, 24 * 60 * 60)).limited) return;
      const ok = await sendTransactionalEmail({ to, subject: "You already have a MegaDeal business account", html: alreadyHaveAccountHtml() });
      if (!ok) console.error("[auth/register] 'already have an account' email failed");
    });
  }
  return NextResponse.json({ status: "verify" });
}

function alreadyHaveAccountHtml(): string {
  const signIn = `${SITE_URL}/portal`;
  return brandedEmailHtml(`
    <p style="margin:0 0 16px;">Hi there,</p>
    <p style="margin:0 0 16px;">Someone (hopefully you) just tried to sign up to MegaDeal with this email address. It already has a business account, and each email can have one business.</p>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${signIn}" style="display:inline-block;background:#6520B5;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Sign in to your business portal</a>
    </p>
    <p style="margin:0 0 16px;">Forgotten your password? On the sign-in page, enter your email and tap &ldquo;Forgot password&rdquo;. To list a second, different business, sign up with a different email address.</p>
    <p style="margin:0 0 16px;">If this wasn't you, you can ignore this email: nothing has changed on your account.</p>
  `);
}
