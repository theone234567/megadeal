import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { authBackend, fromOwnSite } from "./authSession";
import { checkRateLimit, getClientIp } from "./rateLimit";
import { verifyTurnstile } from "./turnstile";
import { SITE_URL } from "./siteConfig";

/** What every sign-in route checks first, in this order. Returns a
 *  response to send instead, or the parsed body to carry on with. */
export async function authPreflight(
  req: NextRequest,
  opts: { limitKey: string; perIp: number; captcha: boolean }
): Promise<{ stop: NextResponse } | { body: Record<string, unknown>; ip: string; email: string }> {
  const stop = (error: string, status: number) => ({ stop: NextResponse.json({ error }, { status }) });
  if (authBackend() !== "supabase") return stop("Not available.", 404);
  if (!fromOwnSite(req, SITE_URL)) return stop("Please use the form on megadeal.co.nz.", 403);
  const ip = getClientIp(req);
  if ((await checkRateLimit(`${opts.limitKey}-ip:${ip}`, opts.perIp, 15 * 60)).limited) {
    return stop("Too many attempts. Please wait a few minutes and try again.", 429);
  }
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return stop("Enter a valid email address.", 400);
  // The robot check before the per-address limit: otherwise anyone could
  // lock a business out of signing in by sending junk for its address,
  // without solving a single check.
  if (opts.captcha && !(await verifyTurnstile(body.captchaToken, ip))) {
    return stop("The security check didn't pass. Please try again.", 400);
  }
  // Per address too, so one account can't be hammered from many places.
  if ((await checkRateLimit(`${opts.limitKey}-email:${email}`, 10, 15 * 60)).limited) {
    return stop("Too many attempts for this email. Please wait a few minutes and try again.", 429);
  }
  return { body, ip, email };
}

export const PASSWORD_RULE = "Use at least 10 characters for your password.";
export const passwordOk = (p: unknown): p is string => typeof p === "string" && p.length >= 10 && p.length <= 200;
