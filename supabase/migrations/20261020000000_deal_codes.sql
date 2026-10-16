-- Memorable deal codes (16 Oct 2026): codes MegaDeal makes are now a short
-- word plus letters (FEASTKT, GLOWBR) instead of MEGA-7K2QD
-- (lib/memorableCode.ts). Each one made is recorded here, and the key
-- keeps them unique even when two deals are made at the same moment.
-- Existing codes, MEGA- or a business's own, aren't touched: they stay on
-- their deals and keep working.
--
-- Additive only. To undo: drop the table; codes already given to deals
-- stay on them.

create table public.deal_codes (
  code       text primary key check (code ~ '^[A-Z]{3,6}[A-Z]{2,4}$'),
  created_at timestamptz not null default now()
);

-- Server only: nothing for the outside roles.
alter table public.deal_codes enable row level security;
revoke all on public.deal_codes from anon, authenticated;
