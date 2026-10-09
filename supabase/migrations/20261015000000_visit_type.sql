-- How customers reach a business (10 Oct 2026), chosen on its listing
-- page from all the options; the public pages say what it chose:
--   premises     they come to its address (shown, with directions)
--   appointment  by appointment at its place: the address is provided by
--                the business when they book
--   mobile       it goes to its customers (and lists the areas covered)
--   online       an online business
-- Anything but premises keeps the street address private (hide_address,
-- 20261014, which the site keeps in step with this).
alter table public.merchants add column visit_type text not null default 'premises'
  check (visit_type in ('premises', 'appointment', 'mobile', 'online'));
update public.merchants set visit_type = 'appointment' where hide_address;

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
  m.hide_address, m.service_area,
  m.visit_type
from public.merchants m
where m.status = 'Approved';
