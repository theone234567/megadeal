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

## Step 2 so far: the storefront reads (switched off)

- `lib/db/connection.ts`: the database connection, through Cloudflare
  Hyperdrive in production (`DATABASE_URL` locally). It is used only when
  `DATA_BACKEND=postgres`; until then the site reads Wix exactly as before
  and doesn't even load the driver.
- `lib/db/publicReads.ts`: the deal listing, deal page, "this deal has
  ended" page, business page, sitemap lists and admin preview, read from
  Postgres in the same shapes the Wix reads produce. `lib/fetchDealServer.ts`
  picks one or the other.
- `lib/db/publicReads.test.ts`: builds the same business and deals both
  ways (Wix fixtures through today's code, and converted into the new
  database) and checks the storefront gets the same thing, field for
  field.
- Business page addresses keep their Wix id prefix
  (`supabase/migrations/20261007000000_business_slug_id.sql`), so shared
  and indexed links keep working.
- Checked on a real Postgres and the Cloudflare Worker build: the pages
  render from the new database, and the Worker bundles the driver.

Found on the way: the site shows each deal's name and price from its Wix
Stores product, not the Deals row. The converter now keeps the product's
and lists any deal where the two differ.

## Step 2, continued: every route, and the import

- `lib/db/wixShim.ts`: the site's existing route code runs unchanged on
  the new database. It answers the same calls the routes make to Wix
  (look up, save, delete, the few Stores product calls, and the
  "only if" updates used for credits and claims), each as a single SQL
  statement where it has to be all-or-nothing. A field it doesn't know
  is an error, never dropped.
- `lib/dataClient.ts`: what the routes ask for their client. Wix today;
  the new database when `DATA_BACKEND=postgres`. Photo uploads, email and
  logins still go to Wix until their own steps.
- `lib/db/routes.test.ts`: 21 tests run the real routes end to end on the
  new database (signup, drafts, submission and charging, approval by an
  admin or the AI review, AI rejection with refund, pause and restart,
  withdrawal refunds, another business blocked, view counts, profile and
  photos, change requests, admin edits, referrals, credit top-ups,
  deletion, admin lists, settings, contact form, mailing list, the
  expiry job).
- `lib/db/importWix.ts` and `scripts/wix-import.ts`: load an export.
  Rehearsal by default (runs everything, then undoes it); `--commit` for
  real. Writes `import-report.json` listing every record it couldn't
  bring over cleanly and every paused deal to check.

    node scripts/wix-export.mjs
    DATABASE_URL=… npx tsx scripts/wix-import.ts wix-export/<folder>
    DATABASE_URL=… npx tsx scripts/wix-import.ts wix-export/<folder> --commit

Also fixed on the way (security review finding 1): when an admin pauses
a deal it's marked as theirs, and the business can no longer restart it;
the portal says MegaDeal paused it. This works on Wix today too.

Still on Wix after step 2: business logins and password resets (step 3),
photo uploads (step 1), email (step 4), and MegaShop.

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
- A **Hyperdrive** configuration in Cloudflare pointing at the Supabase
  database (free on the Workers paid plan), added to `wrangler.toml` as the
  `HYPERDRIVE` binding.
- A **Turnstile** site key (free) to replace the Wix captcha.
- A decision on the password reset: businesses set a new password once at
  the switch.
