import "server-only";
import type { Sql } from "./db/connection";
import { getRateLimitKv } from "./rateLimit";
import { sendTransactionalEmail } from "./sendEmail";
import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";
import { looksLikeTest } from "./launchChecklist";

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
    id: string; business_name: string; email: string;
    address: string | null; phone: string | null; legal_business_name: string | null; bio: string | null; photo_count: number;
  }>(
    `select m.id::text, m.business_name, lower(m.email) as email, m.address, m.phone, m.legal_business_name, m.bio,
            jsonb_array_length(m.photos) as photo_count
       from public.merchants m
      where m.status = 'Pending' and m.owner_id is not null
        and m.email is not null and m.email <> ''
        and m.created_at < now() - interval '1 day'
      order by m.created_at`
  );
  const kv = await getRateLimitKv();
  const out: ReminderCandidate[] = [];
  for (const r of rows) {
    const missing = listingGaps(r);
    // Nothing to finish, or a test sign-up (its address isn't a real business's).
    if (missing.length === 0 || looksLikeTest(r.business_name ?? "", r.email)) continue;
    const sent = await readSent(kv, r.id);
    if (sent.count >= MAX_REMINDERS) continue;
    if (sent.last && Date.now() - Date.parse(sent.last) < MIN_DAYS_BETWEEN * 86_400_000) continue;
    out.push({ id: r.id, businessName: r.business_name, email: r.email, missing });
  }
  return out;
}

type Kv = Awaited<ReturnType<typeof getRateLimitKv>>;

async function readSent(kv: Kv, id: string): Promise<{ count: number; last: string | null }> {
  try {
    const raw = await kv?.get(SENT_PREFIX + id);
    const parsed = raw ? JSON.parse(raw) : null;
    return { count: Number(parsed?.count) || 0, last: typeof parsed?.last === "string" ? parsed.last : null };
  } catch {
    return { count: 0, last: null };
  }
}

/** "a, b and c". */
function joinList(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function reminderEmailHtml(businessName: string, missing: string[], portalUrl: string): string {
  return brandedEmailHtml(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(businessName || "there")},</p>
    <p style="margin:0 0 16px;">Thanks for signing up to MegaDeal. Your listing is nearly ready: it just needs ${escapeHtml(joinList(missing))}. Once that's in, we can check and approve your business so you can start running deals.</p>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${portalUrl}" style="display:inline-block;background:#6520B5;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Finish my listing</a>
    </p>
    <p style="margin:0;font-size:13px;color:#8b8494;">It takes a few minutes. Questions? Just reply to this email.</p>
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
    const ok = await sendTransactionalEmail({
      to: c.email,
      subject: "Your MegaDeal listing is nearly ready",
      html: reminderEmailHtml(c.businessName, c.missing, portalUrl),
      replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
    }).catch(() => false);
    if (!ok) {
      failed.push(c.businessName || c.email);
      continue;
    }
    sent++;
    const prev = await readSent(kv, c.id);
    await kv
      ?.put(SENT_PREFIX + c.id, JSON.stringify({ count: prev.count + 1, last: new Date().toISOString() }), { expirationTtl: 365 * 86_400 })
      .catch((err) => console.error("[listingReminders] couldn't record a reminder", err));
  }
  return { sent, failed, remaining: all.length - batch.length };
}
