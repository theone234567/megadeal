import { describe, it, expect, beforeAll } from "vitest";
import { hasValidAdminSignature } from "./adminCookie";
import { createAdminSessionToken } from "./adminSession";

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret-for-vitest";
});

describe("hasValidAdminSignature (the middleware's Web Crypto check)", () => {
  it("accepts a token signed by the real admin login (Node crypto)", async () => {
    expect(await hasValidAdminSignature(createAdminSessionToken())).toBe(true);
  });

  it("rejects a tampered token", async () => {
    const [issued, expires, sig] = createAdminSessionToken().split(".");
    const later = String(Number(expires) + 1000);
    expect(await hasValidAdminSignature(`${issued}.${later}.${sig}`)).toBe(false);
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(await hasValidAdminSignature(`${issued}.${expires}.${flipped}`)).toBe(false);
  });

  it("rejects an expired token even if its signature is valid", async () => {
    const { createHmac } = await import("crypto");
    const issued = Date.now() - 20 * 60 * 60 * 1000;
    const expires = Date.now() - 1000;
    const payload = `${issued}.${expires}`;
    const sig = createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("hex");
    expect(await hasValidAdminSignature(`${payload}.${sig}`)).toBe(false);
  });

  it("rejects missing, malformed or wrong-secret tokens", async () => {
    expect(await hasValidAdminSignature(undefined)).toBe(false);
    expect(await hasValidAdminSignature("")).toBe(false);
    expect(await hasValidAdminSignature("a.b")).toBe(false);
    expect(await hasValidAdminSignature(`1.${Date.now() + 60000}.nothex`)).toBe(false);
    const token = createAdminSessionToken();
    process.env.ADMIN_SESSION_SECRET = "a-different-secret";
    expect(await hasValidAdminSignature(token)).toBe(false);
    process.env.ADMIN_SESSION_SECRET = "test-secret-for-vitest";
  });
});
