-- Two tables added after the first schema missed the "revoke all" every
-- other table gets (audit of 19 Oct 2026): credit_rescale_log and
-- test_business_marks. Row level security already kept their rows from the
-- public roles, but the table grants themselves stayed, TRUNCATE among
-- them, which row level security doesn't cover. Nothing reads or writes
-- these tables except the server.
revoke all on public.credit_rescale_log from anon, authenticated;
do $$
begin
  if to_regclass('public.test_business_marks') is not null then
    revoke all on public.test_business_marks from anon, authenticated;
  end if;
end $$;
