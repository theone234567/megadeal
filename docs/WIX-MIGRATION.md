# Moving MegaDeal off Wix

MegaDeal uses Wix as its backend: logins, the database, deal products,
photo storage and email. This is the plan to move each of those to
services the site controls directly, one at a time, with the live site
working throughout.

## Where things go

| Today (Wix) | After the move | Why |
| --- | --- | --- |
| Wix Members (business logins, email codes, captcha) | Supabase Auth + Cloudflare Turnstile | Standard, well-audited logins; we own the user table |
| Wix Data collections (Merchants, Deals, MerchantActivity, EmailSignups, ContactMessages, ApiUsageCounters) | Supabase Postgres, Sydney region | Real constraints, transactions and row-level security |
| Wix Stores products (each live deal's name, price, photo, address, ribbon, category) | Columns on the `deals` table | One record per deal instead of two kept in sync |
| Wix media uploads (static.wixstatic.com) | Cloudflare Images (or R2) | Same network as the site; existing photos are copied over |
| Wix email (verification codes, notices) | Resend or Postmark, with SPF, DKIM and DMARC on megadeal.co.nz | Deliverability and our own templates |
| SiteSettings collection | Already mostly in Cloudflare KV; the rest moves to Postgres | |
| Admin audit log, platform settings | Stay in Cloudflare KV | Already off Wix |

## Step 0 (done): the new database, tested, and a copy of the data

Nothing on the live site changes in this step.

- `supabase/migrations/20261006000000_initial_schema.sql`: the new database.
  The rules the site relies on are enforced by the database itself, not
  only by the code:
  - A business's credits can't go below zero. `debit_credits` takes
    credits only when there are enough, in one step, so two requests at
    once can't overspend.
  - A submitted deal must have a name, address (slug), category and price,
    and its original price can't be below the deal price.
  - Only `http(s)` links are stored for websites, booking links and photos.
  - A deal paused by an admin records `paused_by = 'admin'`, so a business
    can't resume it. This closes the gap found in the security review.
  - The public (anyone not logged in) can only read two views:
    `public_deals` (live, approved and in date) and `public_businesses`.
    The views hold no private columns: no emails, credits, NZBN or contact details.
  - A logged-in business can read only its own record, deals and activity,
    and can't change anything directly. Every change goes through the
    site's server, which checks it first.
- `lib/db/schema.test.ts`: 25 tests run those rules against a real
  Postgres (PGlite, in-process). They cover what the public can and can't
  see, one business trying to read another's data, overspending credits and
  bad links.
- `lib/db/wixToPostgres.ts`: converts exported Wix records into rows for
  the new database. It joins each Deals row to its Stores product, tidies
  links, emails and NZBNs, and hashes email tokens. Anything it can't
  convert cleanly is listed with the original value for a person to
  check; nothing is dropped silently. Tested in
  `lib/db/wixToPostgres.test.ts`, which also loads the converted rows into
  the test database.
- `scripts/wix-export.mjs`: a read-only copy of everything in Wix
  (`node scripts/wix-export.mjs`). It saves every collection and Stores
  product as JSON in `wix-export/`, which is git-ignored because it holds
  personal details. Delete it after the move.

### Field notes

- Businesses are linked to deals and activity by email today. In the new
  database they're linked by id (`merchant_id`). The import builds the
  email → id map from the merchants it has just inserted.
- `owner_id` (the login) is empty after the import. It's filled when
  logins move (step 3), by matching each Supabase user to their business
  email.
- Wix doesn't record who paused a deal, so imported paused deals count as
  paused by the business. Any deal an admin paused needs pausing again by
  an admin after the import; the import (step 2) will list every paused deal
  to check.
- Email verify and unsubscribe tokens are stored hashed. Existing
  unsubscribe links will keep working: from step 2 the site hashes the
  token in the link and compares it with the stored hash.

## The steps

Each step ships on its own and can be rolled back. About 4–5 weeks in
total, finishing before launch.

1. **Photos (about 3 days).** New uploads go to Cloudflare. Existing
   wixstatic photos are copied, and the stored links are rewritten at import.
2. **Data layer (about 1.5 weeks).** The server reads and writes Postgres
   instead of Wix Data and Stores, behind the same functions the pages
   use today. Run both side by side on a copy first, comparing results,
   then switch.
3. **Logins (about 1 week).** Supabase Auth for business accounts, with
   the same pages and flows. Wix passwords can't be exported, so each
   business sets a new password once, through a "set your password" email
   sent at the switch. Before launch, there are few accounts to move.
4. **Email (about 2 days).** Verification codes and notices go through
   Resend or Postmark from megadeal.co.nz.
5. **Cutover (about 2 days).** Final export and import, compare the
   counts with `summary.json`, switch, and watch closely for a week. Wix
   stays read-only for a month as a fallback, then the subscription ends.

## What the owner needs to set up

- A **Supabase** project in the **Sydney** region. The free tier is enough
  until launch; Pro is US$25/month after that. Put its URL and service
  role key in Cloudflare secrets (and `.dev.vars` for local work); never
  commit them.
- A **Cloudflare Images** subscription (from US$5/month) or an R2 bucket.
- A **Resend** or **Postmark** account, with the DNS records they give
  added to megadeal.co.nz.
- A **Turnstile** site key (free) to replace the Wix captcha.
- A decision on the password reset: businesses set a new password once at
  the switch.
