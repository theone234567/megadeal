-- Provenance and freshness for every deal (13 Oct 2026), so the deal
-- pages, their structured data and the public feed (/feed/deals.json) can
-- say plainly who listed a deal, when MegaDeal last checked it and when
-- anything a customer sees last changed. Kept by the database itself
-- (triggers below), so every path that changes a deal keeps them right.
--
-- deals
--   content_updated_at     when anything a customer sees last changed. Not
--                          updated_at, which also moves on every view and
--                          click count.
--   source                 who put the deal on MegaDeal: the business
--                          ('merchant'), MegaDeal itself ('admin'), or,
--                          for the future, a moderated community submission
--                          ('community'). Every deal so far is 'merchant'.
--   approved_at            when MegaDeal last approved what the deal says:
--                          approval of a submission, of a change request or
--                          new photo, or an admin's own edit.
--   merchant_confirmed_at  when the business last confirmed in its portal
--                          that the deal is still running as listed.
--   tags                   from the site's fixed list (lib/dealTags.ts),
--                          never free text, so they stay consistent.
-- merchants
--   claimed_at             when the business's owner first linked a login
--                          (owner_id). Approximate (the business's created
--                          date) for logins linked before this update.

alter table public.deals
  add column content_updated_at timestamptz,
  add column source text not null default 'merchant' check (source in ('merchant', 'admin', 'community')),
  add column approved_at timestamptz,
  add column merchant_confirmed_at timestamptz,
  add column tags text[] not null default '{}'
    check (cardinality(tags) <= 8 and array_to_string(tags, ',') ~ '^([a-z0-9-]{2,32}(,|$))*$');

alter table public.merchants add column claimed_at timestamptz;

-- What deals already have: the latest of creation, approval, publishing
-- and any edit recorded in the deal's history.
update public.deals d set
  content_updated_at = greatest(
    d.created_at, d.first_approved_at, d.first_published_at,
    (select max((e->>'at')::timestamptz) from jsonb_array_elements(d.content_history) e where e ? 'at')
  ),
  approved_at = d.first_approved_at;
alter table public.deals alter column content_updated_at set default now();
alter table public.deals alter column content_updated_at set not null;

update public.merchants set claimed_at = created_at where owner_id is not null;

-- Keeps content_updated_at and approved_at right whoever changes a deal.
-- A business can't edit a submitted deal's content (it asks for a change,
-- which an admin approves), so a content change on a deal past review is
-- an approval or an admin's edit.
create or replace function public.deal_provenance() returns trigger
language plpgsql set search_path = '' as $$
declare
  -- What the deal says: changed only by MegaDeal (an admin edit, an
  -- approved change request or photo), so a change re-approves it.
  content_changed boolean;
  -- When it runs. Compared to the millisecond: the app reads and writes
  -- whole rows through JavaScript dates, which drop microseconds, and an
  -- unchanged end date must not read as a change.
  dates_changed boolean;
begin
  if tg_op = 'INSERT' then
    new.content_updated_at := coalesce(new.content_updated_at, now());
    return new;
  end if;
  content_changed :=
       new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.category_slug is distinct from old.category_slug
    or new.photo_url is distinct from old.photo_url
    or new.price_now is distinct from old.price_now
    or new.price_was is distinct from old.price_was
    or new.terms is distinct from old.terms
    or new.is_flash is distinct from old.is_flash
    or new.booking_requirement is distinct from old.booking_requirement
    or new.code_on_website is distinct from old.code_on_website
    or new.code_website_url is distinct from old.code_website_url
    or new.tags is distinct from old.tags;
  dates_changed :=
       date_trunc('milliseconds', new.first_published_at) is distinct from date_trunc('milliseconds', old.first_published_at)
    or date_trunc('milliseconds', new.expires_at) is distinct from date_trunc('milliseconds', old.expires_at);
  if content_changed or dates_changed
     or new.status is distinct from old.status
     or new.quantity_available is distinct from old.quantity_available then
    new.content_updated_at := now();
  end if;
  -- Approved: when MegaDeal approves a submitted deal, or changes what an
  -- approved one says. Not when the business pauses, restarts or
  -- confirms it, or marks it sold out.
  if new.status not in ('Draft', 'Pending Approval')
     and (old.status = 'Pending Approval' or content_changed) then
    new.approved_at := now();
  end if;
  return new;
end $$;

create trigger deals_provenance before insert or update on public.deals
  for each row execute function public.deal_provenance();

create or replace function public.merchant_claimed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.owner_id is not null and (tg_op = 'INSERT' or old.owner_id is null) and new.claimed_at is null then
    new.claimed_at := now();
  end if;
  return new;
end $$;

create trigger merchants_claimed before insert or update on public.merchants
  for each row execute function public.merchant_claimed();

revoke all on function public.deal_provenance() from public, anon, authenticated;
revoke all on function public.merchant_claimed() from public, anon, authenticated;
