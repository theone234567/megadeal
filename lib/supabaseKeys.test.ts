import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminSetPassword, isJwtKey, resendSignupCode, signOut } from "./supabaseAuth";

/**
 * Supabase keys in requests (lib/supabaseAuth.ts): legacy keys are JWTs and
 * go in both `apikey` and Authorization, as supabase-js sends them; the newer
 * sb_publishable_ / sb_secret_ keys aren't JWTs and go in `apikey` only.
 */

const LEGACY_ANON = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl";
const LEGACY_SERVICE = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl";

const calls: { url: string; headers: Record<string, string> }[] = [];

beforeEach(() => {
  calls.length = 0;
  vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co");
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string> });
    return new Response(JSON.stringify({ id: "u1" }), { status: 200 });
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Supabase keys", () => {
  it("tells the two kinds apart", () => {
    expect(isJwtKey(LEGACY_ANON)).toBe(true);
    expect(isJwtKey("sb_publishable_abc123")).toBe(false);
    expect(isJwtKey("sb_secret_abc123")).toBe(false);
    expect(isJwtKey("eyJnot-a-jwt")).toBe(false);
  });

  it("legacy keys go in apikey and Authorization", async () => {
    vi.stubEnv("SUPABASE_ANON_KEY", LEGACY_ANON);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", LEGACY_SERVICE);
    await resendSignupCode("a@b.nz");
    await adminSetPassword("a@b.nz", "long-password-1", null);
    expect(calls[0].headers).toMatchObject({ apikey: LEGACY_ANON, Authorization: `Bearer ${LEGACY_ANON}` });
    expect(calls[1].headers).toMatchObject({ apikey: LEGACY_SERVICE, Authorization: `Bearer ${LEGACY_SERVICE}` });
  });

  it("new keys go in apikey only", async () => {
    vi.stubEnv("SUPABASE_ANON_KEY", "sb_publishable_abc123");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_abc123");
    await resendSignupCode("a@b.nz");
    await adminSetPassword("a@b.nz", "long-password-1", null);
    expect(calls[0].headers.apikey).toBe("sb_publishable_abc123");
    expect(calls[0].headers.Authorization).toBeUndefined();
    expect(calls[1].headers.apikey).toBe("sb_secret_abc123");
    expect(calls[1].headers.Authorization).toBeUndefined();
  });

  it("a signed-in business's own token is still sent as the bearer", async () => {
    vi.stubEnv("SUPABASE_ANON_KEY", "sb_publishable_abc123");
    await signOut("user-access-token");
    expect(calls[0].headers).toMatchObject({ apikey: "sb_publishable_abc123", Authorization: "Bearer user-access-token" });
  });
});
