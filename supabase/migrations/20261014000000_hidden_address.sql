-- Home-based and mobile businesses (10 Oct 2026). A business whose
-- customers don't visit its address (it works from home, or goes to them)
-- keeps that address private: it's still given, so MegaDeal can check the
-- business, but the public sees only the suburb and city, the area it
-- covers, and a pin rounded to about a kilometre (for "near me" and the
-- map), never the street or the exact spot.
alter table public.merchants add column hide_address boolean not null default false;
alter table public.merchants add column service_area text check (length(service_area) <= 200);

-- The public view follows the same rule. Columns can only be added at the
-- end of a replaced view, and keep their types.
create or replace view public.public_businesses as
select
  m.id, m.business_name, m.category_slug, m.bio, m.phone, m.website,
  m.booking_url, m.booking_email, m.facebook_url, m.instagram_url,
  case when m.hide_address then null else m.address end as address,
  m.suburb, m.city,
  case when m.hide_address then round(m.lat::numeric, 2)::double precision else m.lat end as lat,
  case when m.hide_address then round(m.lng::numeric, 2)::double precision else m.lng end as lng,
  m.business_hours,
  m.price_range, m.amenities, m.logo_url, m.photos, m.rating, m.review_count,
  m.slug_id, m.slug,
  m.hide_address, m.service_area
from public.merchants m
where m.status = 'Approved';
