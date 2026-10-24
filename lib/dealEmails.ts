import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";
import { greetingHtml } from "./emailGreeting";
import { formatOfferEndDate } from "./format";
import { nzDateTimeParts } from "./nzTime";

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

/** "Hi Sam," to open a deal email (lib/emailGreeting.ts). */
const greeting = (opts: { contactName?: string | null; businessName?: string | null }) =>
  greetingHtml(opts.contactName, opts.businessName);

/** A deal approved for the first time. Before launch, it shows from launch day. */
export function dealLiveEmail(
  dealName: string,
  opts: { launched: boolean; siteUrl: string; businessName?: string | null; contactName?: string | null; endsAt?: string | null; isFlash?: boolean }
): DealEmail {
  const name = escapeHtml(dealName || "Your deal");
  const ends = opts.endsAt && Number.isFinite(Date.parse(opts.endsAt))
    ? ` It runs until ${escapeHtml(formatOfferEndDate(opts.endsAt, Boolean(opts.isFlash)))}.`
    : "";
  return opts.launched
    ? {
        subject: `Your deal is live on MegaDeal: ${dealName || "your deal"}`.slice(0, 150),
        html: brandedEmailHtml(`
          ${greeting(opts)}
          <p style="margin:0 0 16px;">Good news: <strong>${name}</strong> is approved and live on MegaDeal, so customers can find it now.${ends}</p>
          <p style="margin:0 0 16px;">Sharing it with your own customers (social media, your website, a sign at the counter) is the quickest way to get it going.</p>
          ${portalLink(opts.siteUrl, "See it in your portal")}
        `),
      }
    : {
        subject: `Your deal is approved: ${dealName || "your deal"}`.slice(0, 150),
        html: brandedEmailHtml(`
          ${greeting(opts)}
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
  opts: { businessName: string; contactName?: string | null; siteUrl: string; stopUrl: string; cost?: RunAgainCost | null }
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
      ${greeting(opts)}
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

/** "9:00 pm" in NZ time. */
const nzTime = (ms: number) =>
  new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" }).format(new Date(ms));

/** True when `endsAt` falls on tomorrow's date in New Zealand. */
export function endsTomorrowInNz(endsAt: string, now: number = Date.now()): boolean {
  return nzDateTimeParts(Date.parse(endsAt)).date === nzDateTimeParts(now + 24 * 60 * 60 * 1000).date;
}

/**
 * An Everyday deal with about a day to go (lib/dealEndedNotices.ts): a
 * nudge to give it a last push while it's still on, and, from launch, to
 * line up the next one (before launch a second deal of the same type has
 * to wait until this one ends). Business-email unsubscribe, like the
 * deal-ended email.
 */
export function dealEndingEmail(
  deal: { id: string; name: string; slug: string; endsAt: string; views: number; codeCopies: number },
  opts: { businessName: string; contactName?: string | null; siteUrl: string; stopUrl: string; launched: boolean; now?: number }
): DealEmail {
  const name = escapeHtml(deal.name || "Your deal");
  const base = opts.siteUrl.replace(/\/$/, "");
  const tomorrow = endsTomorrowInNz(deal.endsAt, opts.now);
  const when = tomorrow ? `tomorrow at ${nzTime(Date.parse(deal.endsAt))}` : `on ${formatOfferEndDate(deal.endsAt, true)}`;
  const stats =
    deal.views > 0
      ? ` So far people have viewed it ${times(deal.views)}${deal.codeCopies > 0 ? ` and copied its code ${times(deal.codeCopies)}` : ""}.`
      : "";
  const next = opts.launched
    ? `<p style="margin:0 0 16px;text-align:center;font-size:14px;"><a href="${base}/portal/new-deal?duplicate=${encodeURIComponent(deal.id)}" style="color:#6D28D9;font-weight:600;">Line up your next deal</a></p>`
    : `<p style="margin:0 0 16px;">When it ends you can run it again, free before launch. We'll email you a one-tap link.</p>`;
  return {
    subject: `${deal.name || "Your deal"} ends ${tomorrow ? "tomorrow" : "soon"}: give it a last push`.slice(0, 150),
    html: brandedEmailHtml(`
      ${greeting(opts)}
      <p style="margin:0 0 16px;"><strong>${name}</strong> ends ${escapeHtml(when)}.${stats}</p>
      <p style="margin:0 0 16px;">A quick post today (social media, your website, a sign at the counter) saying it ends ${tomorrow ? "tomorrow" : "soon"} is a good way to bring in customers who've been meaning to come.</p>
      <p style="margin:0 0 8px;text-align:center;">
        <a href="${base}/deal/${encodeURIComponent(deal.slug)}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Open your deal to share it</a>
      </p>
      ${next}
      <p style="margin:0 0 16px;font-size:13px;color:#8b8494;">Questions? Just reply to this email.</p>
      <p style="margin:0;font-size:12px;color:#8b8494;border-top:1px solid #f1f0f4;padding-top:12px;">You're getting this because your business runs deals on MegaDeal. Don't want emails like this? <a href="${opts.stopUrl}" style="color:#8b8494;">Unsubscribe</a>.</p>
    `),
  };
}

/** A deal an admin paused or cancelled, with the reason if one was given. */
export function dealStoppedEmail(
  dealName: string,
  status: "Paused" | "Cancelled",
  note: string | null | undefined,
  opts: { siteUrl: string; businessName?: string | null; contactName?: string | null; neverLive?: boolean },
): DealEmail {
  const name = escapeHtml(dealName || "Your deal");
  const reason = note?.trim() ? `<p style="margin:0 0 16px;">The reason: ${escapeHtml(note.trim().slice(0, 500))}</p>` : "";
  const what = status === "Paused" ? "paused" : "cancelled";
  // A deal nobody had seen yet (T242): not "customers can't see it at the moment".
  const effect = opts.neverLive && status === "Cancelled" ? "before it went live" : "so customers can't see it at the moment";
  return {
    subject: `Your deal was ${what}: ${dealName || "your deal"}`.slice(0, 150),
    html: brandedEmailHtml(`
      ${greeting(opts)}
      <p style="margin:0 0 16px;">MegaDeal has ${what} <strong>${name}</strong>${opts.neverLive && status === "Cancelled" ? " " : ", "}${effect}.</p>
      ${reason}
      <p style="margin:0 0 16px;">Questions, or want to fix something and run it again? Just reply to this email.</p>
      ${portalLink(opts.siteUrl, "Go to your portal")}
    `),
  };
}

/**
 * A deal sent back for changes before it went live (lib/dealSendBack.ts),
 * by an admin or the automatic check (T181, T155). Never says "paused":
 * it was never on the site.
 */
export function dealChangesNeededEmail(
  dealName: string,
  reason: string,
  opts: { siteUrl: string; draftId: string; businessName?: string | null; contactName?: string | null; creditsReturned?: number },
): DealEmail {
  const name = escapeHtml(dealName || "Your deal");
  const credits = opts.creditsReturned
    ? ` The ${opts.creditsReturned} credit${opts.creditsReturned === 1 ? "" : "s"} it used ${opts.creditsReturned === 1 ? "has" : "have"} been returned.`
    : "";
  const fixUrl = `${opts.siteUrl}/portal/new-deal?draft=${encodeURIComponent(opts.draftId)}`;
  return {
    subject: "Your deal needs a small change before it goes live",
    html: brandedEmailHtml(`
      ${greeting(opts)}
      <p style="margin:0 0 16px;"><strong>${name}</strong> needs a small change before it can go live on MegaDeal.</p>
      <p style="margin:0 0 16px;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">${escapeHtml(reason.trim().slice(0, 600))}</p>
      <p style="margin:0 0 16px;">It's saved in your drafts with the same deal code.${credits} Make the change, then press <strong>Resubmit for review</strong> and we'll check it again.</p>
      <p style="margin:0 0 16px;text-align:center;">
        <a href="${fixUrl}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Fix and resubmit</a>
      </p>
      <p style="margin:0;font-size:13px;color:#8b8494;">Questions? Just reply to this email.</p>
    `),
  };
}

/**
 * A deal an admin rejected (lib/dealReject.ts, T242): final, with this
 * action's reason only, and the way to try again as a new deal.
 */
export function dealRejectedEmail(
  dealName: string,
  reason: string,
  opts: { siteUrl: string; dealId: string; businessName?: string | null; contactName?: string | null; creditsReturned?: number; wasLive?: boolean },
): DealEmail {
  const name = escapeHtml(dealName || "Your deal");
  const credits = opts.creditsReturned
    ? ` The ${opts.creditsReturned} credit${opts.creditsReturned === 1 ? "" : "s"} it used ${opts.creditsReturned === 1 ? "has" : "have"} been returned.`
    : "";
  const again = `${opts.siteUrl}/portal/new-deal?duplicate=${encodeURIComponent(opts.dealId)}`;
  return {
    subject: `Your deal “${dealName || "your deal"}” wasn't approved`.slice(0, 150),
    html: brandedEmailHtml(`
      ${greeting(opts)}
      <p style="margin:0 0 16px;">We couldn't approve <strong>${name}</strong>${opts.wasLive ? ", so it's been taken off MegaDeal" : ""}.${credits}</p>
      <p style="margin:0 0 16px;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">${escapeHtml(reason.trim().slice(0, 600))}</p>
      <p style="margin:0 0 16px;">You're welcome to submit a new deal that fixes this. The button below starts one with this deal's details filled in.</p>
      <p style="margin:0 0 16px;text-align:center;">
        <a href="${again}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Fix and submit a new deal</a>
      </p>
      <p style="margin:0;font-size:13px;color:#8b8494;">Questions? Just reply to this email.</p>
    `),
  };
}
