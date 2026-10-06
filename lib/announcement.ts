import { createHash } from "crypto";
import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";

/**
 * The launch announcement (and any later one-off announcement): one email,
 * written in Admin → Subscribers, sent once to each person who asked for it.
 * Sending lives in app/api/admin/announcement/route.ts; this file is the
 * part that decides who gets it and what it looks like, kept free of
 * storage so it can be tested.
 *
 * Who:
 *  - "customers": deal-alert subscribers (EmailSignups, audience customer)
 *  - "waitlist": businesses who asked for launch news (EmailSignups,
 *    audience merchant)
 *  - "businesses": approved businesses (Merchants, status Approved), which
 *    the portal tells "We'll email you when we launch"
 *
 * Only addresses that confirmed their subscription and haven't
 * unsubscribed, each once (rows can repeat an address under different
 * casing), and every subscriber email carries its own unsubscribe link,
 * as the Unsolicited Electronic Messages Act and Gmail's and Yahoo's
 * sender rules require.
 */

export type AnnouncementAudience = "customers" | "waitlist" | "businesses";
export const AUDIENCES: AnnouncementAudience[] = ["customers", "waitlist", "businesses"];

export interface Recipient {
  email: string;
  /** Subscribers' permanent unsubscribe token, when it can be read back.
   *  MegaDeal's own database keeps only a fingerprint of it, so there the
   *  sender gives the row a fresh one (earlier links keep working). */
  unsubscribeToken?: string;
  /** The subscriber's row, to save a fresh token on. Businesses have none. */
  row?: Record<string, unknown>;
  name?: string;
}

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;

/** Confirmed, still-subscribed signups of one audience, each address once. */
export function subscriberRecipients(rows: Record<string, unknown>[], audience: "customer" | "merchant"): Recipient[] {
  const seen = new Map<string, Recipient>();
  const unsubscribed = new Set<string>();
  for (const row of rows) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || row.audience !== audience) continue;
    // Unsubscribing under any row for this address counts for all of them.
    if (row.unsubscribed) {
      unsubscribed.add(email);
      continue;
    }
    if (row.verified !== true) continue;
    const token = typeof row.unsubscribeToken === "string" && row.unsubscribeToken ? row.unsubscribeToken : undefined;
    if (!seen.has(email)) seen.set(email, { email, unsubscribeToken: token, row });
  }
  return [...seen.values()].filter((r) => !unsubscribed.has(r.email));
}

/** Approved businesses, each address once. */
export function businessRecipients(rows: Record<string, unknown>[]): Recipient[] {
  const seen = new Map<string, Recipient>();
  for (const row of rows) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || row.status !== "Approved") continue;
    if (!seen.has(email)) seen.set(email, { email, name: typeof row.businessName === "string" ? row.businessName : undefined });
  }
  return [...seen.values()];
}

/** Where each audience's button goes, and what it says. */
export const BUTTON: Record<AnnouncementAudience, { label: string; path: string }> = {
  customers: { label: "See today's deals", path: "/" },
  waitlist: { label: "List my business", path: "/list-your-business" },
  businesses: { label: "Go to my business portal", path: "/portal" },
};

/** First drafts, to be edited in the admin page before sending. */
export const DRAFTS: Record<AnnouncementAudience, { subject: string; body: string }> = {
  customers: {
    subject: "MegaDeal is live in Auckland",
    body: "MegaDeal is now live. You asked us to let you know, so here we are.\n\nBrowse local deals from Auckland restaurants, spas, activities and more. Get a deal code, then book or buy directly with the business.",
  },
  waitlist: {
    subject: "MegaDeal is live: list your business",
    body: "MegaDeal is now live in Auckland, and you asked to hear when it was.\n\nEligible new businesses can get up to 3 months of free advertising with code WELCOME3, with 0% commission on your sales. Terms apply.",
  },
  businesses: {
    subject: "MegaDeal is live: submit your deals",
    body: "MegaDeal is now live in Auckland.\n\nYou can now submit the deals you've saved in your business portal. Our team checks each one, and once it's approved it goes live for customers.",
  },
};

export const SUBJECT_MAX = 150;
export const BODY_MAX = 4000;

/** Plain text in, safe HTML paragraphs out: a blank line starts a new paragraph. */
export function bodyToHtml(body: string): string {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function announcementHtml(opts: {
  audience: AnnouncementAudience;
  body: string;
  siteUrl: string;
  unsubscribeUrl?: string;
}): string {
  const site = opts.siteUrl.replace(/\/$/, "");
  const button = BUTTON[opts.audience];
  const why =
    opts.audience === "businesses"
      ? "You're getting this because your business has a MegaDeal account."
      : opts.audience === "waitlist"
        ? "You're getting this because you asked MegaDeal for launch news for businesses."
        : "You're getting this because you signed up for MegaDeal deal alerts.";
  return (
    brandedEmailHtml(`
      ${bodyToHtml(opts.body)}
      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${site}${button.path}" style="display:inline-block;background:#6520B5;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:9999px;">${escapeHtml(button.label)}</a>
      </div>
    `) +
    `<p style="margin:16px auto 0;max-width:480px;text-align:center;font-size:12px;line-height:1.5;color:#a39cae;">
      ${why} MegaDeal, Auckland, New Zealand.${
        opts.unsubscribeUrl ? ` <a href="${opts.unsubscribeUrl}" style="color:#a39cae;">Unsubscribe</a>` : ""
      }
    </p>`
  );
}

/**
 * Who has been sent an announcement is kept as one list per announcement
 * and audience: fingerprints of the addresses, never the addresses. One
 * read and one write per batch, because a Worker request can only make so
 * many storage calls, and a list of thousands checked one by one wouldn't
 * fit.
 */
export function sentListKey(campaign: string, audience: AnnouncementAudience): string {
  return `announce:${campaign}:${audience}`;
}

export function addressHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

/** The stored list, read defensively: anything unreadable counts as empty. */
export function parseSentList(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list.filter((h): h is string => typeof h === "string") : []);
  } catch {
    return new Set();
  }
}

/** Announcement names: short, lower case, so a typo can't re-send to everyone. */
export const CAMPAIGN_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
