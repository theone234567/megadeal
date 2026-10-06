-- A business address belongs to a business that has been public.
--
-- Until now the first application with a name took the plain address
-- (harbour-bistro-ponsonby), even one never approved: a spam signup, or a
-- business that gave up, could hold it for good and push the real
-- business to -2. Now an address held by a business that has never been
-- approved (never public, so no links to it anywhere) is only provisional:
-- a business with the same name and suburb that is approved takes it, and
-- the other moves to -2. A business that has been public keeps its
-- address even if later suspended; its links are out there.

-- Approvals from before they were dated count as approvals.
update public.merchants set first_approved_at = coalesce(first_approved_at, updated_at, created_at)
 where status in ('Approved', 'Suspended') and first_approved_at is null;

-- The first free address from `base` for business `self`: not another
-- business's, and not one retired from another business. `first` 2 skips
-- the plain address (for a business being moved off it).
create or replace function public.free_merchant_slug(base text, self uuid, first integer default 1) returns text
language plpgsql as $$
declare
  n integer := first;
  candidate text := case when first > 1 then base || '-' || first else base end;
begin
  loop
    exit when not exists (select 1 from public.merchants where slug = candidate and id <> self)
          and not exists (select 1 from public.slug_redirects where kind = 'business' and old_slug = candidate and merchant_id <> self);
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_merchant_slug() returns trigger
language plpgsql as $$
declare
  base text;
  candidate text;
  squatter uuid;
  renamed boolean;
  going_public boolean;
begin
  renamed := tg_op = 'INSERT' or new.slug is null
          or new.business_name is distinct from old.business_name
          or new.suburb is distinct from old.suburb;
  going_public := new.status = 'Approved' and (tg_op = 'INSERT' or old.status is distinct from 'Approved');
  -- Every approval is dated, however it's made (the admin page does too).
  if new.status = 'Approved' and new.first_approved_at is null then
    new.first_approved_at := now();
  end if;
  if not renamed and not going_public then
    return new;
  end if;

  base := public.slugify(new.business_name || ' ' || coalesce(new.suburb, ''));
  if base = '' then base := 'business'; end if;

  -- Approved: the plain address is this business's if all that holds it
  -- is an application never approved. Only "Pending" with no approval
  -- date counts: a suspended business may have been public (some were
  -- approved in Wix before approvals were dated), so it keeps its address.
  if new.status = 'Approved' then
    select id into squatter from public.merchants
     where slug = base and id <> new.id and status = 'Pending' and first_approved_at is null;
    if squatter is not null then
      update public.merchants set slug = public.free_merchant_slug(base, squatter, 2) where id = squatter;
    end if;
  end if;

  if not renamed then
    -- Approved without a rename: move only to take the plain address.
    if new.slug = base or exists (select 1 from public.merchants where slug = base and id <> new.id) then
      return new;
    end if;
    candidate := public.free_merchant_slug(base, new.id);
    if candidate <> base then return new; end if;
  else
    candidate := public.free_merchant_slug(base, new.id);
  end if;

  -- The old address keeps working only if it was ever public.
  if tg_op = 'UPDATE' and old.slug is not null and old.slug <> candidate
     and (old.status = 'Approved' or old.first_approved_at is not null) then
    insert into public.slug_redirects (kind, old_slug, merchant_id) values ('business', old.slug, new.id)
      on conflict (kind, old_slug) do update set merchant_id = excluded.merchant_id;
  end if;
  -- Taking back one of its own old addresses: it's current again.
  delete from public.slug_redirects where kind = 'business' and old_slug = candidate;
  new.slug := candidate;
  return new;
end;
$$;
