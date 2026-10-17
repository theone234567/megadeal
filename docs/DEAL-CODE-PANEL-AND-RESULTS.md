# Deal page, "Get deal code", Booking & contact, codes and results

What changed in October 2026 (the "complete pack"), how it works, and how to
switch it on or undo it.

## What customers see

- **Deal page** (`app/deal/[slug]/DealDetail.tsx`): one job, get the code
  and then contact the business (MegaDeal takes no payment). Title, then
  the photo beside a price card that stays in view on a computer; *About
  this deal*; one white panel with *What's included* (a list written in the
  description) beside every *Condition*, plus when it ends and "You pay
  the business directly"; *Contact & booking*; *About the business*.
- **Get deal code** (`DealCodeReveal.tsx`): the one purple button. It
  turns into the code in place (no pop-up) and stays for the visit, with
  *Copy code* ("Copied") and how to use it. "Reveal code & booking
  options" does the same and scrolls to Contact & booking. On a phone a
  bar with the price and the button sits at the bottom; once revealed it
  shows the code and "Code saved".
- **Contact & booking** (`ContactBooking.tsx`): "18 Bay Road, Whangaparāoa ·
  Open today 8am–8pm" (the only place hours show, worked out in the
  browser in NZ time), then a cell each for Phone, Email and Website (and
  a booking page if it's a different one). The email isn't in the page's
  HTML: *Show email* reveals it as a link. The address opens *Address &
  hours*: the full address, the week's hours and *Open in maps* (only for
  a public address).
- **Business profile** (`app/business/[slug]/page.tsx`): About and photos
  (they open larger) beside *Contact & visit*, then its deals. *Back to
  deal* appears when it was opened from one of its own live deals.

## One contact resolver

`lib/dealContact.ts` decides the buttons and the wording for the deal page,
the code panel and the deal form's preview, from:

- the business's **Booking & contact** (phone, booking link, website,
  email) and its **Main customer button** (profile form);
- a deal's **own details**, when it has them (`lib/contactOverride.ts`):
  each field either inherits, is this deal's value, or is deliberately
  none, so clearing one never brings the business's back;
- the deal's booking answer (required / recommended / not needed). New
  deals start on *recommended*.

Only methods actually supplied are offered; the same page is never two
buttons; a walk-in deal gets no "Book online"; nothing suggests a code books
or reserves anything.

## Deal codes

New codes MegaDeal makes are a word for the category plus letters, e.g.
`FEASTKT` (`lib/memorableCode.ts`), unique through `public.deal_codes`
(`lib/db/dealCodes.ts`). Existing `MEGA-` codes and businesses' own codes are
unchanged. A business can't choose a code of the new shape for its own.

## Results

Each action is stored once in `public.deal_events` (`lib/dealEventLog.ts`):
deal views, *Get deal code* taps (main button or phone bar), code reveals,
confirmed copies, contact taps by type, profile views and taps to the
profile. With it: an anonymous per-tab visit id, the device type, the
referring site's name and any `utm_` tags. Never names, emails, phone
numbers, codes, full addresses or search text; no IP address.

- Businesses: **Deal results** in the portal (7/30/90 days), from
  `/api/merchants/deal-stats`, which reads the business from the sign-in.
- MegaDeal: **Admin → Deal results** (`/admin/results`).
- Admins, previews, test deals and crawlers aren't counted.
- Kept 400 days; the daily backup job deletes older rows.
- The deal totals businesses already had (views, copies, calls…) keep
  counting as before.

Limits: a "visit" is one browser tab, so one person on two devices counts
twice; ad blockers and offline taps aren't counted; a tap on *Call* isn't a
call that connected. There's no cookie banner on the site and none is
added: the visit id lives only in the tab (sessionStorage), never a cookie.

## Switching it on (database updates)

Three additive updates, applied with **Admin → System → Apply database
updates** (or `npx tsx scripts/migrate.ts --apply`):

1. `20261019000000_booking_contact.sql` — main customer button, a deal's
   own contact details, special instructions.
2. `20261020000000_deal_codes.sql` — the list of codes made.
3. `20261021000000_deal_events.sql` — the activity table.

The site works before they're applied: the new fields read as empty, codes
are made the old way, and results say they start after the update.

## Undoing it

- Code: `git revert` the commits (newest first). Nothing existing is
  rewritten, so data stays valid either way.
- Database (only if wanted): `drop table public.deal_events;`,
  `drop table public.deal_codes;`, and `alter table public.deals drop column
  contact_override, drop column customer_instructions; alter table
  public.merchants drop column preferred_contact;`. Codes already given to
  deals stay on them and keep working.
