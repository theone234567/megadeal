import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { getRateLimitKv } from "./rateLimit";

/**
 * "Stop MegaDeal business emails": one opt-out per business, for the
 * marketing-type emails businesses get (announcements, "finish your
 * listing" reminders). Never for service email (sign-up codes, password
 * links, approval and deal notices), which must always arrive.
 *
 * The links are signed with the server's secret under their own label,
 * so only a link MegaDeal emailed can opt a business out (an id alone,
 * or a guessed one, does nothing), and they carry the business's id, not
 * its email address. Opting out is a button press on /stop-emails (mail
 * scanners open links, they don't press buttons) or a mail app's own
 * one-click Unsubscribe (RFC 8058) at /api/business-emails/stop.
 */

const OPT_OUT_PREFIX = "biz-email-opt-out:";
const ID_RE = /^[0-9a-f-]{36}$/;

function sign(id: string): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`business-email-opt-out:${id}`).digest("hex").slice(0, 32);
}

/** The page link (for the email's footer) and the one-click address (for
 *  the List-Unsubscribe header). null when the business can't be given one. */
export function businessOptOutLinks(siteUrl: string, id: string): { page: string; oneClick: string } | null {
  if (!ID_RE.test(id)) return null;
  const s = sign(id);
  if (!s) return null;
  const base = siteUrl.replace(/\/$/, "");
  const q = `m=${encodeURIComponent(id)}&s=${s}`;
  return { page: `${base}/stop-emails?${q}`, oneClick: `${base}/api/business-emails/stop?${q}` };
}

/** True only for a link MegaDeal signed for that business. */
export function validBusinessOptOut(id: unknown, sig: unknown): id is string {
  if (typeof id !== "string" || typeof sig !== "string" || !ID_RE.test(id)) return false;
  const expected = sign(id);
  if (!expected || sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/** Records the opt-out, for good. False if it couldn't be saved (so the
 *  person isn't told it worked when it didn't). */
export async function optOutBusiness(id: string): Promise<boolean> {
  const kv = await getRateLimitKv();
  if (!kv) return false;
  try {
    await kv.put(OPT_OUT_PREFIX + id, new Date().toISOString());
    return true;
  } catch (err) {
    console.error("[businessEmailOptOut] couldn't save", err);
    return false;
  }
}

/** Turns business emails back on (the business's own choice, in the portal). */
export async function optInBusiness(id: string): Promise<boolean> {
  const kv = await getRateLimitKv();
  if (!kv) return false;
  try {
    await kv.delete(OPT_OUT_PREFIX + id);
    return true;
  } catch (err) {
    console.error("[businessEmailOptOut] couldn't save", err);
    return false;
  }
}

/** The ids of businesses that have opted out, among `ids`. */
export async function optedOutBusinesses(ids: string[]): Promise<Set<string>> {
  const kv = await getRateLimitKv();
  const out = new Set<string>();
  if (!kv) return out;
  await Promise.all(
    ids.map(async (id) => {
      if (await kv.get(OPT_OUT_PREFIX + id).catch(() => null)) out.add(id);
    }),
  );
  return out;
}
