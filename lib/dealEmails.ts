import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";

/**
 * Emails a business gets when MegaDeal decides about one of its deals
 * (app/api/admin/deals/[id]): the first time it goes live, and when an
 * admin pauses or cancels it. The same news is in the portal's activity
 * list; this is so they don't have to keep checking it.
 */

export interface DealEmail {
  subject: string;
  html: string;
}

const portalLink = (siteUrl: string, label: string) =>
  `<p style="margin:0 0 16px;"><a href="${siteUrl}/portal" style="color:#6520B5;font-weight:700;">${label}</a></p>`;

/** A deal approved for the first time. Before launch, it shows from launch day. */
export function dealLiveEmail(dealName: string, opts: { launched: boolean; siteUrl: string }): DealEmail {
  const name = escapeHtml(dealName || "Your deal");
  return opts.launched
    ? {
        subject: `Your deal is live on MegaDeal: ${dealName || "your deal"}`.slice(0, 150),
        html: brandedEmailHtml(`
          <p style="margin:0 0 16px;">Good news: <strong>${name}</strong> is approved and live on MegaDeal, so customers can find it now.</p>
          <p style="margin:0 0 16px;">Sharing it with your own customers (social media, your website, a sign at the counter) is the quickest way to get it going.</p>
          ${portalLink(opts.siteUrl, "See it in your portal")}
        `),
      }
    : {
        subject: `Your deal is approved: ${dealName || "your deal"}`.slice(0, 150),
        html: brandedEmailHtml(`
          <p style="margin:0 0 16px;">Good news: <strong>${name}</strong> is approved. Customers will see it from MegaDeal's launch day, and we'll email you when we go live.</p>
          ${portalLink(opts.siteUrl, "See it in your portal")}
        `),
      };
}

/** A deal an admin paused or cancelled, with the reason if one was given. */
export function dealStoppedEmail(dealName: string, status: "Paused" | "Cancelled", note: string | null | undefined, opts: { siteUrl: string }): DealEmail {
  const name = escapeHtml(dealName || "Your deal");
  const reason = note?.trim() ? `<p style="margin:0 0 16px;">The reason: ${escapeHtml(note.trim().slice(0, 500))}</p>` : "";
  const what = status === "Paused" ? "paused" : "cancelled";
  return {
    subject: `Your deal was ${what}: ${dealName || "your deal"}`.slice(0, 150),
    html: brandedEmailHtml(`
      <p style="margin:0 0 16px;">MegaDeal has ${what} <strong>${name}</strong>, so customers can't see it at the moment.</p>
      ${reason}
      <p style="margin:0 0 16px;">Questions, or want to fix something and run it again? Just reply to this email.</p>
      ${portalLink(opts.siteUrl, "Go to your portal")}
    `),
  };
}
