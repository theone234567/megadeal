import "server-only";
import type { Sql } from "./db/connection";
import { createPasswordResetToken, INVITE_TTL_SECONDS } from "./passwordResetTokens";
import { getRateLimitKv } from "./rateLimit";
import { sendEmail } from "./sendEmail";
import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";

/**
 * When business logins move off Wix (docs/WIX-MIGRATION.md, stage 3),
 * Wix passwords can't come along: each business sets a new one, once.
 * This emails every business that hasn't yet a link to do that: the
 * same single-use link as "Forgot password", good for a week instead of
 * an hour. Setting the password makes the login, and the business is
 * theirs when they first sign in.
 *
 * Only to the business's own email address on file, never anywhere else.
 * Each business is emailed at most once a week however many times the
 * button is pressed, and a few at a time (a request can only send so
 * many), so the admin page calls this until none are left. An address
 * that can't be sent to is passed over for an hour, so it can't hold up
 * everyone after it; reaching the email service's daily limit stops the
 * run without counting against anyone.
 */

export interface InviteCandidate {
  id: string;
  businessName: string;
  email: string;
}

/** Businesses that applied (approved or awaiting approval) and have no
 *  login on the new system yet. */
export async function businessesWithoutLogin(db: Sql): Promise<InviteCandidate[]> {
  return db.query<InviteCandidate>(
    `select m.id::text as id, m.business_name as "businessName", lower(m.email) as email
       from public.merchants m
      where m.status in ('Approved', 'Pending') and m.owner_id is null and m.email is not null and m.email <> ''
        and not exists (select 1 from auth.users u where lower(u.email) = lower(m.email) and u.deleted_at is null)
      order by m.created_at`
  );
}

const SENT_PREFIX = "login-invite:";
const FAILED_PREFIX = "login-invite-failed:";
/** How long an address that couldn't be sent to is passed over. */
const RETRY_FAILED_AFTER_SECONDS = 60 * 60;

export function inviteEmailHtml(businessName: string, link: string): string {
  return brandedEmailHtml(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(businessName || "there")},</p>
    <p style="margin:0 0 16px;">MegaDeal has a new, faster sign-in. Your business, deals and credits are all still here; you just need to choose a password, once.</p>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${link}" style="display:inline-block;background:#6520B5;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Set my password</a>
    </p>
    <p style="margin:0 0 16px;">This link works once and expires in 7 days. After that, use "Forgot password" on the sign-in page.</p>
    <p style="margin:0;font-size:13px;color:#8b8494;">Questions? Just reply to this email.</p>
  `);
}

export interface InviteResult {
  sent: number;
  /** Emailed in the last week already. */
  alreadySent: number;
  failed: string[];
  /** Couldn't be sent to within the last hour: tried again after that. */
  waiting: number;
  /** Still to try after this batch. */
  remaining: number;
  /** The email service's sending limit was reached: carry on another day. */
  quotaReached: boolean;
}

export async function sendLoginInvites(db: Sql, siteUrl: string, opts: { limit?: number } = {}): Promise<InviteResult> {
  const kv = await getRateLimitKv();
  if (!kv) throw new Error("No KV store: links can't be checked when clicked.");
  const limit = opts.limit ?? 10;
  const result: InviteResult = { sent: 0, alreadySent: 0, failed: [], waiting: 0, remaining: 0, quotaReached: false };
  const todo: InviteCandidate[] = [];
  for (const b of await businessesWithoutLogin(db)) {
    if (await kv.get(SENT_PREFIX + b.id)) result.alreadySent++;
    else if (await kv.get(FAILED_PREFIX + b.id)) result.waiting++;
    else todo.push(b);
  }
  let tried = 0;
  for (const b of todo.slice(0, limit)) {
    const token = await createPasswordResetToken(b.email, INVITE_TTL_SECONDS);
    const sent = token
      ? await sendEmail({
          to: b.email,
          subject: "Set your password for MegaDeal's new sign-in",
          html: inviteEmailHtml(b.businessName, `${siteUrl.replace(/\/$/, "")}/reset-password?token=${token}`),
          // "Just reply": to a person, as the welcome email does.
          replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
        }).catch(() => ({ ok: false as const }))
      : { ok: false as const };
    if (!sent.ok && "reason" in sent && sent.reason === "quota") {
      // Not this business's fault: it's tried again next time.
      result.quotaReached = true;
      break;
    }
    tried++;
    if (sent.ok) {
      await kv.put(SENT_PREFIX + b.id, new Date().toISOString(), { expirationTtl: INVITE_TTL_SECONDS });
      result.sent++;
    } else {
      await kv.put(FAILED_PREFIX + b.id, "1", { expirationTtl: RETRY_FAILED_AFTER_SECONDS });
      result.failed.push(b.businessName || b.email);
    }
  }
  result.remaining = Math.max(0, todo.length - tried);
  return result;
}
