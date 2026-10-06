-- Only the server calls MegaDeal's database functions.
--
-- The first migration took every function away from the public roles,
-- but functions added since got Supabase's default grant, which lets
-- anyone with the public key call them. None could do harm (they only
-- read tables the public can't see), but that was luck, not design.
-- Taken back here, and new functions no longer get it at all.
--
-- Trigger functions still run on every write: the privilege to call a
-- function is only checked when calling it directly.

revoke all on function public.free_merchant_slug(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.set_merchant_slug() from public, anon, authenticated;
revoke all on function public.set_deal_slug() from public, anon, authenticated;

-- Supabase grants new functions in public to these roles...
alter default privileges in schema public revoke execute on functions from anon, authenticated;
-- ...and Postgres lets everyone call any new function, a default only the
-- database-wide form can take back. (Server roles keep their own grants.)
alter default privileges revoke execute on functions from public;
