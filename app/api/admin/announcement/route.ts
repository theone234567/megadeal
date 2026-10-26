import { NextRequest, NextResponse } from "next/server";
import { JSON_BODY_MAX, readSmallJson } from "@/lib/readJsonBody";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { getRateLimitKv } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { SITE_LAUNCHED, SITE_URL } from "@/lib/siteConfig";
import {
  AUDIENCES,
  BODY_MAX,
  CAMPAIGN_RE,
  draftFor,
  SUBJECT_MAX,
  announcementHtml,
  dealsDigestBody,
  addressHash,
  failedListKey,
  parseFailedList,
  parseSentList,
  sentListKey,
  type AnnouncementAudience,
} from "@/lib/announcement";
import { recipients, sendAnnouncementBatch } from "@/lib/announcementSend";
import { getPlatformSettings } from "@/lib/platformSettings";

/** Whether every deal waits for an admin now, or null if unknown. */
async function requireApprovalNow(): Promise<boolean | null> {
  try {
    return (await getPlatformSettings()).settings.requireApproval;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

/**
 * Admin only: the launch announcement (lib/announcement.ts).
 *
 *   GET  ?audience=&campaign=   how many would get it, how many already have
 *   GET  ?draft=deals           a message listing the live deals, to edit
 *   POST { action: "preview" }  the email as it will look
 *   POST { action: "test" }     sends it to ADMIN_NOTIFY_EMAIL only
 *   POST { action: "send" }     sends the next batch; call again until
 *                               `remaining` is 0. Only once the site has
 *                               launched, and each address once per
 *                               announcement and audience. Addresses that
 *                               fail are passed over for an hour
 *                               (`waiting`), then tried again.
 */

const headers = { "Cache-Control": "private, no-store" };
const BATCH = 20;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

function audienceOf(value: unknown): AnnouncementAudience | null {
  return AUDIENCES.includes(value as AnnouncementAudience) ? (value as AnnouncementAudience) : null;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  if (req.nextUrl.searchParams.get("draft") === "deals") {
    if (!SITE_LAUNCHED) return json({ error: "There are no public deals before launch." }, 409);
    try {
      const body = dealsDigestBody(await fetchAllLiveDealsServer(), SITE_URL);
      return body ? json({ body }) : json({ error: "There are no live everyday deals to list." }, 404);
    } catch (err) {
      console.error("[admin/announcement] deals draft failed", err);
      return json({ error: "Couldn't load the deals. Please try again." }, 500);
    }
  }
  const audience = audienceOf(req.nextUrl.searchParams.get("audience"));
  const campaign = req.nextUrl.searchParams.get("campaign") || "launch";
  if (!audience || !CAMPAIGN_RE.test(campaign)) return json({ error: "Choose who it's for." }, 400);
  try {
    const list = await recipients(audience);
    const kv = await getRateLimitKv();
    const sentList = parseSentList(kv ? await kv.get(sentListKey(campaign, audience)) : null);
    const failedList = parseFailedList(kv ? await kv.get(failedListKey(campaign, audience)) : null);
    const alreadySent = list.filter((r) => sentList.has(addressHash(r.email))).length;
    const waiting = list.filter((r) => !sentList.has(addressHash(r.email)) && failedList.has(addressHash(r.email))).length;
    return json({ audience, total: list.length, alreadySent, waiting, launched: SITE_LAUNCHED, testTo: Boolean(process.env.ADMIN_NOTIFY_EMAIL), draft: draftFor(audience, await requireApprovalNow()) });
  } catch (err) {
    console.error("[admin/announcement] count failed", err);
    return json({ error: "Couldn't count the list. Please try again." }, 500);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  // It emails real people: only from the admin page itself.
  if (!fromOwnSite(req, SITE_URL)) return json({ error: "Use the admin page." }, 403);

  const input: Record<string, unknown> = await readSmallJson(req, JSON_BODY_MAX);
  if (!input || typeof input !== "object") return json({ error: "Bad request." }, 400);
  const audience = audienceOf(input.audience);
  const campaign = typeof input.campaign === "string" && input.campaign ? input.campaign : "launch";
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!audience || !CAMPAIGN_RE.test(campaign)) return json({ error: "Choose who it's for." }, 400);
  if (!subject || subject.length > SUBJECT_MAX) return json({ error: `Write a subject (up to ${SUBJECT_MAX} characters).` }, 400);
  if (!body || body.length > BODY_MAX) return json({ error: `Write the message (up to ${BODY_MAX} characters).` }, 400);

  if (input.action === "preview") {
    return json({ html: announcementHtml({ audience, body, siteUrl: SITE_URL, unsubscribeUrl: audience === "businesses" || audience === "pending" ? `${SITE_URL}/stop-emails` : `${SITE_URL}/unsubscribe` }) });
  }

  if (input.action === "test") {
    const to = process.env.ADMIN_NOTIFY_EMAIL;
    if (!to) return json({ error: "Set ADMIN_NOTIFY_EMAIL to send yourself a test." }, 409);
    const ok = await sendTransactionalEmail({
      to,
      subject: `[Test] ${subject}`,
      html: announcementHtml({ audience, body, siteUrl: SITE_URL, unsubscribeUrl: audience === "businesses" || audience === "pending" ? `${SITE_URL}/stop-emails` : `${SITE_URL}/unsubscribe` }),
    }).catch(() => false);
    return ok ? json({ ok: true }) : json({ error: "The test didn't send. Please try again." }, 502);
  }

  if (input.action !== "send") return json({ error: "Bad request." }, 400);
  // A launch announcement before launch would send people to a
  // "coming soon" page.
  if (!SITE_LAUNCHED) return json({ error: "MegaDeal hasn't launched yet. Send this once it has." }, 409);
  try {
    const r = await sendAnnouncementBatch({ audience, campaign, subject, body, batch: BATCH });
    if (r === "no-store") return json({ error: "Can't keep track of who's been sent it, so nothing was sent." }, 503);
    if (r.sent || r.failed || r.quotaReached) {
      await logAdminAction({
        action: `Sent announcement "${campaign}" (${audience})`,
        detail: `${r.sent} sent${r.failed ? `, ${r.failed} failed` : ""}, ${r.remaining} to go${r.quotaReached ? " (stopped: Resend's sending limit)" : ""}`,
      });
    }
    return json(r);
  } catch (err) {
    console.error("[admin/announcement] send failed", err);
    return json({ error: "Sending stopped. Please try again: nobody is sent it twice." }, 500);
  }
}
