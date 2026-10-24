import "server-only";
import type { Sql } from "./db/connection";
import { getRateLimitKv } from "./rateLimit";
import { sendTransactionalEmail } from "./sendEmail";
import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";
import { looksLikeTest } from "./launchChecklist";
import { businessOptOutLinks, optedOutBusinesses } from "./businessEmailOptOut";
import { greetingName } from "./emailGreeting";

/**
 * "Finish your listing" reminders: a business that signed up and has a
 * login, but whose listing still lacks what approval needs (address,
 * phone, legal name, description or a photo), a day or more after signing
 * up. Sent only when an admin presses the button (app/admin), at most
 * twice per business and never twice within a week.
 */

export interface ReminderCandidate {
  id: string;
  businessName: string;
  contactName?: string | null;
  email: string;
  missing: string[];
}

const SENT_PREFIX = "listing-reminder:";
export const MAX_REMINDERS = 2;
const MIN_DAYS_BETWEEN = 7;

/** What a listing still needs, in the words the email uses. */
export function listingGaps(m: { address: string | null; phone: string | null; legal_business_name: string | null; bio: string | null; photo_count: number }): string[] {
  return [
    !m.address?.trim() && "your address",
    !m.phone?.trim() && "a phone number",
    !m.legal_business_name?.trim() && "your registered business name",
    !m.bio?.trim() && "a short description",
    !(m.photo_count > 0) && "a photo",
  ].filter((x): x is string => Boolean(x));
}

/** Who would get a reminder now. */
export async function reminderCandidates(db: Sql): Promise<ReminderCandidate[]> {
  const rows = await db.query<{
    id: string; business_name: string; contact_name: string | null; email: string;
    address: string | null; phone: string | null; legal_business_name: string | null; bio: string | null; photo_count: number;
  }>(
    `select m.id::text, m.business_name, m.contact_name, lower(m.email) as email, m.address, m.phone, m.legal_business_name, m.bio,
            jsonb_array_length(m.photos) as photo_count
       from public.merchants m
      where m.status = 'Pending' and m.owner_id is not null
        and m.email is not null and m.email <> ''
        and m.created_at < now() - interval '1 day'
      order by m.created_at`
  );
  const kv = await getRateLimitKv();
  // Businesses that chose "Stop MegaDeal business emails" are never reminded.
  const optedOut = await optedOutBusinesses(rows.map((r) => r.id));
  const out: ReminderCandidate[] = [];
  for (const r of rows) {
    if (optedOut.has(r.id)) continue;
    const missing = listingGaps(r);
    // Nothing to finish, or a test sign-up (its address isn't a real business's).
    if (missing.length === 0 || looksLikeTest(r.business_name ?? "", r.email)) continue;
    const sent = await readSent(db, kv, r.id);
    if (sent.count >= MAX_REMINDERS) continue;
    if (sent.last && Date.now() - Date.parse(sent.last) < MIN_DAYS_BETWEEN * 86_400_000) continue;
    out.push({ id: r.id, businessName: r.business_name, contactName: r.contact_name, email: r.email, missing });
  }
  return out;
}

type Kv = Awaited<ReturnType<typeof getRateLimitKv>>;

type Sent = { count: number; last: string | null };

function parseSent(raw: string | null | undefined): Sent {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return { count: Number(parsed?.count) || 0, last: typeof parsed?.last === "string" ? parsed.last : null };
  } catch {
    return { count: 0, last: null };
  }
}

/** What's been sent to a business: kept in the database (site_settings,
 *  backed up nightly) and, as before, KV; the fuller of the two counts. */
async function readSent(db: Sql, kv: Kv, id: string): Promise<Sent> {
  const [row] = await db
    .query<{ value: string | null }>(`select value from public.site_settings where key = $1`, [SENT_PREFIX + id])
    .catch(() => []);
  const inDb = parseSent(row?.value);
  const inKv = parseSent(await kv?.get(SENT_PREFIX + id).catch(() => null));
  const newer = [inDb.last, inKv.last].filter((x): x is string => Boolean(x)).sort().pop() ?? null;
  return { count: Math.max(inDb.count, inKv.count), last: newer };
}

async function recordSent(db: Sql, kv: Kv, id: string, sent: Sent): Promise<void> {
  const value = JSON.stringify(sent);
  await db
    .query(
      `insert into public.site_settings (key, value) values ($1, $2)
       on conflict (key) do update set value = excluded.value`,
      [SENT_PREFIX + id, value],
    )
    .catch((err) => console.error("[listingReminders] couldn't record a reminder", err));
  await kv
    ?.put(SENT_PREFIX + id, value, { expirationTtl: 365 * 86_400 })
    .catch((err) => console.error("[listingReminders] couldn't record a reminder in KV", err));
}

/** "a, b and c". */
function joinList(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function reminderEmailHtml(businessName: string, missing: string[], portalUrl: string, stopUrl: string, contactName?: string | null): string {
  return brandedEmailHtml(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(greetingName(contactName, businessName))},</p>
    <p style="margin:0 0 16px;">Thanks for signing up to MegaDeal. Your listing is nearly ready: it just needs ${escapeHtml(joinList(missing))}. Once that's in, we can check and approve your business so you can start running deals.</p>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${portalUrl}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Finish my listing</a>
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:#8b8494;">It takes a few minutes. Questions? Just reply to this email.</p>
    <p style="margin:0;font-size:12px;color:#8b8494;border-top:1px solid #f1f0f4;padding-top:12px;">You're getting this because you started a MegaDeal business account. Don't want emails like this? <a href="${stopUrl}" style="color:#8b8494;">Unsubscribe</a>.</p>
  `);
}

/** Sends the reminders, at most `limit` at a time. */
export async function sendListingReminders(db: Sql, siteUrl: string, limit = 25): Promise<{ sent: number; failed: string[]; remaining: number }> {
  const all = await reminderCandidates(db);
  const batch = all.slice(0, limit);
  const kv = await getRateLimitKv();
  const portalUrl = `${siteUrl.replace(/\/$/, "")}/portal`;
  let sent = 0;
  const failed: string[] = [];
  for (const c of batch) {
    // Never without a way to stop them.
    const links = businessOptOutLinks(siteUrl, c.id);
    if (!links) throw new Error("ADMIN_SESSION_SECRET isn't set, so reminder emails can't carry an unsubscribe link.");
    const ok = await sendTransactionalEmail({
      to: c.email,
      subject: "Your MegaDeal listing is nearly ready",
      html: reminderEmailHtml(c.businessName, c.missing, portalUrl, links.page, c.contactName),
      replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
      unsubscribeUrl: links.oneClick,
    }).catch(() => false);
    if (!ok) {
      failed.push(c.businessName || c.email);
      continue;
    }
    sent++;
    const prev = await readSent(db, kv, c.id);
    await recordSent(db, kv, c.id, { count: prev.count + 1, last: new Date().toISOString() });
  }
  return { sent, failed, remaining: all.length - batch.length };
}
