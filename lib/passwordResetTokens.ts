import { createHash, randomBytes } from "crypto";
import { getRateLimitKv } from "./rateLimit";

// 1 hour — tighter than Wix's own 3-hour reset links, since this is a
// self-hosted equivalent and there's no reason to leave a live link
// sitting in an inbox any longer than it needs to be.
const TTL_SECONDS = 60 * 60;
const KEY_PREFIX = "pwreset:";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Wix's own "forgot password" email 404s for this project (see
 * lib/wixPassword.ts) — it routes through a Wix-hosted page this headless
 * site has never published. This is the replacement: a single-use, hashed,
 * time-limited token stored in the same KV namespace the rate limiter
 * uses, emailed as a link to our own /reset-password page instead of a
 * Wix-managed one.
 *
 * Only the SHA-256 hash is ever stored — the raw token exists only in the
 * outgoing email and the visitor's browser, so a KV read (or a log line
 * that shouldn't have the raw value in it) can't be turned into a working
 * reset link.
 *
 * Returns null if the KV binding isn't configured — callers must treat
 * that as "can't process this request" (fail closed), not silently skip
 * sending the email, since there'd be nothing to validate the click against.
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const kv = await getRateLimitKv();
  if (!kv) return null;
  const raw = randomBytes(32).toString("hex");
  await kv.put(KEY_PREFIX + hashToken(raw), email, { expirationTtl: TTL_SECONDS });
  return raw;
}

/** Looks up and immediately deletes the token so it can't be replayed,
 *  regardless of whether the caller goes on to successfully use the email
 *  it returns. Returns null for a missing, expired, or already-used token. */
export async function consumePasswordResetToken(raw: string): Promise<string | null> {
  const kv = await getRateLimitKv();
  if (!kv) return null;
  const key = KEY_PREFIX + hashToken(raw);
  const email = await kv.get(key);
  if (!email) return null;
  await kv.delete(key);
  return email;
}
