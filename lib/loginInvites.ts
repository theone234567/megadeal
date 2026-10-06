import "server-only";
import type { Sql } from "./db/connection";
import { createPasswordResetToken, INVITE_TTL_SECONDS } from "./passwordResetTokens";
import { getRateLimitKv } from "./rateLimit";
import { sendTransactionalEmail } from "./sendEmail";
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
 * many), so the admin page calls this until none are left.
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
  /** Still to do after this batch. */
  remaining: number;
}

export async function sendLoginInvites(db: Sql, siteUrl: string, opts: { limit?: number } = {}): Promise<InviteResult> {
  const kv = await getRateLimitKv();
  if (!kv) throw new Error("No KV store: links can't be checked when clicked.");
  const limit = opts.limit ?? 10;
  const result: InviteResult = { sent: 0, alreadySent: 0, failed: [], remaining: 0 };
  const todo: InviteCandidate[] = [];
  for (const b of await businessesWithoutLogin(db)) {
    if (await kv.get(SENT_PREFIX + b.id)) result.alreadySent++;
    else todo.push(b);
  }
  for (const b of todo.slice(0, limit)) {
    const token = await createPasswordResetToken(b.email, INVITE_TTL_SECONDS);
    const ok =
      token !== null &&
      (await sendTransactionalEmail({
        to: b.email,
        subject: "Set your password for MegaDeal's new sign-in",
        html: inviteEmailHtml(b.businessName, `${siteUrl.replace(/\/$/, "")}/reset-password?token=${token}`),
        // "Just reply": to a person, as the welcome email does.
        replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
      }).catch(() => false));
    if (ok) {
      await kv.put(SENT_PREFIX + b.id, new Date().toISOString(), { expirationTtl: INVITE_TTL_SECONDS });
      result.sent++;
    } else {
      result.failed.push(b.businessName || b.email);
    }
  }
  result.remaining = Math.max(0, todo.length - limit);
  return result;
}
