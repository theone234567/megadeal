import "server-only";

/**
 * Business logins on Supabase Auth (step 3 of docs/WIX-MIGRATION.md), called
 * only from this site's server: the browser never talks to Supabase, so
 * every sign-in goes through our own rate limits and robot check, and no
 * key is ever in the page.
 *
 * Supabase owns the passwords (hashing, storage, the 6-digit email codes);
 * this file relays its answers as plain outcomes. Its own error text is
 * never shown to anyone: each route turns `code` into our own wording.
 *
 *   AUTH_BACKEND=supabase   (only together with DATA_BACKEND=postgres)
 *   SUPABASE_URL            https://<project>.supabase.co
 *   SUPABASE_ANON_KEY       the project's public (anon / publishable) key
 *   SUPABASE_SERVICE_ROLE_KEY   secret; only for setting a password after
 *                               an emailed reset link (adminSetPassword)
 *   SUPABASE_AUTH_URL       optional, the Auth server directly (local tests)
 */

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}

export type AuthOutcome<T> = { ok: true; data: T } | { ok: false; status: number; code: string };

export function authBase(): string {
  const direct = process.env.SUPABASE_AUTH_URL;
  if (direct) return direct.replace(/\/$/, "");
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL isn't set.");
  return `${url.replace(/\/$/, "")}/auth/v1`;
}

/** Legacy Supabase keys are JWTs (three base64url parts, starting "eyJ"). */
export function isJwtKey(key: string): boolean {
  return /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(key);
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; bearer?: string; ip?: string; service?: boolean }
): Promise<AuthOutcome<T>> {
  const key = init.service ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.apikey = key;
  // The key also goes in Authorization only when it's a legacy JWT key
  // (anon / service_role, "eyJ…"). The newer publishable and secret keys
  // (sb_publishable_…, sb_secret_…) aren't JWTs: Supabase reads them from
  // `apikey` and supplies the role itself, and as a bearer token they'd be
  // taken for a broken session.
  const bearer = init.bearer ?? (key && isJwtKey(key) ? key : undefined);
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  // The visitor's address, for Supabase's own per-address limits (every
  // request comes from this server otherwise). Ours run first regardless.
  if (init.ip && init.ip !== "unknown") headers["X-Forwarded-For"] = init.ip;
  let res: Response;
  try {
    res = await fetch(`${authBase()}${path}`, {
      method: init.method ?? "POST",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // Generous: a sign-up waits on Supabase's email hook (up to 5 s).
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error("[supabaseAuth] unreachable", path, err);
    return { ok: false, status: 503, code: "unavailable" };
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    return { ok: false, status: res.status, code: String(json.error_code ?? json.code ?? json.error ?? "unknown") };
  }
  return { ok: true, data: json as T };
}

const session = (s: AuthOutcome<AuthSession>): AuthOutcome<AuthSession> =>
  s.ok && (!s.data?.access_token || !s.data?.refresh_token) ? { ok: false, status: 502, code: "no_session" } : s;

/** A new account; Supabase emails a 6-digit code (our email hook sends it). */
export const signUp = (email: string, password: string, ip?: string) =>
  call<{ id?: string; identities?: unknown[] }>("/signup", { body: { email, password }, ip });

/** Supabase's answer to signing up with an address that already has a
 *  confirmed account: a made-up user with no identities, and no email sent
 *  (so the reply can't reveal who has an account). */
export const signUpHitExistingAccount = (data: { identities?: unknown[] } | undefined) =>
  Array.isArray(data?.identities) && data.identities.length === 0;

/** Sends the sign-up code again. */
export const resendSignupCode = (email: string, ip?: string) => call<object>("/resend", { body: { type: "signup", email }, ip });

/** Exchanges the emailed sign-up code for a session, confirming the
 *  account. Each code works once. */
export const verifySignupCode = async (email: string, code: string, ip?: string) =>
  session(await call<AuthSession>("/verify", { body: { type: "signup", email, token: code }, ip }));

export const signInWithPassword = async (email: string, password: string, ip?: string) =>
  session(await call<AuthSession>("/token?grant_type=password", { body: { email, password }, ip }));

export const refreshSession = async (refreshToken: string) =>
  session(await call<AuthSession>("/token?grant_type=refresh_token", { body: { refresh_token: refreshToken } }));

/** Ends this session (its refresh token stops working). */
export const signOut = (accessToken: string) => call<object>("/logout?scope=local", { bearer: accessToken });

/**
 * Sets an account's password, creating the account if there isn't one
 * (a business brought over from Wix: Wix passwords can't be exported).
 * Only after the address is proven, by a one-time emailed link
 * (app/api/auth/confirm-password-reset), so the account is confirmed too.
 * `userId` is the existing account's, if any.
 */
export async function adminSetPassword(email: string, password: string, userId: string | null): Promise<AuthOutcome<{ id: string }>> {
  return userId
    ? call<{ id: string }>(`/admin/users/${encodeURIComponent(userId)}`, { method: "PUT", service: true, body: { password, email_confirm: true } })
    : call<{ id: string }>("/admin/users", { service: true, body: { email, password, email_confirm: true } });
}

/** Deletes a login outright (Admin > a business > Delete, for test
 *  businesses), ending its sessions with it. A login already gone counts
 *  as done. */
export async function adminDeleteUser(userId: string): Promise<AuthOutcome<object>> {
  const res = await call<object>(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE", service: true });
  return !res.ok && res.status === 404 ? { ok: true, data: {} } : res;
}
