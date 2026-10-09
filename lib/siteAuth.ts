import type { AuthOutcome } from "./wixAuth";
import { turnstileProblemMessage } from "./turnstileClient";

/**
 * The browser side of MegaDeal's own business logins (app/api/auth/*):
 * the same three calls and outcomes as lib/wixAuth.ts, so the sign-up
 * and sign-in forms run unchanged on either. Nothing here talks to
 * Supabase; it only calls this site's routes, which set the session as
 * httpOnly cookies the page can't read.
 *
 * `captchaTokens` carries the Turnstile token (lib/turnstileClient.ts) in
 * whichever field the form fills.
 */

type Captcha = { recaptchaToken?: string | null; invisibleRecaptchaToken?: string | null } | undefined;
const captchaOf = (c: Captcha) => c?.recaptchaToken || c?.invisibleRecaptchaToken || "";

type Answer = { ok: boolean; status: number; json: Record<string, any> };

async function post(path: string, body: unknown): Promise<Answer> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}

/**
 * What to say when the answer isn't one of our routes' own (they always
 * give a sentence in `error`). A 403 or 429 then comes from Cloudflare in
 * front of the site: its leaked-password rule (a password seen in a data
 * breach) or its bot protection. A 5xx is the site or the login service
 * failing for a moment.
 */
export function fallbackMessage(status: number): string {
  if (status === 403 || status === 429) {
    return "Our security check stopped this attempt. If you've used this password on another site, it may have appeared in a data breach: use \u201cForgot password\u201d to choose a new one. Otherwise wait a minute and try again, with any VPN turned off.";
  }
  if (status >= 500) return "We couldn't reach our sign-in service just now. Please try again in a minute.";
  return "Something went wrong. Please try again.";
}

const toOutcome = (r: Answer, email: string): AuthOutcome =>
  r.json.status === "success"
    ? { status: "success" }
    : r.json.status === "verify"
      ? { status: "verify", pendingState: { email }, email }
      : { status: "error", message: typeof r.json.error === "string" && r.json.error ? r.json.error : fallbackMessage(r.status) };

/** With the robot check on, no token means it didn't run in this browser:
 *  say why there and then, rather than sending the form to be refused
 *  with a vaguer "didn't pass". */
function checkDidNotRun(captcha?: Captcha): AuthOutcome | null {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || captchaOf(captcha)) return null;
  return { status: "error", message: turnstileProblemMessage() };
}

export async function registerMember(_client: unknown, email: string, password: string, _nickname: string, captcha?: Captcha): Promise<AuthOutcome> {
  return checkDidNotRun(captcha) ?? toOutcome(await post("/api/auth/register", { email, password, captchaToken: captchaOf(captcha) }), email);
}

export async function loginMember(_client: unknown, email: string, password: string, captcha?: Captcha): Promise<AuthOutcome> {
  return checkDidNotRun(captcha) ?? toOutcome(await post("/api/auth/login", { email, password, captchaToken: captchaOf(captcha) }), email);
}

export async function submitVerificationCode(_client: unknown, code: string, pendingState: unknown): Promise<AuthOutcome> {
  const email = String((pendingState as { email?: string } | null)?.email ?? "");
  return toOutcome(await post("/api/auth/verify", { email, code }), email);
}

/** Sends the sign-up code again (Wix had no resend; its forms signed in
 *  again to trigger one). */
export async function resendCode(email: string): Promise<boolean> {
  return (await post("/api/auth/resend-code", { email })).ok;
}
