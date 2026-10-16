-- What customers do with deals, one row per action (16 Oct 2026), for the
-- business's and MegaDeal's reports (lib/dealEventLog.ts). The per-deal
-- counters on deals (view_count and the rest) stay as they are; this adds
-- the detail behind them: when, which deal, which button, and an
-- anonymous per-tab visit id, so reports can count visits as well as taps.
--
-- Never stored: names, email addresses, phone numbers, deal codes, full
-- web addresses or search text; the IP address isn't kept either. A row
-- can't be tied to a person.
--
-- Kept for 400 days (deleted by the daily backup job).
-- Additive only. To undo: drop the table.

create table public.deal_events (
  -- Made by the browser once per action, so a resend can't count twice.
  event_id      uuid primary key,
  occurred_at   timestamptz not null default now(),
  event         text not null check (event in (
                  'deal_view', 'deal_code_click', 'deal_code_reveal', 'deal_code_copy',
                  'deal_contact_click', 'business_profile_view', 'business_profile_click')),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  deal_id       uuid references public.deals(id) on delete cascade,
  session_id    text check (session_id ~ '^[A-Za-z0-9_-]{8,40}$'),
  source        text check (source in ('main', 'sticky', 'code_panel', 'deal_page', 'profile')),
  method        text check (method in ('booking', 'phone', 'website', 'email', 'directions')),
  device        text check (device in ('mobile', 'tablet', 'desktop')),
  referrer_host text check (char_length(referrer_host) <= 100),
  utm_source    text check (char_length(utm_source) <= 60),
  utm_medium    text check (char_length(utm_medium) <= 60),
  utm_campaign  text check (char_length(utm_campaign) <= 60)
);
create index deal_events_merchant_time_idx on public.deal_events (merchant_id, occurred_at);
create index deal_events_deal_time_idx on public.deal_events (deal_id, occurred_at);
create index deal_events_time_idx on public.deal_events (occurred_at);

-- Server only: a business reads its own figures through the site, which
-- checks who's signed in; nothing for the outside roles.
alter table public.deal_events enable row level security;
revoke all on public.deal_events from anon, authenticated;
