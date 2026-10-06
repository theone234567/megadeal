-- Business page addresses keep working after the move.
--
-- A business's page is /business/<name>-<id prefix>, where the prefix is
-- the first part of its record id (lib/slug.ts businessSlug). Those
-- addresses are already shared and indexed with the Wix id in them, so a
-- business brought over from Wix keeps its Wix id prefix; a new one gets
-- its own id's. Unique, so a prefix always finds exactly one business.

alter table public.merchants
  add column slug_id text not null
  generated always as (split_part(coalesce(wix_id, id::text), '-', 1)) stored;

create unique index merchants_slug_id_key on public.merchants (slug_id);

-- Columns can only be added at the end of a replaced view.
create or replace view public.public_businesses as
select
  m.id, m.business_name, m.category_slug, m.bio, m.phone, m.website,
  m.booking_url, m.booking_email, m.facebook_url, m.instagram_url,
  m.address, m.suburb, m.city, m.lat, m.lng, m.business_hours,
  m.price_range, m.amenities, m.logo_url, m.photos, m.rating, m.review_count,
  m.slug_id
from public.merchants m
where m.status = 'Approved';
