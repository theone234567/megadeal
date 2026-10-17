-- Credits move to a new scale (17 Oct 2026, the owner's decision): an
-- Everyday Deal (up to 30 days) now costs 30 credits and a Flash Deal 3,
-- instead of 4 and 1; the prelaunch offer is 180 credits (up to 6 months)
-- instead of 24, and the launch offer 90 instead of 12.
--
-- So every business keeps what it was promised, each balance is
-- multiplied by 7.5 (24 becomes 180, 4 becomes 30), once. What each deal
-- was charged moves to the new prices too, so a refund gives back what
-- that deal costs now: Everyday x7.5 (4 -> 30), Flash x3 (1 -> 3). Each
-- business sees a line in its activity feed.
--
-- The log table records every balance before and after, and doubles as
-- the marker that this ran (lib/db/migrationMarkers.ts): it never runs
-- twice. To undo: set each merchants.credits_balance back to old_balance
-- (less anything spent since), then drop the table.

create table public.credit_rescale_log (
  merchant_id  uuid primary key references public.merchants (id) on delete cascade,
  old_balance  integer not null,
  new_balance  integer not null,
  rescaled_at  timestamptz not null default now()
);
alter table public.credit_rescale_log enable row level security;

insert into public.credit_rescale_log (merchant_id, old_balance, new_balance)
select id, credits_balance, round(credits_balance * 7.5)::integer
  from public.merchants
 where credits_balance > 0;

update public.merchants m
   set credits_balance = l.new_balance
  from public.credit_rescale_log l
 where l.merchant_id = m.id;

update public.deals
   set credits_charged = case when is_flash then credits_charged * 3 else round(credits_charged * 7.5)::integer end
 where credits_charged > 0;

insert into public.merchant_activity (merchant_id, type, amount, description)
select merchant_id, 'credit', new_balance - old_balance,
       'Credits moved to the new scale: your ' || old_balance || ' became ' || new_balance
       || '. An Everyday Deal is now 30 credits and a Flash Deal 3, so your free months are the same.'
  from public.credit_rescale_log;
