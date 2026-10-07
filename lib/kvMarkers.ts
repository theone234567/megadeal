/**
 * Small notes the site keeps in RATE_LIMIT_KV so Moving off Wix
 * (lib/migrationReadiness.ts) can say something works before anyone
 * relies on it. Times only, never who or what.
 */

/** When Supabase last reached app/api/auth/email-hook with a valid
 *  signature: proof Cloudflare's bot protection lets it through. */
export const EMAIL_HOOK_REACHED_KEY = "auth:email-hook:last";
