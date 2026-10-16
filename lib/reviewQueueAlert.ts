import "server-only";
import { createHash } from "crypto";
import type { Sql } from "./db/connection";
import { sendTransactionalEmail } from "./sendEmail";
import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";
import { looksLikeTest } from "./launchChecklist";
import { listingGaps } from "./listingReminders";

/**
 * "Something's waiting for you": the owner (ADMIN_NOTIFY_EMAIL) hears
 * within the hour when a business or deal needs a decision, since the
 * site tells businesses they'll hear back "usually within 12 hours".
 * Run by the hourly scheduled job (app/api/cron/review-queue).
 *
 * One email per run at most, and only when something new has arrived
 * since the last one, so a queue that sits there doesn't email every
 * hour. What's waiting:
 *  - a business with a complete listing, waiting for approval (a sign-up
 *    still missing details isn't ready, see lib/listingReminders.ts);
 *  - a deal submitted for review, a change request on a deal, a new deal
 *    photo to approve.
 * Test deals and test sign-ups are left out. Contact messages email the
 * owner as they arrive (app/api/contact), so they aren't here.
 */

export type QueueKind = "business" | "deal" | "change" | "photo";
export interface QueueItem {
  /** Stable while the item waits; new when it comes back for review. */
  key: string;
  kind: QueueKind;
  name: string;
}

const NOTIFIED_KEY = "review-queue:notified";
/** Kept as short hashes, so plenty fit in a site_settings value (10,000
 *  characters) and nothing about the business is stored twice. */
const MAX_REMEMBERED = 600;
const short = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 12);

export async function reviewQueue(db: Sql): Promise<QueueItem[]> {
  const items: QueueItem[] = [];
  const businesses = await db.query<{
    id: string; business_name: string; email: string; address: string | null; phone: string | null;
    legal_business_name: string | null; bio: string | null; photo_count: number;
  }>(
    `select m.id::text, m.business_name, lower(m.email) as email, m.address, m.phone, m.legal_business_name, m.bio,
            jsonb_array_length(coalesce(m.photos, '[]'::jsonb)) as photo_count
       from public.merchants m
      where m.status = 'Pending' and m.owner_id is not null
      order by m.created_at`
  );
  for (const b of businesses) {
    if (listingGaps(b).length > 0 || looksLikeTest(b.business_name ?? "", b.email ?? "")) continue;
    items.push({ key: `b:${b.id}`, kind: "business", name: b.business_name || "A business" });
  }

  const deals = await db.query<{
    id: string; name: string; status: string; pending_photo_url: string | null; pending_photo_at: Date | string | null;
    revision_at: string | null; has_revision: boolean; business_name: string | null; email: string | null;
  }>(
    `select d.id::text, d.name, d.status, d.pending_photo_url, d.pending_photo_at,
            d.pending_revision->>'submittedAt' as revision_at, d.pending_revision is not null as has_revision,
            m.business_name, lower(m.email) as email
       from public.deals d join public.merchants m on m.id = d.merchant_id
      where not d.is_test
        and (d.status = 'Pending Approval'
             or (d.pending_photo_url is not null and d.status <> 'Cancelled')
             or d.pending_revision is not null)
      order by d.updated_at`
  );
  for (const d of deals) {
    if (looksLikeTest(d.business_name ?? "", d.email ?? "")) continue;
    const name = `${d.name || "A deal"}${d.business_name ? ` (${d.business_name})` : ""}`;
    if (d.status === "Pending Approval") items.push({ key: `d:${d.id}`, kind: "deal", name });
    if (d.has_revision) items.push({ key: `r:${d.id}:${d.revision_at ?? ""}`, kind: "change", name });
    if (d.pending_photo_url && d.status !== "Cancelled") {
      const at = d.pending_photo_at ? new Date(d.pending_photo_at).toISOString() : "";
      items.push({ key: `p:${d.id}:${at}`, kind: "photo", name });
    }
  }
  return items;
}

const LABEL: Record<QueueKind, [string, string]> = {
  business: ["business to approve", "businesses to approve"],
  deal: ["deal to review", "deals to review"],
  change: ["change request", "change requests"],
  photo: ["new deal photo to approve", "new deal photos to approve"],
};

function counts(items: QueueItem[]): string[] {
  return (Object.keys(LABEL) as QueueKind[])
    .map((k) => [k, items.filter((i) => i.kind === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${LABEL[k][n === 1 ? 0 : 1]}`);
}

export function reviewQueueEmail(waiting: QueueItem[], fresh: QueueItem[], adminUrl: string): { subject: string; html: string } {
  const summary = counts(waiting);
  const newList = fresh
    .slice(0, 10)
    .map((i) => `<li style="margin-bottom:4px;">${escapeHtml(i.name)} <span style="color:#8b8494;">(${LABEL[i.kind][0]})</span></li>`)
    .join("");
  return {
    subject: `MegaDeal: ${summary.join(", ")} waiting`.slice(0, 150),
    html: brandedEmailHtml(`
      <p style="margin:0 0 12px;">Waiting for you on MegaDeal: ${escapeHtml(summary.join(", "))}.</p>
      <p style="margin:0 0 6px;">New since the last email:</p>
      <ul style="margin:0 0 16px;padding-left:20px;">${newList}${fresh.length > 10 ? `<li>and ${fresh.length - 10} more</li>` : ""}</ul>
      <p style="margin:0 0 16px;">Businesses are told they'll usually hear back within 12 hours.</p>
      <p style="margin:0 0 16px;text-align:center;">
        <a href="${adminUrl}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Open admin</a>
      </p>
      <p style="margin:0;font-size:12px;color:#8b8494;">At most one of these an hour, and only when something new arrives.</p>
    `),
  };
}

/**
 * Emails the owner about anything new in the queue. "sent" when it did,
 * "nothing new" otherwise; "no address" without ADMIN_NOTIFY_EMAIL.
 * What was seen is only remembered once the email has gone (or when
 * nothing is new), so a failed send is tried again next hour.
 */
export async function alertReviewQueue(db: Sql, siteUrl: string): Promise<"sent" | "nothing new" | "no address" | "failed"> {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return "no address";
  const waiting = await reviewQueue(db);
  const [row] = await db.query<{ value: string | null }>(`select value from public.site_settings where key = $1`, [NOTIFIED_KEY]);
  let seen = new Set<string>();
  try {
    const parsed = row?.value ? JSON.parse(row.value) : [];
    if (Array.isArray(parsed)) seen = new Set(parsed.filter((k): k is string => typeof k === "string"));
  } catch {
    // Unreadable: treat everything as new once.
  }
  const fresh = waiting.filter((i) => !seen.has(short(i.key)));
  const remember = async () =>
    db.query(
      `insert into public.site_settings (key, value) values ($1, $2)
       on conflict (key) do update set value = excluded.value`,
      [NOTIFIED_KEY, JSON.stringify(waiting.slice(-MAX_REMEMBERED).map((i) => short(i.key)))],
    );
  if (fresh.length === 0) {
    // Forget what's been dealt with, so it counts as new if it comes back.
    if (waiting.length !== seen.size) await remember();
    return "nothing new";
  }
  const { subject, html } = reviewQueueEmail(waiting, fresh, `${siteUrl.replace(/\/$/, "")}/admin`);
  const ok = await sendTransactionalEmail({ to, subject, html }).catch(() => false);
  if (!ok) return "failed";
  await remember();
  return "sent";
}
