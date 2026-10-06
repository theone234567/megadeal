import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { dataBackend, withDb } from "./db/connection";
import { authBase, refreshSession, type AuthSession } from "./supabaseAuth";
import type { VerifiedMember } from "./memberAuth";

/**
 * Sessions for business logins on Supabase (lib/supabaseAuth.ts): two
 * httpOnly cookies no script can read.
 *
 *  - the access token (a signed JWT, about an hour), sent with every page
 *    and API request;
 *  - the refresh token (30 days), sent only to /api, which renews the
 *    access token when it runs out.
 *
 * Every request checks the token's signature, audience and expiry, then
 * looks the account up in the database: a deleted or banned account is
 * locked out at once, not an hour later, and "email verified" comes from
 * the database, not the token (whose user_metadata the account holder
 * can edit).
 */

export const ACCESS_COOKIE = "md_access";
export const REFRESH_COOKIE = "md_refresh";
const REFRESH_DAYS = 30;

export type AuthBackend = "wix" | "supabase";

/** Supabase logins only with the new database: accounts and businesses
 *  live in one database there. */
export function authBackend(): AuthBackend {
  return process.env.AUTH_BACKEND === "supabase" && dataBackend() === "postgres" ? "supabase" : "wix";
}

const secure = process.env.NODE_ENV === "production";

export function setSessionCookies(res: NextResponse, s: AuthSession) {
  res.cookies.set(ACCESS_COOKIE, s.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(60, s.expires_in) });
  res.cookies.set(REFRESH_COOKIE, s.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/api", maxAge: REFRESH_DAYS * 86400 });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/api", maxAge: 0 });
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * The token's claims if Supabase signed it for a signed-in user and it
 * hasn't run out; otherwise null. Signed with the project's JWT secret
 * (SUPABASE_JWT_SECRET, HS256) or its signing keys (published at
 * /.well-known/jwks.json, ES256/RS256): only those algorithms are
 * accepted, so a token can't choose its own (e.g. "none").
 */
export async function verifyAccessToken(token: string): Promise<(JWTPayload & { sub: string }) | null> {
  if (!token || token.length > 4096) return null;
  try {
    const opts = { audience: "authenticated", ...(process.env.SUPABASE_JWT_ISSUER ? { issuer: process.env.SUPABASE_JWT_ISSUER } : {}) };
    const secret = process.env.SUPABASE_JWT_SECRET;
    const { payload } = secret
      ? await jwtVerify(token, new TextEncoder().encode(secret), { ...opts, algorithms: ["HS256"] })
      : await jwtVerify(token, (jwks ??= createRemoteJWKSet(new URL(`${authBase()}/.well-known/jwks.json`))), { ...opts, algorithms: ["ES256", "RS256"] });
    if (typeof payload.sub !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.sub)) return null;
    return payload as JWTPayload & { sub: string };
  } catch {
    return null;
  }
}

/** The account behind a token, from the database: null if it's gone,
 *  banned or not confirmed, or if this session has ended (signed out, or
 *  every session ended by a password reset), so those take effect at once
 *  rather than when the token runs out. */
async function accountFor(userId: string, sessionId: unknown): Promise<VerifiedMember | null> {
  if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const [row] = await withDb((db) =>
    db.query<{ id: string; email: string | null; confirmed: boolean; banned: boolean }>(
      `select u.id::text, u.email, u.email_confirmed_at is not null as confirmed,
              coalesce(u.banned_until > now(), false) as banned
         from auth.users u
         join auth.sessions s on s.user_id = u.id and s.id = $2 and (s.not_after is null or s.not_after > now())
        where u.id = $1 and u.deleted_at is null`,
      [userId, sessionId]
    )
  );
  if (!row || row.banned || !row.confirmed) return null;
  return { id: row.id, email: row.email, loginEmailVerified: row.confirmed, nickname: null };
}

/**
 * The signed-in business account for this request, or null. Renews an
 * expired access token from the refresh token (API requests only, where
 * that cookie is sent), setting the new cookies on the way out.
 */
export async function getSupabaseMember(req: NextRequest): Promise<VerifiedMember | null> {
  const claims = await verifyAccessToken(req.cookies.get(ACCESS_COOKIE)?.value ?? "");
  if (claims) return accountFor(claims.sub, claims.session_id);

  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const renewed = await refreshSession(refresh);
  if (!renewed.ok) return null;
  const fresh = await verifyAccessToken(renewed.data.access_token);
  if (!fresh) return null;
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    jar.set(ACCESS_COOKIE, renewed.data.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(60, renewed.data.expires_in) });
    jar.set(REFRESH_COOKIE, renewed.data.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/api", maxAge: REFRESH_DAYS * 86400 });
  } catch {
    // Not somewhere cookies can be set (a page render): the next API call renews.
  }
  return accountFor(fresh.sub, fresh.session_id);
}

/** The account id for an email address, or null. */
export async function accountIdForEmail(email: string): Promise<string | null> {
  const [row] = await withDb((db) =>
    db.query<{ id: string }>("select id::text from auth.users where lower(email) = lower($1) and deleted_at is null limit 1", [email])
  );
  return row?.id ?? null;
}

/** Ends every session an account has (after a password reset): anyone
 *  signed in with the old password is signed out at once. */
export async function endAllSessions(userId: string): Promise<void> {
  await withDb((db) => db.query("delete from auth.sessions where user_id = $1", [userId]));
}

/**
 * True when a state-changing request comes from this site's own pages.
 * Cookies are SameSite=Lax already; this is a second lock on the routes
 * that sign people in and out.
 */
export function fromOwnSite(req: NextRequest, siteUrl: string): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    return o.host === new URL(siteUrl).host || (process.env.NODE_ENV !== "production" && /^(localhost|127\.0\.0\.1)$/.test(o.hostname));
  } catch {
    return false;
  }
}
