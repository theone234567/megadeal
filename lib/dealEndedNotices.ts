import "server-only";
import type { Sql } from "./db/connection";
import { sendTransactionalEmail } from "./sendEmail";
import { dealEndedEmail, type RunAgainCost } from "./dealEmails";
import { PRELAUNCH_FREE_DEALS } from "./siteConfig";
import { getPlatformSettings } from "./platformSettings";
import { dealCreditCost } from "./platformSettingsRules";
import { looksLikeTest } from "./launchChecklist";
import { businessOptOutLinks, optedOutBusinesses } from "./businessEmailOptOut";

/**
 * "Your deal has ended" (lib/dealEmails.ts dealEndedEmail), once per deal,
 * from the hourly job (app/api/cron/expired-deals). Nothing else tells a
 * business its deal has finished, and the email's one button relists it.
 *
 * Each deal is claimed in site_settings before its email goes, so two runs
 * at once can't both send it; a send that fails gives the claim back for
 * the next run to try again.
 */

const SENT_PREFIX = "deal-ended-email:";
// Deals that ended longer ago than this are left alone: a missed run is
// caught up, but a business isn't told weeks later.
const LOOKBACK = "2 days";
const PER_RUN = 25;

export async function sendDealEndedEmails(db: Sql, siteUrl: string): Promise<{ sent: number; failed: number }> {
  const rows = await db.query<{
    id: string; name: string; expires_at: string; views: number; code_copies: number; is_flash: boolean;
    merchant_id: string; business_name: string; email: string; credits: number;
  }>(
    `select d.id::text, d.name, d.expires_at::text, d.view_count as views, d.code_copy_count as code_copies, d.is_flash,
            m.id::text as merchant_id, m.business_name, lower(m.email) as email, m.credits_balance as credits
       from public.deals d
       join public.merchants m on m.id = d.merchant_id
      where d.status = 'Live' and not d.is_test and d.ever_live
        and d.expires_at <= now() and d.expires_at > now() - interval '${LOOKBACK}'
        and m.status = 'Approved' and m.email is not null and m.email <> ''
        and not exists (select 1 from public.site_settings s where s.key = $1 || d.id::text)
      order by d.expires_at
      limit ${PER_RUN}`,
    [SENT_PREFIX]
  );
  // What another run would cost: free before launch, else the deal type's
  // credits against the business's balance.
  const settings = rows.length && !PRELAUNCH_FREE_DEALS ? (await getPlatformSettings()).settings : null;
  const costOf = (r: (typeof rows)[number]): RunAgainCost =>
    settings
      ? { kind: "credits", cost: dealCreditCost(Boolean(r.is_flash), settings), balance: Number(r.credits) || 0 }
      : { kind: "prelaunch" };
  // Businesses that chose "Stop MegaDeal business emails" aren't sent it.
  const optedOut = await optedOutBusinesses(rows.map((r) => r.merchant_id));
  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    if (optedOut.has(r.merchant_id) || looksLikeTest(r.business_name ?? "", r.email)) continue;
    // Never without a way to stop them.
    const links = businessOptOutLinks(siteUrl, r.merchant_id);
    if (!links) throw new Error("ADMIN_SESSION_SECRET isn't set, so deal-ended emails can't carry an unsubscribe link.");
    const claimed = await db.query(
      `insert into public.site_settings (key, value) values ($1, $2) on conflict (key) do nothing returning key`,
      [SENT_PREFIX + r.id, new Date().toISOString()]
    );
    if (!claimed.length) continue;
    const email = dealEndedEmail(
      { id: r.id, name: r.name, endedAt: r.expires_at, views: Number(r.views) || 0, codeCopies: Number(r.code_copies) || 0 },
      { businessName: r.business_name, siteUrl, stopUrl: links.page, cost: costOf(r) }
    );
    const ok = await sendTransactionalEmail({
      to: r.email,
      subject: email.subject,
      html: email.html,
      replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
      unsubscribeUrl: links.oneClick,
    }).catch(() => false);
    if (ok) {
      sent++;
    } else {
      failed++;
      await db.query(`delete from public.site_settings where key = $1`, [SENT_PREFIX + r.id]).catch(() => {});
    }
  }
  return { sent, failed };
}
