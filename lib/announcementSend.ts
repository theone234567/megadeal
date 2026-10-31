import "server-only";
import { randomBytes } from "crypto";
import { businessOptOutLinks, optedOutBusinesses } from "./businessEmailOptOut";
import { createDataClient } from "./dataClient";
import { queryAllItems } from "./queryAll";
import { getRateLimitKv } from "./rateLimit";
import { bulkEmailPaused, pauseBulkEmail } from "./bulkEmailPause";
import { bulkShouldPause, sendEmail } from "./sendEmail";
import { SITE_URL } from "./siteConfig";
import {
  announcementHtml,
  businessRecipients,
  addressHash,
  failedListKey,
  parseFailedList,
  parseSentList,
  sentListKey,
  subscriberRecipients,
  type AnnouncementAudience,
  type Recipient,
} from "./announcement";

/**
 * Sending an announcement (lib/announcement.ts) to its audience, a batch
 * at a time: the admin page's "Send" (app/api/admin/announcement) and the
 * weekly deals email (lib/weeklyDeals.ts). Each address once per
 * announcement and audience; addresses that fail are passed over for an
 * hour, then tried again; it stops at Resend's sending limit, or on its
 * free plan once the day's emails reach lib/sendEmail.ts BULK_DAILY_STOP.
 */

const SENT_TTL_SECONDS = 180 * 24 * 3600;

export interface BatchResult {
  sent: number;
  failed: number;
  /** Not sent it yet but passed over for now, including this batch's failures. */
  waiting: number;
  quotaReached: boolean;
  alreadySent: number;
  remaining: number;
}

export async function recipients(audience: AnnouncementAudience): Promise<Recipient[]> {
  const client = createDataClient();
  if (audience === "businesses" || audience === "pending") {
    const status = audience === "businesses" ? "Approved" : "Pending";
    const rows = await queryAllItems(() => client.items.query("Merchants").eq("status", status), "Merchants (announcement)");
    // Businesses that unsubscribed from business emails aren't sent it.
    const list = businessRecipients(rows, status);
    const optedOut = await optedOutBusinesses(list.map((r) => r.businessId ?? "").filter(Boolean));
    return list.filter((r) => !r.businessId || !optedOut.has(r.businessId));
  }
  const rows = await queryAllItems(() => client.items.query("EmailSignups"), "EmailSignups (announcement)");
  return subscriberRecipients(rows, audience === "customers" ? "customer" : "merchant");
}

/**
 * The recipient's own unsubscribe link. A subscriber whose token can't be
 * read back (MegaDeal's own database keeps only a fingerprint) is given a
 * fresh one first; their earlier links keep working (lib/db/wixShim.ts).
 * A subscriber with no link at all isn't emailed. A business gets its
 * signed "unsubscribe from business emails" link (lib/businessEmailOptOut.ts).
 */
async function unsubscribeUrlFor(r: Recipient): Promise<{ footer: string; header: string } | null> {
  // A business: its signed link to stop business emails. One that can't
  // be given a link isn't emailed.
  if (!r.row) {
    const links = r.businessId ? businessOptOutLinks(SITE_URL, r.businessId) : null;
    return links ? { footer: links.page, header: links.oneClick } : null;
  }
  let token = r.unsubscribeToken;
  if (!token) {
    token = randomBytes(32).toString("hex");
    try {
      // Saving the link rewrites the whole row, so it's read again first:
      // writing back the copy from the start of the batch would undo an
      // unsubscribe made since. Someone who has just unsubscribed (or is
      // no longer confirmed) isn't sent it.
      const client = createDataClient();
      const fresh = (await client.items.get("EmailSignups", String(r.row._id))) as Record<string, unknown> | null;
      if (!fresh || fresh.unsubscribed || fresh.verified !== true) return null;
      await client.items.update("EmailSignups", { ...(fresh as { _id: string }), unsubscribeToken: token });
    } catch (err) {
      console.error("[announcementSend] couldn't save an unsubscribe link", err);
      return null;
    }
  }
  const url = `${SITE_URL}/api/email-signup/unsubscribe?token=${encodeURIComponent(token)}`;
  return { footer: url, header: url };
}

/** Sends the next batch. "no-store" when there's nowhere to keep track of
 *  who's been sent it, so nothing is sent (nothing could stop doubles). */
export async function sendAnnouncementBatch(opts: {
  audience: AnnouncementAudience;
  campaign: string;
  subject: string;
  body: string;
  batch: number;
}): Promise<BatchResult | "no-store"> {
  const { audience, campaign, subject, body } = opts;
  const kv = await getRateLimitKv();
  if (!kv) return "no-store";
  const key = sentListKey(campaign, audience);
  const failedKey = failedListKey(campaign, audience);
  const [sentRaw, failedRaw] = await Promise.all([kv.get(key), kv.get(failedKey)]);
  const sentList = parseSentList(sentRaw);
  const failedList = parseFailedList(failedRaw);
  const everyone = await recipients(audience);
  const notSent = everyone.filter((r) => !sentList.has(addressHash(r.email)));
  const todo = notSent.filter((r) => !failedList.has(addressHash(r.email)));
  let sent = 0;
  let failed = 0;
  // Resend's daily or monthly limit: stop here, and don't count it
  // against anyone. Send again once the limit resets.
  let quotaReached = false;
  if (await bulkEmailPaused(kv)) {
    return { sent, failed, waiting: notSent.length - todo.length, quotaReached: true, alreadySent: everyone.length - notSent.length, remaining: todo.length };
  }
  // Written once at the end of the batch (Cloudflare allows about one
  // write a second to a key), and in `finally` so a batch that stops part
  // way still records who it reached.
  try {
    for (const r of todo.slice(0, opts.batch)) {
      const unsub = await unsubscribeUrlFor(r);
      const result =
        unsub === null
          ? { ok: false as const }
          : await sendEmail({
              to: r.email,
              subject,
              html: announcementHtml({ audience, body, siteUrl: SITE_URL, unsubscribeUrl: unsub.footer }),
              unsubscribeUrl: unsub.header,
              replyTo: process.env.ADMIN_NOTIFY_EMAIL?.split(",")[0]?.trim() || undefined,
              campaign: "announcement",
            }).catch(() => ({ ok: false as const }));
      if (result.ok) {
        sentList.add(addressHash(r.email));
        sent++;
        // The day's free sending kept for sign-up codes: stop for today.
        if (bulkShouldPause(result)) {
          quotaReached = true;
          break;
        }
      } else if ("reason" in result && result.reason === "quota") {
        quotaReached = true;
        break;
      } else {
        failedList.set(addressHash(r.email), Date.now());
        failed++;
      }
    }
  } finally {
    if (quotaReached) await pauseBulkEmail(kv);
    if (sent) await kv.put(key, JSON.stringify([...sentList]), { expirationTtl: SENT_TTL_SECONDS });
    if (failed) await kv.put(failedKey, JSON.stringify(Object.fromEntries(failedList)), { expirationTtl: SENT_TTL_SECONDS });
  }
  const remaining = todo.length - sent - failed;
  const waiting = notSent.length - sent - remaining;
  return { sent, failed, waiting, quotaReached, alreadySent: everyone.length - notSent.length + sent, remaining };
}
