-- What the site's server code needs to run on this database while logins
-- are still Wix's (step 2 of docs/WIX-MIGRATION.md comes before step 3).

-- The Wix member who owns each business. Until logins move, this is how
-- a signed-in business is matched to its record (Wix's "_owner"). Step 3
-- fills owner_id from it and then it can go.
alter table public.merchants add column wix_owner_id text unique;

-- The per-business rudeness check override is a plain word, not JSON.
alter table public.merchants drop column rudeness_check;
alter table public.merchants add column rudeness_check text
  check (rudeness_check in ('default', 'on', 'off'));

-- Site-wide settings that lived in the Wix "SiteSettings" collection
-- (the rest are in Cloudflare KV). Server only.
create table public.site_settings (
  key        text primary key check (length(key) between 1 and 100),
  value      text check (length(value) <= 10000),
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;

-- Submitting a deal marks the draft "Pending Approval" first (so a double
-- tap can't submit it twice) and gives it its page address a moment later.
-- So completeness is required of what customers can see: a live or
-- paused deal (and anything an admin approves from pending).
alter table public.deals drop constraint deals_submitted_complete;
alter table public.deals add constraint deals_public_complete check (
  status in ('Draft', 'Pending Approval', 'Cancelled')
  or (slug is not null and name <> '' and price_now is not null and category_slug is not null)
);

-- Two fields the site writes that the first schema missed: which business
-- referred this one (shown to admins), and when a replacement deal photo
-- was sent for approval.
alter table public.merchants add column referred_by text check (length(referred_by) <= 300);
alter table public.deals add column pending_photo_at timestamptz;
