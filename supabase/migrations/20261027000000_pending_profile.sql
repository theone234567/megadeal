-- Profile changes held for review (security pack T161): an approved
-- business's new About text, links, booking email or public phone that the
-- automatic check flagged (or couldn't check) wait here for an admin; the
-- public page keeps showing the previous values until then
-- (lib/profileReview.ts). Private: the public view (public_businesses)
-- lists its columns one by one and these aren't among them.
--
-- Additive. To undo: drop the three columns.
alter table public.merchants
  add column if not exists pending_profile jsonb
  check (pending_profile is null or jsonb_typeof(pending_profile) = 'object');
alter table public.merchants
  add column if not exists pending_profile_review jsonb
  check (pending_profile_review is null or jsonb_typeof(pending_profile_review) = 'object');
alter table public.merchants
  add column if not exists pending_profile_at timestamptz;
