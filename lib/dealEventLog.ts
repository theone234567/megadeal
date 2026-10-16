import type { Sql } from "./db/connection";

/**
 * What customers do with deals, one row per action (public.deal_events,
 * 20261021000000_deal_events.sql), and the figures each business sees.
 *
 * Collected from the browser by lib/trackDeal.ts, checked here: known event
 * names only, ids the database has, the business taken from the deal (never
 * from the browser), and nothing that could identify a person.
 */

export const DEAL_EVENT_NAMES = [
  "deal_view",
  "deal_code_click",
  "deal_code_reveal",
  "deal_code_copy",
  "deal_contact_click",
  "business_profile_view",
  "business_profile_click",
] as const;
export type DealEventName = (typeof DEAL_EVENT_NAMES)[number];
export const EVENT_SOURCES = ["main", "sticky", "code_panel", "deal_page", "profile"] as const;
export const CONTACT_METHODS_TRACKED = ["booking", "phone", "website", "email", "directions"] as const;

export interface IncomingEvent {
  eventId: string;
  event: DealEventName;
  dealId: string | null;
  businessSlug: string | null;
  sessionId: string | null;
  source: (typeof EVENT_SOURCES)[number] | null;
  method: (typeof CONTACT_METHODS_TRACKED)[number] | null;
  referrerHost: string | null;
  utm: { source: string | null; medium: string | null; campaign: string | null };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pick = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);
/** Short plain text (a campaign name), or null: never a web address, an
 *  email address or anything long. */
function tag(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase().slice(0, max);
  return /^[a-z0-9._\- ]+$/.test(t) && !/@/.test(t) ? t : null;
}
/** A site name ("google.com"), from the referring page's host only. */
function host(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase().replace(/^www\./, "");
  return /^[a-z0-9.-]{1,100}$/.test(t) && t.includes(".") ? t : null;
}

/** One event from the browser, checked; null when anything's wrong. */
export function parseIncomingEvent(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const event = pick(DEAL_EVENT_NAMES, r.event);
  if (!event || typeof r.eventId !== "string" || !UUID_RE.test(r.eventId)) return null;
  const dealId = typeof r.dealId === "string" && UUID_RE.test(r.dealId) ? r.dealId : null;
  const businessSlug = typeof r.businessSlug === "string" && /^[a-z0-9-]{1,120}$/.test(r.businessSlug) ? r.businessSlug : null;
  // Every event is about a deal, except a profile view, which may have none.
  if (event === "business_profile_view" ? !businessSlug : !dealId) return null;
  const method = pick(CONTACT_METHODS_TRACKED, r.method);
  if (event === "deal_contact_click" && !method) return null;
  return {
    eventId: r.eventId.toLowerCase(),
    event,
    dealId,
    businessSlug,
    sessionId: typeof r.sessionId === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(r.sessionId) ? r.sessionId : null,
    source: pick(EVENT_SOURCES, r.source),
    method: event === "deal_contact_click" ? method : null,
    referrerHost: host(r.referrerHost),
    utm: { source: tag(r.utmSource, 60), medium: tag(r.utmMedium, 60), campaign: tag(r.utmCampaign, 60) },
  };
}

/** "mobile", "tablet" or "desktop" from the browser's own description. */
export function deviceClass(userAgent: string | null): "mobile" | "tablet" | "desktop" {
  const ua = (userAgent ?? "").toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/.test(ua)) return "mobile";
  return "desktop";
}

/** Crawlers and link previewers: never counted. */
export function looksLikeBot(userAgent: string | null): boolean {
  return !userAgent || /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|axios|node-fetch/i.test(userAgent);
}

/**
 * Stores the events that check out. The business is read from the deal
 * (or the profile), so a browser can't file an event against another
 * business; a deal that isn't live (or a test deal) counts nothing.
 * Returns how many were stored; a repeat event id stores nothing.
 */
export async function recordDealEvents(db: Sql, events: IncomingEvent[], device: "mobile" | "tablet" | "desktop"): Promise<number> {
  let stored = 0;
  for (const e of events) {
    const rows = await db.query<{ event_id: string }>(
      `insert into public.deal_events
         (event_id, event, merchant_id, deal_id, session_id, source, method, device, referrer_host, utm_source, utm_medium, utm_campaign)
       select $1, $2, owner.merchant_id, owner.deal_id, $5, $6, $7, $8, $9, $10, $11, $12
         from (
           select d.merchant_id, d.id as deal_id
             from public.deals d join public.merchants m on m.id = d.merchant_id
            where $3::uuid is not null and d.id = $3::uuid and m.status = 'Approved'
              and d.status in ('Live', 'Paused') and not coalesce(d.is_test, false)
              and ($4::text is null or m.slug = $4)
           union all
           select m.id, null
             from public.merchants m
            where $3::uuid is null and m.slug = $4 and m.status = 'Approved'
         ) owner
       on conflict (event_id) do nothing
       returning event_id`,
      [e.eventId, e.event, e.dealId, e.businessSlug, e.sessionId, e.source, e.method, device, e.referrerHost, e.utm.source, e.utm.medium, e.utm.campaign],
    );
    stored += rows.length;
  }
  return stored;
}

export interface DealStats {
  days: number;
  totals: {
    views: number;
    viewSessions: number;
    codeClicks: number;
    reveals: number;
    revealSessions: number;
    /** Distinct (visit, deal) pairs that revealed ÷ that viewed, 0–1;
     *  null with no views. */
    revealRate: number | null;
    copies: number;
    contactClicks: number;
    profileViews: number;
  };
  byMethod: Record<(typeof CONTACT_METHODS_TRACKED)[number], number>;
  byDevice: Record<"mobile" | "tablet" | "desktop", number>;
  bySource: { main: number; sticky: number };
  deals: { dealId: string; name: string; views: number; viewSessions: number; revealSessions: number; contactClicks: number; copies: number }[];
}

/**
 * One business's figures for the last `days` days (or every business's,
 * for MegaDeal's own view, when merchantId is null). Raw counts are taps;
 * "sessions" are distinct anonymous visits, which can't tell one person
 * on two devices apart.
 */
export async function dealStats(db: Sql, merchantId: string | null, days: number): Promise<DealStats> {
  const params: unknown[] = [days];
  const scope = merchantId ? (params.push(merchantId), `and e.merchant_id = $2::uuid`) : "";
  const since = `e.occurred_at >= now() - make_interval(days => $1::int)`;
  const [t] = await db.query<Record<string, string>>(
    `select
        count(*) filter (where event = 'deal_view') as views,
        count(distinct session_id) filter (where event = 'deal_view') as view_sessions,
        count(*) filter (where event = 'deal_code_click') as code_clicks,
        count(*) filter (where event = 'deal_code_reveal') as reveals,
        count(distinct session_id) filter (where event = 'deal_code_reveal') as reveal_sessions,
        count(distinct (session_id, deal_id)) filter (where event = 'deal_view' and session_id is not null) as view_pairs,
        count(distinct (session_id, deal_id)) filter (where event = 'deal_code_reveal' and session_id is not null) as reveal_pairs,
        count(*) filter (where event = 'deal_code_copy') as copies,
        count(*) filter (where event = 'deal_contact_click') as contact_clicks,
        count(*) filter (where event = 'business_profile_view') as profile_views,
        count(*) filter (where event = 'deal_code_click' and source = 'main') as src_main,
        count(*) filter (where event = 'deal_code_click' and source = 'sticky') as src_sticky
       from public.deal_events e where ${since} ${scope}`,
    params,
  );
  const n = (v: unknown) => Number(v ?? 0) || 0;
  const methodRows = await db.query<{ method: string; n: string }>(
    `select method, count(*) as n from public.deal_events e where ${since} ${scope} and event = 'deal_contact_click' group by method`,
    params,
  );
  const deviceRows = await db.query<{ device: string; n: string }>(
    `select device, count(*) as n from public.deal_events e where ${since} ${scope} and event = 'deal_view' group by device`,
    params,
  );
  const dealRows = await db.query<Record<string, string>>(
    `select e.deal_id, d.name,
        count(*) filter (where event = 'deal_view') as views,
        count(distinct session_id) filter (where event = 'deal_view') as view_sessions,
        count(distinct session_id) filter (where event = 'deal_code_reveal') as reveal_sessions,
        count(*) filter (where event = 'deal_contact_click') as contact_clicks,
        count(*) filter (where event = 'deal_code_copy') as copies
       from public.deal_events e join public.deals d on d.id = e.deal_id
      where ${since} ${scope}
      group by e.deal_id, d.name
      order by views desc, d.name
      limit 200`,
    params,
  );
  const byMethod = { booking: 0, phone: 0, website: 0, email: 0, directions: 0 };
  for (const r of methodRows) if (r.method in byMethod) byMethod[r.method as keyof typeof byMethod] = n(r.n);
  const byDevice = { mobile: 0, tablet: 0, desktop: 0 };
  for (const r of deviceRows) if (r.device in byDevice) byDevice[r.device as keyof typeof byDevice] = n(r.n);
  const viewPairs = n(t?.view_pairs);
  return {
    days,
    totals: {
      views: n(t?.views),
      viewSessions: n(t?.view_sessions),
      codeClicks: n(t?.code_clicks),
      reveals: n(t?.reveals),
      revealSessions: n(t?.reveal_sessions),
      revealRate: viewPairs > 0 ? Math.min(1, n(t?.reveal_pairs) / viewPairs) : null,
      copies: n(t?.copies),
      contactClicks: n(t?.contact_clicks),
      profileViews: n(t?.profile_views),
    },
    byMethod,
    byDevice,
    bySource: { main: n(t?.src_main), sticky: n(t?.src_sticky) },
    deals: dealRows.map((r) => ({
      dealId: r.deal_id,
      name: r.name ?? "",
      views: n(r.views),
      viewSessions: n(r.view_sessions),
      revealSessions: n(r.reveal_sessions),
      contactClicks: n(r.contact_clicks),
      copies: n(r.copies),
    })),
  };
}

export const STATS_PERIODS = [7, 30, 90] as const;
export function statsDays(v: unknown): number {
  const d = Number(v);
  return (STATS_PERIODS as readonly number[]).includes(d) ? d : 30;
}
