import "server-only";
import { BULK_EMAIL_PAUSED_KEY } from "./kvMarkers";
import type { MinimalKVNamespace } from "./rateLimit";

/**
 * Once a bulk send has stopped for the day (Resend's daily limit, or the
 * room kept for sign-up codes, lib/sendEmail.ts bulkShouldPause), every
 * bulk send waits 12 hours before trying again: otherwise each hourly run
 * of the weekly deals email would send one more and find out again.
 */
const PAUSE_SECONDS = 12 * 60 * 60;

export async function bulkEmailPaused(kv: MinimalKVNamespace): Promise<boolean> {
  return Boolean(await kv.get(BULK_EMAIL_PAUSED_KEY).catch(() => null));
}

export async function pauseBulkEmail(kv: MinimalKVNamespace): Promise<void> {
  await kv.put(BULK_EMAIL_PAUSED_KEY, new Date().toISOString(), { expirationTtl: PAUSE_SECONDS }).catch(() => {});
}
