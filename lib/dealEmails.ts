import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";
import { formatOfferEndDate } from "./format";

/**
 * Emails a business gets when MegaDeal decides about one of its deals
 * (app/api/admin/deals/[id]): the first time it goes live, and when an
 * admin pauses or cancels it. The same news is in the portal's activity
 * list; this is so they don't have to keep checking it. Also the one
 * sent when a deal's run ends.
 */

export interface DealEmail {
  subject: string;
  html: string;
}

const portalLink = (siteUrl: string, label: string) =>
  `<p style="margin:0 0 16px;"><a href="${siteUrl}/portal" style="color:#6D28D9;font-weight:700;">${label}</a></p>`;

/** "Hi Harbour Light Espresso," to open a deal email. */
const greeting = (businessName: string | null | undefined) =>
  `<p style="margin:0 0 16px;">Hi ${escapeHtml(businessName || "there")},</p>`;

/** A deal approved for the first time. Before launch, it shows from launch day. */
export function dealLiveEmail(
  dealName: string,
  opts: { launched: boolean; siteUrl: string; businessName?: string | null; endsAt?: string | null; isFlash?: boolean }
): DealEmail {
  const name = escapeHtml(dealName || "Your deal");
  const ends = opts.endsAt && Number.isFinite(Date.parse(opts.endsAt))
    ? ` It runs until ${escapeHtml(formatOfferEndDate(opts.endsAt, Boolean(opts.isFlash)))}.`
    : "";
  return opts.launched
    ? {
        subject: `Your deal is live on MegaDeal: ${dealName || "your deal"}`.slice(0, 150),
        html: brandedEmailHtml(`
          ${greeting(opts.businessName)}
          <p style="margin:0 0 16px;">Good news: <strong>${name}</strong> is approved and live on MegaDeal, so customers can find it now.${ends}</p>
          <p style="margin:0 0 16px;">Sharing it with your own customers (social media, your website, a sign at the counter) is the quickest way to get it going.</p>
          ${portalLink(opts.siteUrl, "See it in your portal")}
        `),
      }
    : {
        subject: `Your deal is approved: ${dealName || "your deal"}`.slice(0, 150),
        html: brandedEmailHtml(`
          ${greeting(opts.businessName)}
          <p style="margin:0 0 16px;">Good news: <strong>${name}</strong> is approved. Customers will see it from MegaDeal's launch day, and we'll email you when we go live.</p>
          ${portalLink(opts.siteUrl, "See it in your portal")}
        `),
      };
}

/** "1 time" / "12 times". */
const times = (n: number) => `${n.toLocaleString("en-NZ")} time${n === 1 ? "" : "s"}`;

/** What running a deal again costs, for the deal-ended email. */
export type RunAgainCost =
  | { kind: "prelaunch" }
  | { kind: "credits"; cost: number; balance: number };

/** Views that make the subject line worth leading with. */
export const VIEWS_IN_SUBJECT = 5;

/**
 * A deal whose run has finished (lib/dealEndedNotices.ts): how it did,
 * and one tap to run it again. Carries the business-email unsubscribe
 * (lib/businessEmailOptOut.ts), since the "run it again" makes it more
 * than a plain notice. Says what another run costs (opts.cost), the usual
 * reason a business doesn't, and leads the subject with the views once
 * there are enough to be worth it.
 */
export function dealEndedEmail(
  deal: { id: string; name: string; endedAt: string; views: number; codeCopies: number },
  opts: { businessName: string; siteUrl: string; stopUrl: string; cost?: RunAgainCost | null }
): DealEmail {
  const name = escapeHtml(deal.name || "Your deal");
  const base = opts.siteUrl.replace(/\/$/, "");
  const again = `${base}/portal/new-deal?duplicate=${encodeURIComponent(deal.id)}`;
  const fresh = `${base}/portal/new-deal`;
  const stats =
    deal.views > 0
      ? `<p style="margin:0 0 16px;">While it ran, people viewed it ${times(deal.views)}${
          deal.codeCopies > 0 ? ` and copied its code ${times(deal.codeCopies)}` : ""
        }.</p>`
      : "";
  // What it costs is the usual reason not to: say so.
  const c = opts.cost;
  const cost = !c
    ? ""
    : c.kind === "prelaunch"
    ? "It's free before launch: you can run 1 Everyday Deal and 1 Flash Deal at a time."
    : c.cost === 0
    ? "Running another deal is free at the moment."
    : c.balance >= c.cost
    ? `You have ${c.balance.toLocaleString("en-NZ")} credits; running it again takes ${c.cost}.`
    : `Running it again takes ${c.cost} credits, and you have ${c.balance.toLocaleString("en-NZ")}.`;
  const subject =
    deal.views >= VIEWS_IN_SUBJECT
      ? `${deal.name || "Your deal"} ended with ${deal.views.toLocaleString("en-NZ")} views. Run it again?`
      : `Your deal has ended: ${deal.name || "your deal"}`;
  return {
    subject: subject.slice(0, 150),
    html: brandedEmailHtml(`
      ${greeting(opts.businessName)}
      <p style="margin:0 0 16px;"><strong>${name}</strong> finished on ${escapeHtml(formatOfferEndDate(deal.endedAt))}, so customers can't see it any more.</p>
      ${stats}
      <p style="margin:0 0 16px;">Want to run it again? We'll copy it into a new deal for you to check, change if you like, and submit.${cost ? ` ${cost}` : ""}</p>
      <p style="margin:0 0 8px;text-align:center;">
        <a href="${again}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Run this deal again</a>
      </p>
      <p style="margin:0 0 16px;text-align:center;font-size:14px;"><a href="${fresh}" style="color:#6D28D9;font-weight:600;">Or create a different deal</a></p>
      <p style="margin:0 0 16px;font-size:13px;color:#8b8494;">Questions? Just reply to this email.</p>
      <p style="margin:0;font-size:12px;color:#8b8494;border-top:1px solid #f1f0f4;padding-top:12px;">You're getting this because your business runs deals on MegaDeal. Don't want emails like this? <a href="${opts.stopUrl}" style="color:#8b8494;">Unsubscribe</a>.</p>
    `),
  };
}

/** A deal an admin paused or cancelled, with the reason if one was given. */
export function dealStoppedEmail(dealName: string, status: "Paused" | "Cancelled", note: string | null | undefined, opts: { siteUrl: string; businessName?: string | null }): DealEmail {
  const name = escapeHtml(dealName || "Your deal");
  const reason = note?.trim() ? `<p style="margin:0 0 16px;">The reason: ${escapeHtml(note.trim().slice(0, 500))}</p>` : "";
  const what = status === "Paused" ? "paused" : "cancelled";
  return {
    subject: `Your deal was ${what}: ${dealName || "your deal"}`.slice(0, 150),
    html: brandedEmailHtml(`
      ${greeting(opts.businessName)}
      <p style="margin:0 0 16px;">MegaDeal has ${what} <strong>${name}</strong>, so customers can't see it at the moment.</p>
      ${reason}
      <p style="margin:0 0 16px;">Questions, or want to fix something and run it again? Just reply to this email.</p>
      ${portalLink(opts.siteUrl, "Go to your portal")}
    `),
  };
}
