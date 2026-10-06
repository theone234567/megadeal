-- Readable page addresses (Oct 2026, before launch, so nothing indexed is
-- lost):
--   business: /business/<name>-<suburb>          harbour-bistro-ponsonby
--   deal:     /deal/<deal>-<business>-<suburb>   two-course-dinner-harbour-bistro-ponsonby
-- Made here, in the database, so every way a row is written (the site,
-- the import, a fix by hand) gets the same address. Old addresses are kept
-- in slug_redirects and permanently redirected, so a rename never breaks a
-- link or loses its search standing.

-- Text to an address part: lower case, te reo macrons and other accents
-- kept as their plain letter (Ōtāhuhu -> otahuhu), anything else a hyphen.
create or replace function public.slugify(value text) returns text
language sql immutable as $$
  select trim(both '-' from left(trim(both '-' from regexp_replace(
    translate(lower(coalesce(value, '')),
      'āēīōūàáâãäåèéêëìíîïòóôõöùúûüýÿñçœæ',
      'aeiouaaaaaaeeeeiiiiooooouuuuyyncoa'),
    '[^a-z0-9]+', '-', 'g')), 80));
$$;
grant execute on function public.slugify(text) to anon, authenticated;

-- Addresses a page used to have. A retired address is never given to a
-- different business or deal: its old links (and their standing in
-- search) would land somewhere else.
create table public.slug_redirects (
  kind        text not null check (kind in ('business', 'deal')),
  old_slug    text not null,
  merchant_id uuid references public.merchants (id) on delete cascade,
  deal_id     uuid references public.deals (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (kind, old_slug),
  check ((kind = 'business') = (merchant_id is not null) and (kind = 'deal') = (deal_id is not null))
);
alter table public.slug_redirects enable row level security;
revoke all on public.slug_redirects from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Businesses: name and suburb. Follows a rename (the old one redirects).
-- ---------------------------------------------------------------------------

alter table public.merchants add column slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create or replace function public.set_merchant_slug() returns trigger
language plpgsql as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  if tg_op = 'UPDATE' and new.slug is not null
     and new.business_name is not distinct from old.business_name
     and new.suburb is not distinct from old.suburb then
    return new;
  end if;
  base := public.slugify(new.business_name || ' ' || coalesce(new.suburb, ''));
  if base = '' then base := 'business'; end if;
  candidate := base;
  loop
    exit when not exists (select 1 from public.merchants where slug = candidate and id <> new.id)
          and not exists (select 1 from public.slug_redirects where kind = 'business' and old_slug = candidate and merchant_id <> new.id);
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  if tg_op = 'UPDATE' and old.slug is not null and old.slug <> candidate then
    insert into public.slug_redirects (kind, old_slug, merchant_id) values ('business', old.slug, new.id)
      on conflict (kind, old_slug) do update set merchant_id = excluded.merchant_id;
  end if;
  -- Taking back one of its own old addresses: it's current again.
  delete from public.slug_redirects where kind = 'business' and old_slug = candidate;
  new.slug := candidate;
  return new;
end;
$$;

create trigger merchants_slug before insert or update on public.merchants
  for each row execute function public.set_merchant_slug();

update public.merchants set slug = null;

-- ---------------------------------------------------------------------------
-- Deals: name, business and suburb, given when the deal is submitted and
-- kept from then on (a deal's address doesn't move under its links).
-- ---------------------------------------------------------------------------

create or replace function public.set_deal_slug() returns trigger
language plpgsql as $$
declare
  base text;
  candidate text;
  n integer := 1;
  m record;
begin
  if new.slug is not null or new.status = 'Draft' then
    return new;
  end if;
  select business_name, suburb into m from public.merchants where id = new.merchant_id;
  base := public.slugify(coalesce(new.name, '') || ' ' || coalesce(m.business_name, '') || ' ' || coalesce(m.suburb, ''));
  if base = '' then base := 'deal'; end if;
  candidate := base;
  loop
    exit when not exists (select 1 from public.deals where slug = candidate and id <> new.id)
          and not exists (select 1 from public.slug_redirects where kind = 'deal' and old_slug = candidate and deal_id <> new.id);
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create trigger deals_slug before insert or update on public.deals
  for each row execute function public.set_deal_slug();

-- The public view of businesses carries the address.
create or replace view public.public_businesses as
select
  m.id, m.business_name, m.category_slug, m.bio, m.phone, m.website,
  m.booking_url, m.booking_email, m.facebook_url, m.instagram_url,
  m.address, m.suburb, m.city, m.lat, m.lng, m.business_hours,
  m.price_range, m.amenities, m.logo_url, m.photos, m.rating, m.review_count,
  m.slug_id, m.slug
from public.merchants m
where m.status = 'Approved';
