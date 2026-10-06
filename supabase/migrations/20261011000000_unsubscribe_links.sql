-- Every unsubscribe link a person was sent keeps working.
--
-- Tokens are stored hashed, so they can't be read back and reused. When a
-- person signs up again they're sent a new link, and the earlier ones
-- (still in their inbox) must keep working: the law (Unsolicited
-- Electronic Messages Act 2007) and the mail providers both expect an
-- unsubscribe link to work. The earlier hashes are kept here.
alter table public.email_signups
  add column old_unsubscribe_token_hashes text[] not null default '{}'
  check (cardinality(old_unsubscribe_token_hashes) <= 50);
