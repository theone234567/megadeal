import type { AuthOutcome } from "./wixAuth";

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

async function post(path: string, body: unknown): Promise<{ ok: boolean; json: Record<string, any> }> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

const toOutcome = (r: { ok: boolean; json: Record<string, any> }, email: string): AuthOutcome =>
  r.json.status === "success"
    ? { status: "success" }
    : r.json.status === "verify"
      ? { status: "verify", pendingState: { email }, email }
      : { status: "error", message: r.json.error || "Something went wrong. Please try again." };

export async function registerMember(_client: unknown, email: string, password: string, _nickname: string, captcha?: Captcha): Promise<AuthOutcome> {
  return toOutcome(await post("/api/auth/register", { email, password, captchaToken: captchaOf(captcha) }), email);
}

export async function loginMember(_client: unknown, email: string, password: string, captcha?: Captcha): Promise<AuthOutcome> {
  return toOutcome(await post("/api/auth/login", { email, password, captchaToken: captchaOf(captcha) }), email);
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
