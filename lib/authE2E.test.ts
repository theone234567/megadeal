import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createHmac } from "crypto";

/**
 * Business logins end to end against a real Supabase Auth server and a
 * real Postgres laid out like a Supabase project (accounts and businesses
 * in one database). Runs only when that's available locally:
 *
 *   E2E_AUTH=1 (scratchpad gotrue/reset-e2e.sh sets the server up)
 *
 * The routes are the real ones; only the robot check is off and email is
 * caught (the Auth server's hook goes to a local catcher, read below).
 */

const ENABLED = process.env.E2E_AUTH === "1";
const DIR = process.env.E2E_AUTH_DIR ?? "";
const SITE = "https://megadeal.co.nz";
const JWT_SECRET = "local-test-jwt-secret-at-least-32-characters-long";

const kv = new Map<string, string>();
vi.mock("@/lib/rateLimit", async (orig) => ({
  ...(await orig<typeof import("./rateLimit")>()),
  getRateLimitKv: async () => ({
    get: async (k: string) => kv.get(k) ?? null,
    put: async (k: string, v: string) => void kv.set(k, v),
    delete: async (k: string) => void kv.delete(k),
  }),
}));
const sent: { to: string; subject: string; html: string }[] = [];
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async (m: { to: string; subject: string; html: string }) => (sent.push(m), true) }));
vi.mock("@/lib/metaCapi", () => ({ sendMetaCapiEvent: async () => {} }));

function req(path: string, body?: unknown, cookies: Record<string, string> = {}, origin: string | null = SITE) {
  const headers: Record<string, string> = { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" };
  if (origin) headers.origin = origin;
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookie) headers.cookie = cookie;
  return new NextRequest(`${SITE}${path}`, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const cookiesOf = (res: Response) =>
  Object.fromEntries((res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0].split("=")).map(([k, ...v]) => [k, v.join("=")]));

/** The latest code the Auth server asked us to email to `email`. */
function latestCode(email: string): string {
  const lines = readFileSync(`${DIR}/mail.log`, "utf8").trim().split("\n").reverse();
  for (const l of lines) {
    const b = JSON.parse(JSON.parse(l).body);
    if (b.user.email === email) return b.email_data.token;
  }
  throw new Error(`no email for ${email}`);
}

describe.skipIf(!ENABLED)("business logins on Supabase, end to end", () => {
  const email = `owner+${Date.now()}@bistro.test`;
  const password = "correct horse battery staple";
  let session: Record<string, string> = {};

  beforeAll(async () => {
    process.env.AUTH_BACKEND = "supabase";
    process.env.DATA_BACKEND = "postgres";
    process.env.DATABASE_URL = "postgres://postgres:local-only@127.0.0.1:5432/megadeal_e2e";
    process.env.SUPABASE_AUTH_URL = "http://127.0.0.1:9999";
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = await new SignJWT({ role: "service_role" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(JWT_SECRET));
    process.env.TURNSTILE_DISABLED = "1";
    process.env.SEND_EMAIL_HOOK_SECRET = `v1,whsec_${readFileSync(`${DIR}/hook-secret`, "utf8").trim()}`;
  });
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterAll(() => {
    for (const k of ["AUTH_BACKEND", "DATA_BACKEND", "DATABASE_URL", "SUPABASE_AUTH_URL", "SUPABASE_JWT_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_DISABLED", "SEND_EMAIL_HOOK_SECRET"]) delete process.env[k];
  });

  it("signs up with an emailed code, and is signed in", async () => {
    const register = await import("@/app/api/auth/register/route");
    const r = await register.POST(req("/api/auth/register", { email, password }));
    expect(await r.json()).toEqual({ status: "verify" });

    const verify = await import("@/app/api/auth/verify/route");
    expect((await verify.POST(req("/api/auth/verify", { email, code: "000000" }))).status).toBe(400);
    const ok = await verify.POST(req("/api/auth/verify", { email, code: latestCode(email) }));
    expect(await ok.json()).toEqual({ status: "success" });
    session = cookiesOf(ok);
    expect(session.md_access).toMatch(/^eyJ/);
    expect(session.md_refresh).toBeTruthy();
    const setCookie = ok.headers.getSetCookie().join("\n");
    expect(setCookie).toMatch(/md_access=[^;]+;.*HttpOnly/i);
    expect(setCookie).toMatch(/md_refresh=[^;]+;.*Path=\/api/i);

    const me = await import("@/app/api/auth/me/route");
    const who = await (await me.GET(req("/api/auth/me", undefined, session))).json();
    expect(who.member).toMatchObject({ email, loginEmailVerified: true });
  });

  it("the signed-in business applies, and the application is linked to its login", async () => {
    const apply = await import("@/app/api/merchants/apply/route");
    const res = await apply.POST(
      req("/api/merchants/apply", { businessName: "E2E Bistro", contactName: "Sam", contactPhone: "021 123 4567", legalBusinessName: "E2E Bistro Ltd", nzbn: "9429000000009", phone: "09 123 4567", category: "Food & Drink", priceRange: "$$", agreedToTerms: true }, session)
    );
    expect(res.status).toBe(200);
    const { withDb } = await import("./db/connection");
    const [row] = await withDb((db) => db.query("select m.business_name, u.email from public.merchants m join auth.users u on u.id = m.owner_id where lower(m.email) = $1", [email]));
    expect(row).toEqual({ business_name: "E2E Bistro", email });
  });

  it("refuses a sign-in from another site, and a forged or tampered token", async () => {
    const login = await import("@/app/api/auth/login/route");
    expect((await login.POST(req("/api/auth/login", { email, password }, {}, "https://evil.example"))).status).toBe(403);
    expect((await login.POST(req("/api/auth/login", { email, password }, {}, null))).status).toBe(403);

    const { verifyAccessToken } = await import("./authSession");
    const [h, p] = session.md_access.split(".");
    const claims = JSON.parse(Buffer.from(p, "base64url").toString());
    const unsigned = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${p}.`;
    const wrongKey = await new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("not-the-secret-not-the-secret-not-the-secret"));
    const tampered = `${h}.${Buffer.from(JSON.stringify({ ...claims, sub: "00000000-0000-0000-0000-000000000001" })).toString("base64url")}.${session.md_access.split(".")[2]}`;
    for (const t of [unsigned, wrongKey, tampered, "", "x".repeat(5000)]) expect(await verifyAccessToken(t)).toBeNull();
    expect(await verifyAccessToken(session.md_access)).toMatchObject({ email });
  });

  it("signs out, and the old token stops working at once", async () => {
    const logout = await import("@/app/api/auth/logout/route");
    const out = await logout.POST(req("/api/auth/logout", {}, session));
    expect(cookiesOf(out).md_access).toBe("");
    const me = await import("@/app/api/auth/me/route");
    expect((await (await me.GET(req("/api/auth/me", undefined, session))).json()).member).toBeNull();
  });

  it("signs in with the password; a wrong one and an unknown address get the same answer", async () => {
    const login = await import("@/app/api/auth/login/route");
    const wrong = await (await login.POST(req("/api/auth/login", { email, password: "nope nope nope" }))).json();
    const unknown = await (await login.POST(req("/api/auth/login", { email: "nobody@bistro.test", password: "nope nope nope" }))).json();
    expect(wrong).toEqual(unknown);
    const ok = await login.POST(req("/api/auth/login", { email, password }));
    expect(await ok.json()).toEqual({ status: "success" });
    session = cookiesOf(ok);
  });

  it("a business brought over from Wix sets its password from an emailed link, and its business is its own", async () => {
    const wixEmail = `imported+${Date.now()}@cafe.test`;
    const { withDb } = await import("./db/connection");
    await withDb((db) =>
      db.query("insert into public.merchants (email, business_name, status, wix_owner_id) values ($1, 'Imported Cafe', 'Approved', 'wix-member-9')", [wixEmail])
    );
    const request = await import("@/app/api/auth/request-password-reset/route");
    await request.POST(req("/api/auth/request-password-reset", { email: wixEmail }));
    const link = sent.find((m) => m.to.toLowerCase() === wixEmail)!.html.match(/reset-password\?token=([0-9a-f]+)/)![1];

    const confirm = await import("@/app/api/auth/confirm-password-reset/route");
    expect((await confirm.POST(req("/api/auth/confirm-password-reset", { token: link, newPassword: "short" }))).status).toBe(400);
    expect((await confirm.POST(req("/api/auth/confirm-password-reset", { token: link, newPassword: "a brand new long password" }))).status).toBe(200);
    // The link worked once.
    expect((await confirm.POST(req("/api/auth/confirm-password-reset", { token: link, newPassword: "a brand new long password" }))).status).toBe(400);

    const login = await import("@/app/api/auth/login/route");
    const signedIn = await login.POST(req("/api/auth/login", { email: wixEmail, password: "a brand new long password" }));
    expect(await signedIn.json()).toEqual({ status: "success" });
    const me = await import("@/app/api/merchants/me/route");
    const mine = await me.GET(req("/api/merchants/me", undefined, cookiesOf(signedIn)));
    expect(JSON.stringify(await mine.json())).toContain("Imported Cafe");
  });

  it("a password reset signs out everywhere else", async () => {
    const request = await import("@/app/api/auth/request-password-reset/route");
    sent.length = 0;
    await request.POST(req("/api/auth/request-password-reset", { email }));
    const link = sent[0].html.match(/reset-password\?token=([0-9a-f]+)/)![1];
    const confirm = await import("@/app/api/auth/confirm-password-reset/route");
    await confirm.POST(req("/api/auth/confirm-password-reset", { token: link, newPassword: "another long new password" }));
    const me = await import("@/app/api/auth/me/route");
    expect((await (await me.GET(req("/api/auth/me", undefined, session))).json()).member).toBeNull();
  });

  it("the email hook sends only what Supabase signed, recently", async () => {
    const hook = await import("@/app/api/auth/email-hook/route");
    const body = JSON.stringify({ user: { email: "hook@bistro.test" }, email_data: { token: "123456", email_action_type: "signup" } });
    const key = Buffer.from(readFileSync(`${DIR}/hook-secret`, "utf8").trim(), "base64");
    const signed = (id: string, ts: number, b = body) =>
      new NextRequest(`${SITE}/api/auth/email-hook`, {
        method: "POST",
        body: b,
        headers: { "webhook-id": id, "webhook-timestamp": String(ts), "webhook-signature": `v1,${createHmac("sha256", key).update(`${id}.${ts}.${b}`).digest("base64")}` },
      });
    sent.length = 0;
    const now = Math.floor(Date.now() / 1000);
    expect((await hook.POST(signed("msg_1", now))).status).toBe(200);
    expect(sent[0]).toMatchObject({ to: "hook@bistro.test", subject: "123456 is your MegaDeal sign-up code" });
    // Old, re-signed with a changed body, or unsigned: refused.
    expect((await hook.POST(signed("msg_2", now - 3600))).status).toBe(401);
    const forged = signed("msg_3", now);
    const tamperedBody = body.replace("hook@", "victim@");
    expect((await hook.POST(new NextRequest(forged.url, { method: "POST", body: tamperedBody, headers: forged.headers }))).status).toBe(401);
    expect((await hook.POST(new NextRequest(`${SITE}/api/auth/email-hook`, { method: "POST", body }))).status).toBe(401);
    // Kinds of email the site doesn't use aren't sent.
    const magic = body.replace('"signup"', '"magiclink"');
    expect((await hook.POST(signed("msg_4", now, magic))).status).toBe(400);
    expect(sent).toHaveLength(1);
  });
});
