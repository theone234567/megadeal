-- MegaDeal's own database (moving off Wix, Oct 2026). Step 0 of
-- docs/WIX-MIGRATION.md: the schema, its rules and its permissions.
-- Nothing reads or writes it yet.
--
-- Shape of the access model:
--   * The website's server talks to the database with the service role,
--     which bypasses row-level security, and keeps doing the checks it does
--     today (who owns what, which status changes are allowed).
--   * Row-level security is the second lock: a signed-in business reaching
--     the database directly (the Supabase browser client, a leaked anon
--     key) can only ever read its own rows, and nobody can write anything
--     except through the server.
--   * The public sees deals and businesses only through two views that
--     expose public columns of live, approved records.
--
-- Supabase provides the auth schema (auth.users, auth.uid()) and the
-- anon / authenticated / service_role roles. The tests stub them
-- (lib/db/schema.test.ts).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- A web link as the site renders it: plain http(s) only, so a stored
-- "javascript:" link can never reach a page.
create or replace function public.is_http_url(value text) returns boolean
language sql immutable as $$
  select value is null or value = '' or value ~* '^https?://[^\s]+$';
$$;

-- ---------------------------------------------------------------------------
-- Categories: the six customer categories (lib/categories.ts), editable here
-- instead of in Wix. Deals and businesses point at them by slug.
-- ---------------------------------------------------------------------------

create table public.categories (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null unique check (length(name) between 1 and 60),
  sort_order  integer not null default 0,
  active      boolean not null default true
);

insert into public.categories (slug, name, sort_order) values
  ('food-drink',      'Food & Drink',      1),
  ('beauty-spa',      'Beauty & Spa',      2),
  ('things-to-do',    'Things To Do',      3),
  ('travel-getaways', 'Travel & Getaways', 4),
  ('health-fitness',  'Health & Fitness',  5),
  ('home-car',        'Home & Car',        6);

-- ---------------------------------------------------------------------------
-- Businesses (Wix "Merchants")
-- ---------------------------------------------------------------------------

create table public.merchants (
  id                  uuid primary key default gen_random_uuid(),
  -- The Wix item id, kept so the import can be re-run and checked.
  wix_id              text unique,
  -- The business's login (Supabase Auth). Null until the account is
  -- claimed, like Wix's _owner today.
  owner_id            uuid unique references auth.users (id) on delete set null,

  -- Private: never in the public view.
  email               text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  email_verified      boolean not null default false,
  legal_business_name text check (length(legal_business_name) <= 300),
  nzbn                text check (nzbn ~ '^[0-9]{13}$' or nzbn is null or nzbn = ''),
  contact_name        text check (length(contact_name) <= 300),
  contact_phone       text check (length(contact_phone) <= 60),
  postcode            text check (length(postcode) <= 20),
  coupon_code         text check (length(coupon_code) <= 50),
  referral_code       text unique check (length(referral_code) <= 20),
  referred_by_code    text check (length(referred_by_code) <= 20),
  referral_rewarded   boolean not null default false,
  promo_rewarded      boolean not null default false,
  notify_referral_bonus boolean not null default false,
  rudeness_check      jsonb,
  credits_balance     integer not null default 0 check (credits_balance >= 0),
  status              text not null default 'Pending'
                        check (status in ('Pending', 'Approved', 'Suspended')),
  first_approved_at   timestamptz,

  -- Public once approved (public_businesses below).
  business_name       text not null check (length(business_name) between 1 and 300),
  category_slug       text references public.categories (slug),
  bio                 text check (length(bio) <= 2000),
  phone               text check (length(phone) <= 60),
  website             text check (public.is_http_url(website)),
  booking_url         text check (public.is_http_url(booking_url)),
  booking_email       text check (booking_email is null or booking_email = '' or booking_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  facebook_url        text check (public.is_http_url(facebook_url)),
  instagram_url       text check (public.is_http_url(instagram_url)),
  address             text check (length(address) <= 300),
  suburb              text check (length(suburb) <= 40),
  city                text check (length(city) <= 60),
  lat                 double precision check (lat between -90 and 90),
  lng                 double precision check (lng between -180 and 180),
  business_hours      text check (length(business_hours) <= 2000),
  price_range         text check (price_range in ('', '$', '$$', '$$$', '$$$$')),
  amenities           text[] not null default '{}',
  logo_url            text check (public.is_http_url(logo_url)),
  photos              jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  rating              numeric(2, 1) check (rating between 0 and 5),
  review_count        integer check (review_count >= 0),
  default_booking_requirement text
                        check (default_booking_requirement in ('', 'required', 'recommended', 'not_required')),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One business per email address, whatever its capitals.
create unique index merchants_email_key on public.merchants (lower(email));
create index merchants_status_idx on public.merchants (status);

create trigger merchants_updated_at before update on public.merchants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Deals: the Wix "Deals" row and its Wix Stores product, as one record.
-- ---------------------------------------------------------------------------

create table public.deals (
  id                  uuid primary key default gen_random_uuid(),
  wix_id              text unique,
  wix_product_id      text unique,
  merchant_id         uuid not null references public.merchants (id) on delete restrict,

  -- What the Stores product held.
  slug                text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                text not null default '' check (length(name) <= 200),
  description         text not null default '' check (length(description) <= 5000),
  category_slug       text references public.categories (slug),
  photo_url           text check (public.is_http_url(photo_url)),
  price_now           numeric(10, 2) check (price_now >= 0),
  price_was           numeric(10, 2) check (price_was >= 0),
  ribbon              text check (length(ribbon) <= 40),

  -- What the Deals row held.
  terms               text check (length(terms) <= 5000),
  quantity_available  integer check (quantity_available >= 0),
  is_flash            boolean not null default false,
  status              text not null
                        check (status in ('Draft', 'Pending Approval', 'Live', 'Paused', 'Cancelled')),
  -- Who paused it. A business may resume only its own pause; an admin's
  -- pause stays until an admin lifts it (security review, 6 Oct 2026).
  paused_by           text check (paused_by in ('business', 'admin')),
  status_note         text check (length(status_note) <= 2000),
  booking_requirement text check (booking_requirement in ('required', 'recommended', 'not_required', 'unknown')),
  deal_code           text check (length(deal_code) <= 40),
  code_on_website     boolean,
  code_website_url    text check (public.is_http_url(code_website_url)),
  credits_charged     integer not null default 0 check (credits_charged >= 0),
  credit_refunded     boolean not null default false,
  requested_duration_minutes integer check (requested_duration_minutes > 0),
  scheduled_start_at  timestamptz,
  first_approved_at   timestamptz,
  first_published_at  timestamptz,
  expires_at          timestamptz,
  ever_live           boolean not null default false,
  pending_revision    jsonb,
  pending_photo_url   text check (public.is_http_url(pending_photo_url)),
  pending_photo_review jsonb,
  ai_review           jsonb,
  content_history     jsonb not null default '[]'::jsonb check (jsonb_typeof(content_history) = 'array'),
  draft_data          jsonb,
  draft_revision      integer not null default 0 check (draft_revision >= 0),
  is_test             boolean not null default false,

  -- Anonymous counters for the business's analytics (lib/dealEvents.ts).
  view_count              integer not null default 0 check (view_count >= 0),
  click_count             integer not null default 0 check (click_count >= 0),
  code_copy_count         integer not null default 0 check (code_copy_count >= 0),
  website_click_count     integer not null default 0 check (website_click_count >= 0),
  call_click_count        integer not null default 0 check (call_click_count >= 0),
  email_click_count       integer not null default 0 check (email_click_count >= 0),
  directions_click_count  integer not null default 0 check (directions_click_count >= 0),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Anything past a draft is on the storefront's books: it needs its
  -- address, a name, a price and a category.
  constraint deals_submitted_complete check (
    status = 'Draft'
    or (slug is not null and name <> '' and price_now is not null and category_slug is not null)
  ),
  constraint deals_was_not_below_now check (price_was is null or price_now is null or price_was >= price_now),
  -- paused_by belongs to paused deals only.
  constraint deals_paused_by_only_when_paused check ((status = 'Paused') = (paused_by is not null))
);

create index deals_merchant_idx on public.deals (merchant_id);
create index deals_live_idx on public.deals (status, expires_at) where status = 'Live';
create index deals_category_idx on public.deals (category_slug) where status = 'Live';

create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The business's activity feed (Wix "MerchantActivity")
-- ---------------------------------------------------------------------------

create table public.merchant_activity (
  id          bigint generated always as identity primary key,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  type        text not null check (type in ('credit', 'deal')),
  amount      integer,
  description text not null check (length(description) <= 1000),
  created_at  timestamptz not null default now()
);

create index merchant_activity_merchant_idx on public.merchant_activity (merchant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Launch-update sign-ups (Wix "EmailSignups"). Tokens are stored hashed
-- (sha-256 hex), unlike in Wix, so a database leak can't confirm or
-- unsubscribe anyone.
-- ---------------------------------------------------------------------------

create table public.email_signups (
  id                      uuid primary key default gen_random_uuid(),
  wix_id                  text unique,
  email                   text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  audience                text not null check (audience in ('customer', 'merchant')),
  source                  text check (length(source) <= 60),
  verified                boolean not null default false,
  verify_token_hash       text unique check (verify_token_hash ~ '^[0-9a-f]{64}$'),
  unsubscribed            boolean not null default false,
  unsubscribe_token_hash  text unique check (unsubscribe_token_hash ~ '^[0-9a-f]{64}$'),
  created_at              timestamptz not null default now(),
  verified_at             timestamptz,
  unsubscribed_at         timestamptz
);

-- One row per address and audience (lib/emailSignups.ts already dedupes).
create unique index email_signups_email_audience_key on public.email_signups (lower(email), audience);

-- ---------------------------------------------------------------------------
-- Contact form messages (Wix "ContactMessages")
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id         bigint generated always as identity primary key,
  name       text not null check (length(name) between 1 and 200),
  email      text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  message    text not null check (length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Daily usage caps for paid outside APIs (Wix "ApiUsageCounters"), e.g. the
-- Google Places lookups.
-- ---------------------------------------------------------------------------

create table public.api_usage_counters (
  day     date not null,
  counter text not null check (counter ~ '^[a-z0-9_-]{1,40}$'),
  count   integer not null default 0 check (count >= 0),
  primary key (day, counter)
);

-- ---------------------------------------------------------------------------
-- Safe, one-step updates. Each runs as a single statement, so two requests
-- at once can't both spend the same credit or lose a count.
-- ---------------------------------------------------------------------------

-- Takes credits only if the business has enough. Returns the new balance,
-- or null when there weren't enough (nothing is taken).
create or replace function public.debit_credits(p_merchant uuid, p_amount integer)
returns integer language sql as $$
  update public.merchants
     set credits_balance = credits_balance - p_amount
   where id = p_merchant and p_amount > 0 and credits_balance >= p_amount
  returning credits_balance;
$$;

-- Adds credits (a top-up, refund or reward). Returns the new balance.
create or replace function public.grant_credits(p_merchant uuid, p_amount integer)
returns integer language sql as $$
  update public.merchants
     set credits_balance = credits_balance + p_amount
   where id = p_merchant and p_amount > 0
  returning credits_balance;
$$;

-- Adds one to a deal's analytics counter. Only the named counters exist;
-- anything else is refused rather than turned into SQL.
create or replace function public.increment_deal_counter(p_deal uuid, p_counter text)
returns void language plpgsql as $$
begin
  case p_counter
    when 'view' then update public.deals set view_count = view_count + 1 where id = p_deal;
    when 'click' then update public.deals set click_count = click_count + 1 where id = p_deal;
    when 'code_copy' then update public.deals set code_copy_count = code_copy_count + 1 where id = p_deal;
    when 'website_click' then update public.deals set website_click_count = website_click_count + 1 where id = p_deal;
    when 'call_click' then update public.deals set call_click_count = call_click_count + 1 where id = p_deal;
    when 'email_click' then update public.deals set email_click_count = email_click_count + 1 where id = p_deal;
    when 'directions_click' then update public.deals set directions_click_count = directions_click_count + 1 where id = p_deal;
    else raise exception 'unknown deal counter: %', p_counter;
  end case;
end;
$$;

-- Uses one unit of today's allowance for an outside API. True if allowed
-- (and counted), false once the day's limit is reached.
create or replace function public.use_api_allowance(p_counter text, p_limit integer, p_day date default current_date)
returns boolean language sql as $$
  with used as (
    insert into public.api_usage_counters (day, counter, count)
    values (p_day, p_counter, 1)
    on conflict (day, counter) do update
      set count = public.api_usage_counters.count + 1
      where public.api_usage_counters.count < p_limit
    returning count
  )
  select exists (select 1 from used) and p_limit > 0;
$$;

-- ---------------------------------------------------------------------------
-- What the public can see: public columns of approved businesses and
-- their live deals. Views run with their owner's rights, so they read
-- past row-level security, which is why they list columns one by one and
-- filter to public records themselves.
-- ---------------------------------------------------------------------------

create view public.public_businesses as
select
  m.id, m.business_name, m.category_slug, m.bio, m.phone, m.website,
  m.booking_url, m.booking_email, m.facebook_url, m.instagram_url,
  m.address, m.suburb, m.city, m.lat, m.lng, m.business_hours,
  m.price_range, m.amenities, m.logo_url, m.photos, m.rating, m.review_count
from public.merchants m
where m.status = 'Approved';

create view public.public_deals as
select
  d.id, d.slug, d.name, d.description, d.terms, d.category_slug, d.photo_url,
  d.price_now, d.price_was, d.ribbon, d.quantity_available, d.is_flash,
  d.booking_requirement, d.deal_code, d.code_on_website, d.code_website_url,
  d.first_published_at as starts_at, d.expires_at, d.merchant_id as business_id
from public.deals d
join public.merchants m on m.id = d.merchant_id
where d.status = 'Live'
  and not d.is_test
  and m.status = 'Approved'
  and (d.first_published_at is null or d.first_published_at <= now())
  and (d.expires_at is null or d.expires_at > now());

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

alter table public.categories        enable row level security;
alter table public.merchants         enable row level security;
alter table public.deals             enable row level security;
alter table public.merchant_activity enable row level security;
alter table public.email_signups     enable row level security;
alter table public.contact_messages  enable row level security;
alter table public.api_usage_counters enable row level security;

-- Start from nothing for the outside roles, then grant reads only.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Anyone: active categories, public businesses, live deals.
grant select on public.categories to anon, authenticated;
create policy categories_read on public.categories
  for select to anon, authenticated using (active);
grant select on public.public_businesses, public.public_deals to anon, authenticated;

-- A signed-in business: its own record, deals and activity. Read only;
-- every change goes through the website's server.
grant select on public.merchants, public.deals, public.merchant_activity to authenticated;

create policy merchants_read_own on public.merchants
  for select to authenticated using (owner_id = auth.uid());

create policy deals_read_own on public.deals
  for select to authenticated
  using (merchant_id in (select id from public.merchants where owner_id = auth.uid()));

create policy merchant_activity_read_own on public.merchant_activity
  for select to authenticated
  using (merchant_id in (select id from public.merchants where owner_id = auth.uid()));

-- email_signups, contact_messages and api_usage_counters have no
-- policies and no grants: only the server (service role) touches them.

-- Supabase's helper functions used above stay callable.
grant execute on function public.is_http_url(text) to anon, authenticated;
