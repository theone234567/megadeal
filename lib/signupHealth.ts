import "server-only";
import { afterResponse } from "./afterResponse";
import { SIGNUP_ALERT_SENT_KEY, SIGNUP_CODE_SENT_KEY, SIGNUP_PROBLEM_KEY } from "./kvMarkers";
import { getRateLimitKv } from "./rateLimit";
import { sendTransactionalEmail } from "./sendEmail";
import { brandedEmailHtml } from "./emailTemplate";
import { SITE_URL } from "./siteConfig";

/**
 * Whether account emails go out: the sign-up code and the password reset
 * link. If Supabase can't reach the email hook (Cloudflare's bot
 * protection back on, say) or an email can't be sent (Resend failing),
 * sign-up or "Forgot password" fails for everyone and only the person
 * trying sees it. So a failure is noted for Needs attention, and the admin
 * is emailed, once per few hours, until an account email goes out again.
 */

const ALERT_EVERY_SECONDS = 6 * 60 * 60;
const KEEP_SECONDS = 30 * 24 * 60 * 60;

/** A failure that stops the code going out: the login service or its
 *  email hook failing. Not a refusal about this person (already signed
 *  up, too many tries, a weak password), which are answers, not faults:
 *  so nothing with 429, which includes the hook's own per-address limit
 *  (otherwise asking for one address's code over and over would raise
 *  the alarm). */
export function codeDidNotGoOut(res: { ok: boolean; status?: number; code?: string }): boolean {
  if (res.ok || res.status === 429) return false;
  return (res.status ?? 0) >= 500 || String(res.code ?? "").startsWith("hook");
}

export type AccountEmail = "sign-up code" | "password reset";

/** What to check first: Supabase's request for a sign-up code passes
 *  Cloudflare, while a reset email is sent by the site through Resend. */
const CHECKS: Record<AccountEmail, string> = {
  "sign-up code":
    'Most likely, in this order: Cloudflare &gt; megadeal.co.nz &gt; Security: <strong>Bot fight mode</strong> must be off, and the rule <strong>"Let Supabase reach email hook"</strong> must be active. Then resend.com &gt; Emails, for a sending problem.',
  "password reset": "Most likely a sending problem: resend.com &gt; Emails shows why (a daily limit, or the domain needing attention).",
};

export async function noteSignupCodeProblem(code: string, kind: AccountEmail = "sign-up code"): Promise<void> {
  try {
    const kv = await getRateLimitKv();
    if (!kv) return;
    const reason = code.replace(/[^a-z0-9_ -]/gi, "").slice(0, 60);
    await kv.put(SIGNUP_PROBLEM_KEY, JSON.stringify({ at: new Date().toISOString(), code: reason, kind }), { expirationTtl: KEEP_SECONDS });
    const to = process.env.ADMIN_NOTIFY_EMAIL;
    if (!to || (await kv.get(SIGNUP_ALERT_SENT_KEY))) return;
    await kv.put(SIGNUP_ALERT_SENT_KEY, "1", { expirationTtl: ALERT_EVERY_SECONDS });
    const who =
      kind === "sign-up code"
        ? "A business just tried to sign up and the 6-digit code couldn't be sent. Until this is fixed, nobody new can finish signing up."
        : 'A business asked for a password reset and the email couldn\'t be sent. Until this is fixed, "Forgot password" doesn\'t work.';
    afterResponse(() =>
      sendTransactionalEmail({
        to,
        subject: kind === "sign-up code" ? "MegaDeal: new businesses can't get their sign-up code" : "MegaDeal: password reset emails aren't going out",
        html: brandedEmailHtml(`
          <p style="margin:0 0 16px;">${who} (${reason})</p>
          <p style="margin:0 0 16px;">${CHECKS[kind]}</p>
          <p style="margin:0;">Admin &gt; Needs attention shows this until an account email goes out again: <a href="${SITE_URL}/admin">${SITE_URL}/admin</a>. You'll get at most one of these emails every 6 hours.</p>
        `),
      })
    );
  } catch {
    // Noting a problem must never become one.
  }
}

/** Called when an account email (a sign-up code, a reset link) has gone out. */
export async function noteSignupCodeSent(): Promise<void> {
  await (await getRateLimitKv())?.put(SIGNUP_CODE_SENT_KEY, new Date().toISOString(), { expirationTtl: KEEP_SECONDS }).catch(() => {});
}

/** The latest failure, unless a code has gone out since. */
export async function signupCodeProblem(): Promise<{ at: string; code: string; kind?: AccountEmail } | null> {
  try {
    const kv = await getRateLimitKv();
    const raw = await kv?.get(SIGNUP_PROBLEM_KEY);
    if (!raw) return null;
    const problem = JSON.parse(raw) as { at: string; code: string; kind?: AccountEmail };
    const sent = await kv?.get(SIGNUP_CODE_SENT_KEY);
    return sent && new Date(sent) > new Date(problem.at) ? null : problem;
  } catch {
    return null;
  }
}
