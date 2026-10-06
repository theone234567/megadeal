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

## Page addresses (decided 7 Oct 2026, before launch)

| Page | Address | Notes |
| --- | --- | --- |
| City | `/auckland` | every live deal by category |
| Category | `/auckland/food-drink` | was `/category/food-drink` (308) |
| Flash deals | `/auckland/flash-deals` | was `/flash-deals` (308) |
| Deal | `/deal/<deal>-<business>-<suburb>` | given at submission, never changes |
| Business | `/business/<name>-<suburb>` | follows a rename; the old one redirects |
| AI deal list | `/deals.txt` | plain text, not indexed by search engines |

The city and category addresses are live as soon as they ship. The deal
and business formats come with the new database (Wix sets them until
then). The database makes every address (`supabase/migrations/
20261009000000_clean_slugs.sql`): te reo macrons become plain letters
(Ōtāhuhu → otahuhu), a clash gets `-2`, and a retired address is kept in
`slug_redirects` and never given to anyone else. Wix-era addresses (the
deal's old slug, the business's `<name>-<id>` form) redirect with a 308.
Redirects and "not found" are decided before the page streams, so they
are real 308s and 404s, and an old address never reveals a pending,
suspended or test page.

## Step 3 so far: business logins (switched off)

`AUTH_BACKEND=supabase` (only with `DATA_BACKEND=postgres`) moves business
sign-up, sign-in, sign-out and password reset to Supabase Auth. The
forms look and behave the same: sign up, enter the 6-digit code from the
email, you're in. Every step runs through this site's server
(`app/api/auth/*`); the browser never talks to Supabase.

Security built in: rate limits per visitor and per address; requests
must come from this site; the Turnstile robot check (refuses if not
configured); the same answer whether or not an address has an account;
sessions in httpOnly cookies checked against the database on every
request, so signing out, a password reset, or deleting an account takes
effect at once. Login emails come from MegaDeal through a signed hook.

Tested end to end against a real Supabase Auth server and Postgres
(`lib/authE2E.test.ts`, run with `E2E_AUTH=1`) and in a browser: sign
up, code, portal, wrong password, sign in, sign out.

Existing businesses: Wix passwords can't be moved. Each business uses
"Forgot password" once; the emailed link sets their new password and
creates their login, and their business is theirs when they sign in.

Supabase settings (Authentication):

- Email sign-ups on, "Confirm email" on, OTP length 6, OTP expiry 600s.
- Minimum password length 10; turn on leaked-password protection.
- Hooks > Send Email: `https://megadeal.co.nz/api/auth/email-hook`; its
  secret becomes `SEND_EMAIL_HOOK_SECRET`.
- Rate limits: our server sends every request, so raise the per-address
  limits for sign-in and code checks (ours apply first, per visitor).

Cloudflare secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (or leave it out to
use the project's signing keys), `SEND_EMAIL_HOOK_SECRET`,
`TURNSTILE_SECRET_KEY`; and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a build
variable.

## Step 4 so far: email (switched off)

`EMAIL_PROVIDER=resend` sends through Resend instead of Wix
(`lib/sendEmail.ts`): every email gets a plain-text part, mailing-list
email gets the one-click unsubscribe header Gmail and Yahoo require, and
addresses and subjects can't carry extra headers. Until it's switched
on, email goes through Wix exactly as before.

Before switching on (a new sending domain has no reputation, which is
why the site moved to Wix's sending once already):

1. Add megadeal.co.nz in Resend and put its SPF and DKIM records in the
   domain's DNS (Cloudflare). Add a DMARC record, starting with
   `v=DMARC1; p=none; rua=mailto:<your address>`; move to
   `p=quarantine` once the reports look clean.
2. Set `RESEND_API_KEY` as a Cloudflare secret, `EMAIL_FROM` (e.g.
   `MegaDeal <hello@megadeal.co.nz>`) and `EMAIL_PROVIDER=resend`.
3. Warm up: switch on while volumes are low (before launch), watch the
   Resend dashboard for bounces and spam reports for a week.

Unsubscribing is safe from link scanners: the link in an email opens a
page with an Unsubscribe button (workplace mail security opens every
link in a message, and used to unsubscribe people), and a mail app's own
Unsubscribe button works in one click. Every unsubscribe link a person
was sent keeps working, as the Unsolicited Electronic Messages Act
expects.

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
