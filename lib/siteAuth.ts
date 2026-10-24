import { turnstileProblemMessage } from "./turnstileClient";

/**
 * The browser side of MegaDeal's business logins (app/api/auth/*). Nothing
 * here talks to Supabase; it only calls this site's routes, which set the
 * session as httpOnly cookies the page can't read. `captchaToken` is the
 * Turnstile token (lib/turnstileClient.ts).
 */

export type AuthOutcome =
  | { status: "success" }
  /** An account whose email isn't confirmed yet: a code has been emailed. */
  | { status: "verify"; pendingState: { email: string }; email: string }
  | { status: "error"; message: string };

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
function checkDidNotRun(captchaToken?: string | null): AuthOutcome | null {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || captchaToken) return null;
  return { status: "error", message: turnstileProblemMessage() };
}

export async function registerMember(email: string, password: string, captchaToken?: string | null): Promise<AuthOutcome> {
  return checkDidNotRun(captchaToken) ?? toOutcome(await post("/api/auth/register", { email, password, captchaToken: captchaToken ?? "" }), email);
}

export async function loginMember(email: string, password: string, captchaToken?: string | null): Promise<AuthOutcome> {
  return checkDidNotRun(captchaToken) ?? toOutcome(await post("/api/auth/login", { email, password, captchaToken: captchaToken ?? "" }), email);
}

/** `password`: the one just typed, if the screen still has it (it becomes
 *  the account's password once the code checks out: app/api/auth/verify). */
export async function submitVerificationCode(code: string, pendingState: { email: string } | null, password?: string): Promise<AuthOutcome> {
  const email = String(pendingState?.email ?? "");
  return toOutcome(await post("/api/auth/verify", { email, code, ...(password ? { password } : {}) }), email);
}

/** Sends the sign-up code again. */
export async function resendCode(email: string): Promise<boolean> {
  return (await post("/api/auth/resend-code", { email })).ok;
}
