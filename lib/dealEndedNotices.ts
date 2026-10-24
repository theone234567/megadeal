import "server-only";
import type { Sql } from "./db/connection";
import { sendTransactionalEmail } from "./sendEmail";
import { dealEndedEmail, dealEndingEmail, type DealEmail, type RunAgainCost } from "./dealEmails";
import { PRELAUNCH_FREE_DEALS, SITE_LAUNCHED } from "./siteConfig";
import { getPlatformSettings } from "./platformSettings";
import { dealCreditCost } from "./platformSettingsRules";
import { looksLikeTest } from "./launchChecklist";
import { businessOptOutLinks, optedOutBusinesses } from "./businessEmailOptOut";

/**
 * The emails about a deal's run coming to an end, once per deal each, from
 * the hourly job (app/api/cron/expired-deals). Nothing else tells a business
 * its deal is about to finish or has finished.
 *
 *  - "ends tomorrow" (lib/dealEmails.ts dealEndingEmail): an Everyday deal
 *    that has run a few days, about a day before it ends: a last push.
 *  - "has ended" (dealEndedEmail): any deal, once it's over, with one tap
 *    to run it again.
 *
 * Each deal is claimed in site_settings before its email goes, so two runs
 * at once can't both send it; a send that fails gives the claim back for
 * the next run to try again. Businesses that chose "Stop MegaDeal business
 * emails" get neither, and each carries that unsubscribe.
 */

const ENDED_PREFIX = "deal-ended-email:";
const ENDING_PREFIX = "deal-ending-email:";
// Deals that ended longer ago than this are left alone: a missed run is
// caught up, but a business isn't told weeks later.
const LOOKBACK = "2 days";
const PER_RUN = 25;

type Row = {
  id: string; name: string; slug: string; expires_at: string; views: number; code_copies: number; is_flash: boolean;
  merchant_id: string; business_name: string; contact_name: string | null; email: string; credits: number;
};

// The deal and its business, for a deal not yet emailed under `prefix` ($1).
const SELECT = `select d.id::text, d.name, d.slug, d.expires_at::text, d.view_count as views, d.code_copy_count as code_copies, d.is_flash,
            m.id::text as merchant_id, m.business_name, m.contact_name, lower(m.email) as email, m.credits_balance as credits
       from public.deals d
       join public.merchants m on m.id = d.merchant_id
      where d.status = 'Live' and not d.is_test and d.ever_live
        and m.status = 'Approved' and m.email is not null and m.email <> ''
        and not exists (select 1 from public.site_settings s where s.key = $1 || d.id::text)`;

/** Sends `write(row)` to each business once, claimed under `prefix`. */
async function sendOnce(
  db: Sql,
  siteUrl: string,
  rows: Row[],
  prefix: string,
  write: (r: Row, stopUrl: string) => DealEmail
): Promise<{ sent: number; failed: number }> {
  const optedOut = await optedOutBusinesses(rows.map((r) => r.merchant_id));
  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    if (optedOut.has(r.merchant_id) || looksLikeTest(r.business_name ?? "", r.email)) continue;
    // Never without a way to stop them.
    const links = businessOptOutLinks(siteUrl, r.merchant_id);
    if (!links) throw new Error("ADMIN_SESSION_SECRET isn't set, so deal emails can't carry an unsubscribe link.");
    const claimed = await db.query(
      `insert into public.site_settings (key, value) values ($1, $2) on conflict (key) do nothing returning key`,
      [prefix + r.id, new Date().toISOString()]
    );
    if (!claimed.length) continue;
    const email = write(r, links.page);
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
      await db.query(`delete from public.site_settings where key = $1`, [prefix + r.id]).catch(() => {});
    }
  }
  return { sent, failed };
}

export async function sendDealEndedEmails(db: Sql, siteUrl: string): Promise<{ sent: number; failed: number }> {
  const rows = await db.query<Row>(
    `${SELECT}
        and d.expires_at <= now() and d.expires_at > now() - interval '${LOOKBACK}'
      order by d.expires_at
      limit ${PER_RUN}`,
    [ENDED_PREFIX]
  );
  // What another run would cost: free before launch, else the deal type's
  // credits against the business's balance.
  const settings = rows.length && !PRELAUNCH_FREE_DEALS ? (await getPlatformSettings()).settings : null;
  const costOf = (r: Row): RunAgainCost =>
    settings
      ? { kind: "credits", cost: dealCreditCost(Boolean(r.is_flash), settings), balance: Number(r.credits) || 0 }
      : { kind: "prelaunch" };
  return sendOnce(db, siteUrl, rows, ENDED_PREFIX, (r, stopUrl) =>
    dealEndedEmail(
      { id: r.id, name: r.name, endedAt: r.expires_at, views: Number(r.views) || 0, codeCopies: Number(r.code_copies) || 0 },
      { businessName: r.business_name, contactName: r.contact_name, siteUrl, stopUrl, cost: costOf(r) }
    )
  );
}

/**
 * Everyday deals ending 20 to 28 hours from now that have been showing for
 * at least 3 days (a short deal would get it straight after starting). The
 * window is wider than the hour between runs, so a late run still finds
 * each one once. Flash deals run for hours, so they don't get one.
 */
export async function sendDealEndingEmails(db: Sql, siteUrl: string): Promise<{ sent: number; failed: number }> {
  const rows = await db.query<Row>(
    `${SELECT}
        and not d.is_flash and d.slug is not null
        and d.expires_at > now() + interval '20 hours' and d.expires_at <= now() + interval '28 hours'
        and coalesce(d.first_published_at, d.first_approved_at) <= now() - interval '3 days'
      order by d.expires_at
      limit ${PER_RUN}`,
    [ENDING_PREFIX]
  );
  return sendOnce(db, siteUrl, rows, ENDING_PREFIX, (r, stopUrl) =>
    dealEndingEmail(
      { id: r.id, name: r.name, slug: r.slug, endsAt: r.expires_at, views: Number(r.views) || 0, codeCopies: Number(r.code_copies) || 0 },
      { businessName: r.business_name, contactName: r.contact_name, siteUrl, stopUrl, launched: SITE_LAUNCHED }
    )
  );
}
