-- Security audit of 10 Oct 2026, findings 2 and 3. Password-reset links
-- and rate-limit counters move from Cloudflare KV, which can't read and
-- write in one step (two requests could both use one link, or both slip
-- under a limit), to here, where one statement does both.

-- A password-reset or set-your-password link. Only the SHA-256 of the
-- token is kept; using a link deletes its row in the same statement that
-- reads it, so it works once.
create table public.password_reset_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  email      text not null check (length(email) <= 320),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index password_reset_tokens_email_idx on public.password_reset_tokens (lower(email));

-- One fixed window per key. The key is a short name for the limit plus a
-- hash of who it's counting (an address or an IP), never the value itself.
create table public.rate_limits (
  key        text primary key check (key ~ '^[a-z0-9_-]{1,40}:[a-f0-9]{64}$'),
  count      integer not null check (count >= 0),
  window_end timestamptz not null
);
create index rate_limits_window_end_idx on public.rate_limits (window_end);

-- Server only: nothing for the outside roles.
alter table public.password_reset_tokens enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.password_reset_tokens, public.rate_limits from anon, authenticated;

-- When a deal-alert confirmation link was sent: it works for two weeks
-- (lib/emailSignups.ts VERIFY_LINK_DAYS). Finding 7.
alter table public.email_signups add column verify_sent_at timestamptz;
