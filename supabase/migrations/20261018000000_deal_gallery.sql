-- More photos for a deal (14 Oct 2026): besides its one main photo
-- (photo_url, on cards, share previews and search results), up to four
-- more, shown as a gallery on the deal page. Picked by the business from
-- its profile photos or uploaded, checked by MegaDeal with the deal.
-- Uploaded photos are never deleted from storage, so a deal can share a
-- profile photo's address safely.

alter table public.deals
  add column gallery text[] not null default '{}'
    check (cardinality(gallery) <= 4);

-- A changed gallery is a change to what the deal says: it moves
-- content_updated_at and, on an approved deal, approved_at (an admin edit
-- or an approved change request), as the main photo does.
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
    or new.tags is distinct from old.tags
    or new.gallery is distinct from old.gallery;
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
