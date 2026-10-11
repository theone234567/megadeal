import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db/testDb";

/**
 * Security audit of 10 Oct 2026, findings 2 and 3: reset links work once
 * and rate limits hold even when requests arrive at the same moment,
 * because the database reads and writes each in one statement. Run
 * against a real Postgres (PGlite) with every migration applied.
 */

let db: Awaited<ReturnType<typeof createTestDb>>["db"];
const kv = new Map<string, string>();

process.env.DATA_BACKEND = "postgres";
vi.mock("@/lib/db/connection", () => ({
  withDb: async (fn: (sql: { query: (text: string, params?: unknown[]) => Promise<unknown[]> }) => unknown) =>
    fn({ query: async (text, params) => (await db.query(text, params as any[])).rows }),
}));
// A KV that, like the real one, can't read and write in one step.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: {
      RATE_LIMIT_KV: {
        get: async (k: string) => {
          await new Promise((r) => setTimeout(r, 1));
          return kv.get(k) ?? null;
        },
        put: async (k: string, v: string) => void kv.set(k, v),
        delete: async (k: string) => void kv.delete(k),
      },
    },
  }),
}));

const { checkRateLimit } = await import("./rateLimit");
const tokens = await import("./passwordResetTokens");

beforeAll(async () => {
  db = (await createTestDb()).db;
});

beforeEach(async () => {
  kv.clear();
  await db.exec("delete from public.rate_limits; delete from public.password_reset_tokens;");
});

describe("rate limits (finding 3)", () => {
  it("lets exactly the limit through when 12 requests arrive at once", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => checkRateLimit("test-burst:1.2.3.4", 5, 60)));
    expect(results.filter((r) => !r.limited)).toHaveLength(5);
  });

  it("keeps no address or IP, only a hash of it", async () => {
    await checkRateLimit("pwreset-request:someone@example.com", 5, 60);
    const rows = (await db.query<{ key: string }>("select key from public.rate_limits")).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toMatch(/^pwreset-request:[a-f0-9]{64}$/);
    expect(rows[0].key).not.toContain("someone");
  });

  it("starts a fresh window once the old one has ended", async () => {
    for (let i = 0; i < 5; i++) await checkRateLimit("test-window:x", 5, 60);
    expect((await checkRateLimit("test-window:x", 5, 60)).limited).toBe(true);
    await db.exec("update public.rate_limits set window_end = now() - interval '1 second'");
    expect((await checkRateLimit("test-window:x", 5, 60)).limited).toBe(false);
  });
});

describe("password-reset links (finding 2)", () => {
  it("works once, even when used twice at the same moment", async () => {
    const raw = (await tokens.createPasswordResetToken("owner@example.com"))!;
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
    const both = await Promise.all([tokens.consumePasswordResetToken(raw), tokens.consumePasswordResetToken(raw)]);
    expect(both.filter(Boolean)).toHaveLength(1);
    expect(await tokens.consumePasswordResetToken(raw)).toBeNull();
  });

  it("stores only the hash, never the link itself", async () => {
    const raw = (await tokens.createPasswordResetToken("owner@example.com"))!;
    const rows = (await db.query<{ token_hash: string }>("select token_hash from public.password_reset_tokens")).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(raw);
    expect(kv.size).toBe(0);
  });

  it("refuses an expired link", async () => {
    const raw = (await tokens.createPasswordResetToken("owner@example.com"))!;
    await db.exec("update public.password_reset_tokens set expires_at = now() - interval '1 second'");
    expect(await tokens.consumePasswordResetToken(raw)).toBeNull();
  });

  it("can be put back after a failed password change, and every other link dies after a successful one", async () => {
    const first = (await tokens.createPasswordResetToken("Owner@example.com"))!;
    const second = (await tokens.createPasswordResetToken("owner@example.com", 7 * 24 * 3600))!;
    const used = (await tokens.consumePasswordResetToken(first))!;
    expect(used.email).toBe("Owner@example.com");
    await tokens.restorePasswordResetToken(first, used);
    expect(await tokens.consumePasswordResetToken(first)).not.toBeNull();
    await tokens.revokePasswordResetTokens("owner@example.com");
    expect(await tokens.consumePasswordResetToken(second)).toBeNull();
  });

  it("still accepts a link made before the database held them (KV)", async () => {
    const { createHash } = await import("crypto");
    const raw = "a".repeat(64);
    kv.set("pwreset:" + createHash("sha256").update(raw).digest("hex"), "old@example.com");
    expect((await tokens.consumePasswordResetToken(raw))?.email).toBe("old@example.com");
    expect(await tokens.consumePasswordResetToken(raw)).toBeNull();
  });
});
