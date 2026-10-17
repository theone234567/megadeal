-- Test businesses (17 Oct 2026): a business an admin marks as a test
-- (Admin -> Businesses -> the business -> "Test business") is never
-- public. Its profile and its deals stay out of every listing, page,
-- feed, sitemap and the two public views, whatever their status; admins
-- still see them in admin. The site's own example deals (lib/demoDeals.ts)
-- are what shows what a deal looks like.
--
-- Additive. To undo: drop the column (the views below then need
-- recreating without the "not m.is_test" lines).

alter table public.merchants add column is_test boolean not null default false;

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
where m.status = 'Approved'
  and not m.is_test;

create or replace view public.public_deals as
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
  and not m.is_test
  and (d.first_published_at is null or d.first_published_at <= now())
  and (d.expires_at is null or d.expires_at > now());
