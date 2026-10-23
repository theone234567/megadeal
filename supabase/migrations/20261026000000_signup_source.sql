-- Where a business came from when it signed up (lib/signupSource.ts): the
-- campaign tags, which ad network's click it was, the page it landed on and
-- the other site's name. Private: the public view (public_businesses) lists
-- its columns one by one and this isn't one of them.
alter table public.merchants
  add column if not exists signup_source jsonb
  check (signup_source is null or jsonb_typeof(signup_source) = 'object');
