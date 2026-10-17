-- Marks every business that existed on 17 Oct 2026 as a test business
-- (the owner's request: all of them were tests). A test business is never
-- public (20261023000000_test_businesses.sql). Only businesses created
-- before the cutoff below are touched, so a real business that signs up
-- later is never marked, whenever this update is applied.
--
-- The log table records which businesses were marked, and marks that this
-- ran (lib/db/migrationMarkers.ts). To undo for one business, untick
-- "Test business" on its admin page.

create table public.test_business_marks (
  merchant_id  uuid primary key references public.merchants (id) on delete cascade,
  marked_at    timestamptz not null default now()
);
alter table public.test_business_marks enable row level security;

insert into public.test_business_marks (merchant_id)
select id from public.merchants
 where created_at < timestamptz '2026-10-17 03:45:00+00'
   and not is_test;

update public.merchants m
   set is_test = true
  from public.test_business_marks t
 where t.merchant_id = m.id;
