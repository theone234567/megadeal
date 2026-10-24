import { turnstileProblemMessage } from "./turnstileClient";

/**
 * The browser side of MegaDeal's business logins (app/api/auth/*). Nothing
 * here talks to Supabase; it only calls this site's routes, which set the
 * session as httpOnly cookies the page can't read. `captchaToken` is the
 * Turnstile token (lib/turnstileClient.ts).
 */

export type AuthOutcome =
  | { status: "success" }
  /** An account whose email isn't confirmed yet: a code has been emailed,
   *  unless `codeSent` is false (it couldn't go out just now; Resend can
   *  try again in `retryAfterSec`). */
  | { status: "verify"; pendingState: { email: string }; email: string; codeSent: boolean; retryAfterSec?: number }
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

const retryAfter = (json: Record<string, any>) => (typeof json.retryAfterSec === "number" && json.retryAfterSec > 0 ? Math.ceil(json.retryAfterSec) : undefined);

const toOutcome = (r: Answer, email: string): AuthOutcome =>
  r.json.status === "success"
    ? { status: "success" }
    : r.json.status === "verify"
      ? { status: "verify", pendingState: { email }, email, codeSent: r.json.sent !== false, retryAfterSec: retryAfter(r.json) }
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

/** Sends the sign-up code again, by email address alone (T240). When it
 *  couldn't go out: how long until it can be tried again, and the route's
 *  own sentence if it gave one. */
export async function resendCode(email: string): Promise<{ sent: true } | { sent: false; retryAfterSec?: number; message?: string }> {
  const r = await post("/api/auth/resend-code", { email });
  if (r.ok && r.json.status === "sent") return { sent: true };
  return { sent: false, retryAfterSec: retryAfter(r.json), message: typeof r.json.error === "string" ? r.json.error : undefined };
}

/** "1 minute", "45 seconds": how long until Resend can be tried again. */
export function waitText(seconds: number): string {
  if (seconds >= 90) return `${Math.ceil(seconds / 60)} minutes`;
  if (seconds >= 60) return "1 minute";
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

/** What the code screen says when the code couldn't be sent (T240). */
export function codeNotSentText(seconds?: number): string {
  return `We couldn't send the email just now. Try Resend in ${waitText(seconds ?? 60)}.`;
}
