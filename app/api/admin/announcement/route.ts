import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { createDataClient } from "@/lib/dataClient";
import { queryAllItems } from "@/lib/queryAll";
import { getRateLimitKv } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { SITE_LAUNCHED, SITE_URL } from "@/lib/siteConfig";
import {
  AUDIENCES,
  BODY_MAX,
  CAMPAIGN_RE,
  DRAFTS,
  SUBJECT_MAX,
  announcementHtml,
  businessRecipients,
  addressHash,
  parseSentList,
  sentListKey,
  subscriberRecipients,
  type AnnouncementAudience,
  type Recipient,
} from "@/lib/announcement";

export const dynamic = "force-dynamic";

/**
 * Admin only: the launch announcement (lib/announcement.ts).
 *
 *   GET  ?audience=&campaign=   how many would get it, how many already have
 *   POST { action: "preview" }  the email as it will look
 *   POST { action: "test" }     sends it to ADMIN_NOTIFY_EMAIL only
 *   POST { action: "send" }     sends the next batch; call again until
 *                               `remaining` is 0. Only once the site has
 *                               launched, and each address once per
 *                               announcement and audience.
 */

const headers = { "Cache-Control": "private, no-store" };
const BATCH = 20;
const SENT_TTL_SECONDS = 180 * 24 * 3600;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

function audienceOf(value: unknown): AnnouncementAudience | null {
  return AUDIENCES.includes(value as AnnouncementAudience) ? (value as AnnouncementAudience) : null;
}

async function recipients(audience: AnnouncementAudience): Promise<Recipient[]> {
  const client = createDataClient();
  if (audience === "businesses") {
    const rows = await queryAllItems(() => client.items.query("Merchants").eq("status", "Approved"), "Merchants (announcement)");
    return businessRecipients(rows);
  }
  const rows = await queryAllItems(() => client.items.query("EmailSignups"), "EmailSignups (announcement)");
  return subscriberRecipients(rows, audience === "customers" ? "customer" : "merchant");
}

/**
 * The recipient's own unsubscribe link. A subscriber whose token can't be
 * read back (MegaDeal's own database keeps only a fingerprint) is given a
 * fresh one first; their earlier links keep working (lib/db/wixShim.ts).
 * A subscriber with no link at all isn't emailed. Businesses have none.
 */
async function unsubscribeUrlFor(r: Recipient): Promise<string | undefined | null> {
  if (!r.row) return undefined;
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
      console.error("[admin/announcement] couldn't save an unsubscribe link", err);
      return null;
    }
  }
  return `${SITE_URL}/api/email-signup/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  const audience = audienceOf(req.nextUrl.searchParams.get("audience"));
  const campaign = req.nextUrl.searchParams.get("campaign") || "launch";
  if (!audience || !CAMPAIGN_RE.test(campaign)) return json({ error: "Choose who it's for." }, 400);
  try {
    const list = await recipients(audience);
    const kv = await getRateLimitKv();
    const sentList = parseSentList(kv ? await kv.get(sentListKey(campaign, audience)) : null);
    const alreadySent = list.filter((r) => sentList.has(addressHash(r.email))).length;
    return json({ audience, total: list.length, alreadySent, launched: SITE_LAUNCHED, testTo: Boolean(process.env.ADMIN_NOTIFY_EMAIL), draft: DRAFTS[audience] });
  } catch (err) {
    console.error("[admin/announcement] count failed", err);
    return json({ error: "Couldn't count the list. Please try again." }, 500);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  // It emails real people: only from the admin page itself.
  if (!fromOwnSite(req, SITE_URL)) return json({ error: "Use the admin page." }, 403);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  const audience = audienceOf(input.audience);
  const campaign = typeof input.campaign === "string" && input.campaign ? input.campaign : "launch";
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!audience || !CAMPAIGN_RE.test(campaign)) return json({ error: "Choose who it's for." }, 400);
  if (!subject || subject.length > SUBJECT_MAX) return json({ error: `Write a subject (up to ${SUBJECT_MAX} characters).` }, 400);
  if (!body || body.length > BODY_MAX) return json({ error: `Write the message (up to ${BODY_MAX} characters).` }, 400);

  if (input.action === "preview") {
    return json({ html: announcementHtml({ audience, body, siteUrl: SITE_URL, unsubscribeUrl: audience === "businesses" ? undefined : `${SITE_URL}/unsubscribe` }) });
  }

  if (input.action === "test") {
    const to = process.env.ADMIN_NOTIFY_EMAIL;
    if (!to) return json({ error: "Set ADMIN_NOTIFY_EMAIL to send yourself a test." }, 409);
    const ok = await sendTransactionalEmail({
      to,
      subject: `[Test] ${subject}`,
      html: announcementHtml({ audience, body, siteUrl: SITE_URL, unsubscribeUrl: audience === "businesses" ? undefined : `${SITE_URL}/unsubscribe` }),
    }).catch(() => false);
    return ok ? json({ ok: true }) : json({ error: "The test didn't send. Please try again." }, 502);
  }

  if (input.action !== "send") return json({ error: "Bad request." }, 400);
  // A launch announcement before launch would send people to a
  // "coming soon" page.
  if (!SITE_LAUNCHED) return json({ error: "MegaDeal hasn't launched yet. Send this once it has." }, 409);
  const kv = await getRateLimitKv();
  // Without it, nothing would stop the same person being emailed twice.
  if (!kv) return json({ error: "Can't keep track of who's been sent it, so nothing was sent." }, 503);

  try {
    const key = sentListKey(campaign, audience);
    const sentList = parseSentList(await kv.get(key));
    const everyone = await recipients(audience);
    const todo = everyone.filter((r) => !sentList.has(addressHash(r.email)));
    let sent = 0;
    let failed = 0;
    // Written once at the end of the batch (Cloudflare allows about one
    // write a second to a key), and in `finally` so a batch that stops part
    // way still records who it reached.
    try {
      for (const r of todo.slice(0, BATCH)) {
        const unsub = await unsubscribeUrlFor(r);
        const ok =
          unsub !== null &&
          (await sendTransactionalEmail({
            to: r.email,
            subject,
            html: announcementHtml({ audience, body, siteUrl: SITE_URL, unsubscribeUrl: unsub }),
            unsubscribeUrl: unsub,
            replyTo: process.env.ADMIN_NOTIFY_EMAIL?.split(",")[0]?.trim() || undefined,
          }).catch(() => false));
        if (ok) {
          sentList.add(addressHash(r.email));
          sent++;
        } else {
          failed++;
        }
      }
    } finally {
      if (sent) await kv.put(key, JSON.stringify([...sentList]), { expirationTtl: SENT_TTL_SECONDS });
    }
    // Failed ones stay on the list and are tried again next time.
    const remaining = todo.length - sent;
    if (sent || failed) {
      await logAdminAction({
        action: `Sent announcement "${campaign}" (${audience})`,
        detail: `${sent} sent${failed ? `, ${failed} failed` : ""}, ${remaining} to go`,
      });
    }
    return json({ sent, failed, alreadySent: everyone.length - todo.length + sent, remaining });
  } catch (err) {
    console.error("[admin/announcement] send failed", err);
    return json({ error: "Sending stopped. Please try again: nobody is sent it twice." }, 500);
  }
}
