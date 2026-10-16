-- Booking & contact, entered once (16 Oct 2026).
--
-- merchants.preferred_contact: the business's main customer button, one of
-- the contact methods it supplies (booking link, phone, website, email).
-- Null: MegaDeal's order (booking link, then phone, website, email).
--
-- deals.contact_override: a deal's own contact details, when they differ
-- from the business's. Null: the business's details. Otherwise an object
-- whose keys (phone, bookingUrl, website, email, preferred) each mean:
-- missing = the business's value; null = deliberately none for this deal;
-- text = this deal's value. Overriding never changes the business profile
-- or its other deals.
--
-- deals.customer_instructions: the business's own short note on how to
-- use the deal ("Mention your code when you arrive"), shown with the code.
--
-- Additive only; nothing existing is changed. To undo: drop the three
-- columns (no other data depends on them).

alter table public.merchants
  add column preferred_contact text
    check (preferred_contact in ('booking', 'phone', 'website', 'email'));

alter table public.deals
  add column contact_override jsonb
    check (contact_override is null or (jsonb_typeof(contact_override) = 'object' and length(contact_override::text) <= 2000)),
  add column customer_instructions text
    check (customer_instructions is null or char_length(customer_instructions) <= 300);

-- Both are part of what the deal says: changing them moves
-- content_updated_at and, on an approved deal, approved_at.
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
    or new.gallery is distinct from old.gallery
    or new.customer_instructions is distinct from old.customer_instructions
    or new.contact_override is distinct from old.contact_override;
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
