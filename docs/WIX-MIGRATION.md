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
| Wix media uploads (static.wixstatic.com) | Cloudflare R2, served from megadeal.co.nz/media/ | Same network as the site; existing photos are copied over |
| Wix email (verification codes, notices) | Resend, with SPF, DKIM and DMARC on megadeal.co.nz | Deliverability and our own templates |
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

## Where each step stands

Everything is built and tested, and every switch is off. The live site
runs on Wix exactly as before until a switch is turned on.

| Step | Switch | Needs |
| --- | --- | --- |
| Email | `EMAIL_PROVIDER=resend` | Resend, DNS records |
| Database | `DATA_BACKEND=postgres` | Supabase, Hyperdrive, the import |
| Photos | `PHOTO_STORAGE=r2` | the database switch, an R2 bucket |
| Business logins | `AUTH_BACKEND=supabase` | the database switch, Supabase Auth settings, Turnstile |

MegaShop stays on Wix Stores for now.

**Admin > Moving off Wix** (`/admin/move-off-wix`) checks all of this
live and says in plain words what's done and what's missing. Use it at
every stage below; it changes nothing.

## Switch-over checklist

Do the stages in this order. Each one is a small change you can make on
a quiet morning, with time to watch it afterwards.

### Rehearse first (recommended)

Before switching the live site, run the whole switch-over once on a
private copy: the same code with every switch on, its own database and
buckets, and no visitors. Everything in this checklist then happens
twice, and the second time (for real) holds no surprises.

1. A second Supabase project (e.g. `megadeal-staging`), a second
   Hyperdrive, and buckets `megadeal-photos-staging` and
   `megadeal-backups-staging`.
2. Add to `wrangler.toml` (once those exist):

       [env.staging]
       name = "megadeal-staging"
       vars = { DATA_BACKEND = "postgres", PHOTO_STORAGE = "r2", AUTH_BACKEND = "supabase", EMAIL_PROVIDER = "resend" }
       kv_namespaces = [{ binding = "RATE_LIMIT_KV", id = "<a new KV namespace>" }]
       r2_buckets = [{ binding = "PHOTOS", bucket_name = "megadeal-photos-staging" }, { binding = "BACKUPS", bucket_name = "megadeal-backups-staging" }]
       hyperdrive = [{ binding = "HYPERDRIVE", id = "<the staging Hyperdrive id>" }]
       images = { binding = "IMAGES" }

   and set its secrets with `npx wrangler secret put <NAME> --env staging`.
3. Deploy it by hand, built with its own address: the site's address is
   built in, and it decides the canonical-host redirect, which sign-in
   requests count as "from this site", and the robot check's hostname. A
   copy built with megadeal.co.nz would send every visit there and
   refuse its own sign-ins.

       NEXT_PUBLIC_SITE_URL=https://megadeal-staging.<your-subdomain>.workers.dev \
       NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key> \
       npx opennextjs-cloudflare build && npx wrangler deploy --env staging

   Add that hostname to the Turnstile widget's allowed hostnames. Put the
   address behind Cloudflare Access (Zero Trust > Access >
   Applications) so only you can open it. Build again without those
   variables before anything else is deployed from the same folder.
4. Import a fresh Wix export into it, then walk through what a business
   does: sign up, finish the listing with a photo, create and submit a
   deal; approve it in admin; open the public pages; reset a password.
   Moving off Wix should be all ticks.

Its pages say `noindex` before launch, but keep it behind Access anyway:
it holds a copy of real businesses' details.

### Where settings go

- **Switches** (`EMAIL_PROVIDER`, `DATA_BACKEND`, `PHOTO_STORAGE`,
  `AUTH_BACKEND`) go in `wrangler.toml` under `[vars]`, in a commit.
  Each switch is then on record, and turning it off is a revert. Don't set
  them as plain variables in the Cloudflare dashboard: every deploy
  replaces those with what `wrangler.toml` says, so they would quietly
  vanish.
- **Keys and passwords** go under Workers > megadeal > Settings >
  Variables and Secrets, as type **Secret**. Secrets survive deploys and
  can't be read back. Never put one in `wrangler.toml` or a commit.
- **`NEXT_PUBLIC_*` values** (the Turnstile site key) are build
  variables: Settings > Build > Variables. They're built into the page,
  so they're public by design.
- **Bindings** (`HYPERDRIVE`, `PHOTOS`) go in `wrangler.toml`. Add each
  one only once the resource exists in Cloudflare: a deploy with a
  binding to something that doesn't exist fails.

### Stage 1: email (a week before the database)

Email can move on its own, and a new sending domain needs a week of low
volume to build a reputation, so it goes first.

1. Create a Resend account. Add the domain `megadeal.co.nz`.
2. In Cloudflare DNS, add the records Resend shows: DKIM
   (`resend._domainkey`) and the `send` subdomain's SPF and MX. Add DMARC
   if there isn't one: `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:<your
   address>`.
3. Wait until Resend shows the domain as Verified.
4. Create a **sending access** API key (not full access) and save it as
   the secret `RESEND_API_KEY`. Optional: `EMAIL_FROM`, e.g.
   `MegaDeal <hello@megadeal.co.nz>`; it must be on the verified domain.
5. Moving off Wix: the Email section should be all ticks.
6. Add `EMAIL_PROVIDER = "resend"` to `[vars]`, commit, deploy.
7. Check: send yourself a business sign-up code and a contact-form
   message; both should arrive in the inbox, not spam. In Gmail, "Show
   original" should say SPF, DKIM and DMARC: PASS.
8. Watch Resend's dashboard for a week for bounces and complaints.
   After two clean weeks of DMARC reports, change DMARC to
   `p=quarantine`.

Turning it off: remove the line and deploy. Email goes back to Wix at
once; nothing is lost.

### Stage 2: the database and photos

This is the big one. Once it's on, every change (sign-ups, deals,
credits, approvals) is saved in the new database, and Wix stops seeing
them.

Set up (any time before):

1. Supabase: a new project in the **Sydney** region, with a long
   generated database password stored in a password manager.
2. Create the tables and rules (everything in `supabase/migrations`):

       DATABASE_URL=… npx tsx scripts/migrate.ts            # shows what it will do
       DATABASE_URL=… npx tsx scripts/migrate.ts --apply

   Use the connection string from Supabase > Connect (direct, or the
   session pooler on port 5432). Each file applies whole or not at all,
   and running it again only applies what's new, so it's also how later
   updates get in. (It records them where the Supabase CLI does, so
   `supabase db push` works too.)
3. Supabase > Settings > API > Data API: turn it off, or remove
   `public` from the exposed schemas. The site never uses it (it
   connects to the database directly), and with it off, the public key
   can't be used to query tables at all. Row-level security stays on
   regardless, as a second lock.
4. Cloudflare > Hyperdrive: create a configuration with the database's
   connection string (Supabase > Connect: the direct connection, or the
   session pooler on port 5432; not the transaction pooler on 6543,
   since Hyperdrive does its own pooling).
   Add to `wrangler.toml`:

       [[hyperdrive]]
       binding = "HYPERDRIVE"
       id = "<the Hyperdrive id>"

5. Cloudflare > R2: create a bucket (e.g. `megadeal-photos`). Leave
   public access **off**: the site serves the photos itself, from
   megadeal.co.nz/media/. Add to `wrangler.toml`:

       [[r2_buckets]]
       binding = "PHOTOS"
       bucket_name = "megadeal-photos"

6. Cloudflare > R2: a second private bucket for the nightly backups
   (e.g. `megadeal-backups`). Under its Settings, add a lifecycle rule:
   delete objects after 30 days. Add to `wrangler.toml`:

       [[r2_buckets]]
       binding = "BACKUPS"
       bucket_name = "megadeal-backups"

   The nightly job uses the same `CRON_SECRET` as the hourly one (in
   GitHub and in Cloudflare). See "Backups" below.
7. Rehearse the import on the new database (it changes nothing):

       node scripts/wix-export.mjs
       DATABASE_URL=… npx tsx scripts/wix-import.ts wix-export/<folder>

   Read `import-report.json`. Every record it lists needs a decision.

On the day:

1. Pick a quiet time. Don't approve anything during the switch, and ask
   any business you're working with not to edit for an hour: a change
   made in Wix after the export doesn't come across.
2. Export again and import for real, then take a copy of the result
   to keep:

       node scripts/wix-export.mjs
       DATABASE_URL=… npx tsx scripts/wix-import.ts wix-export/<folder> --commit
       DATABASE_URL=… npx tsx scripts/take-backup.ts

3. Moving off Wix: Database all ticks; the business, deal and
   subscriber counts match `summary.json` in the export.
4. Add `DATA_BACKEND = "postgres"` and `PHOTO_STORAGE = "r2"` to
   `[vars]`, commit, deploy.
5. Moving off Wix > Photos: press **Copy photos from Wix** and let it
   finish. Anything it can't copy is listed; those stay on Wix's address
   and keep working.
6. Re-pause any deal an admin had paused: the import lists them (Wix
   doesn't record who paused a deal).
7. Check, signed in as admin and in a private window:
   - the admin lists show every business and deal;
   - a business page and a deal page open at their new addresses;
   - an old address (`/business/<name>-<id>`, a Wix deal address)
     redirects to the new one;
   - a business can sign in (still with Wix), see its deals and save
     its profile;
   - a photo upload works, and the photo's address starts
     `megadeal.co.nz/media/`.
8. Admin > "Submit all pages to Bing", and resubmit the sitemap in
   Google Search Console, so search engines pick up the new addresses
   quickly.

Turning it off: remove the two lines and deploy. The site reads Wix
again, but **anything changed since the switch stays only in the new
database**: it would need copying back by hand. Decide within the first
hour or two; after that, fix forward.

### Stage 3: business logins (the same day or soon after)

1. Supabase > Authentication:
   - Providers > Email: on, "Confirm email" on, OTP length 6, OTP
     expiry 600 seconds.
   - Passwords: minimum length 10; leaked-password protection on (Pro
     plan).
   - Hooks > Send Email: HTTPS, `https://megadeal.co.nz/api/auth/email-hook`.
     Generate its secret and save it as the secret
     `SEND_EMAIL_HOOK_SECRET` (it starts `v1,whsec_`).
   - Rate limits: our server makes every request, so raise the
     per-address limits for sign-ins and code checks. Ours apply first,
     per visitor.
2. Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET` (Settings >
   API; leave it out if the project uses the newer signing keys).
3. Cloudflare > Turnstile: add a widget for `megadeal.co.nz`, managed
   mode. The site key goes in build variables as
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, the secret as the secret
   `TURNSTILE_SECRET_KEY`. Make sure `TURNSTILE_DISABLED` is **not** set
   anywhere live.
4. Moving off Wix: Business logins all ticks.
5. Add `AUTH_BACKEND = "supabase"` to `[vars]`, commit, deploy.
6. Check: sign up as a new test business (code arrives, portal opens),
   sign out, sign in, wrong password is refused, "Forgot password"
   email arrives and its link works once only.
7. Moving off Wix > Business logins: press **Email them a set-password
   link**. Each business that hasn't set a password yet gets one email
   with a link to choose one (it works once, for 7 days; after that,
   "Forgot password" does the same). Their business, deals and credits
   are waiting when they sign in. Pressing it again never emails anyone
   twice in a week.

Turning it off: remove the line and deploy. Businesses sign in with
Wix again; accounts created meanwhile would need to sign up on Wix.

### Monitoring

Once the data is in the new database, an outage there takes pages down,
and nobody would know until a business said so. Set up a free uptime
monitor (UptimeRobot or Better Stack) when stage 2 goes live:

- Address: `https://megadeal.co.nz/api/health`, every 5 minutes.
- Alert when it doesn't answer 200 (it says 503 when the database is
  down). Send alerts to your email and phone.

It answers "ok" or "down" and nothing more. Also worth turning on:
Supabase > Organization > Usage alerts, so you hear before the plan's
limits are reached.

### Backups

Every night at about 2:30am a GitHub job (`.github/workflows/backup.yml`)
asks the site to save a copy of every table in the new database to the
private `BACKUPS` bucket (`app/api/cron/backup`, `lib/db/backup.ts`):
businesses, deals, credits activity, the mailing list, messages,
settings and old page addresses. Copies are gzipped JSON and kept for
30 days by the bucket's lifecycle rule. If one fails, the GitHub job
fails and GitHub emails you; Moving off Wix also shows how old the
latest copy is. Logins aren't in it (Supabase keeps those, and any
business can set a new password from an emailed link).

A copy holds personal details: it never leaves the private bucket except
to restore.

To restore, into a new Supabase project (or any Postgres) with the
tables created (`scripts/migrate.ts --apply`) and no data:

1. Download the copy you want from the `BACKUPS` bucket in Cloudflare
   R2.
2. Rehearse, then restore for real:

       DATABASE_URL=… npx tsx scripts/restore-backup.ts backups-<time>.json.gz
       DATABASE_URL=… npx tsx scripts/restore-backup.ts backups-<time>.json.gz --commit

   Everything goes back exactly as saved, page addresses and dates
   included, in one step: all of it or none. It refuses a database that
   already has data.
3. Point Hyperdrive at the restored database, then delete the downloaded
   file.

`scripts/take-backup.ts` takes the same copy by hand, to a file, any
time (e.g. before the final import).

### Privacy policy: update with each switch

The privacy policy (`app/privacy/page.tsx`, "Service providers and
overseas disclosure") names Wix as the provider of logins, data and
email. That stays true until the switches; once they're on it isn't, and
the Privacy Act expects the policy to say who processes personal
information. A suggested replacement for that paragraph's provider list,
for you to check (and have checked) before using:

> This includes Supabase (our database and business logins, hosted in
> Sydney, Australia), Cloudflare (hosting, security checks and photo
> storage), Resend (transactional email), Google's Places API for
> business-address autocomplete, Google Analytics for site traffic
> reporting, and Meta (Facebook/Instagram) for ad measurement. While
> MegaShop runs on Wix, Wix.com processes MegaShop orders.

Change it in the same deploy as the last switch, and update the "Last
updated" date at the top of the page.

### Stage 4: after the move

- Keep Wix for a month, read-only, as a fallback; then end the
  subscription (except Wix Stores, while MegaShop is there).
- Delete the `wix-export/` folders: they hold personal details.
- Remove `WIX_API_KEY` and the other Wix secrets once nothing uses them.
- Once logins have moved: remove the Wix sign-in code from the browser
  (`lib/wixBrowserClient.ts`, `lib/wixAuth.ts`, `lib/recaptcha.ts` and
  their use in `context/WixProvider.tsx` and the sign-up and sign-in
  forms). It's about 100KB of JavaScript that the sign-up page (a page
  that should be fast for search) still downloads but no longer uses.
- Once every photo is copied: remove the `static.wixstatic.com`
  preconnect in `app/layout.tsx`, and the Wix entries in the security
  policy in `next.config.mjs` (keep them while MegaShop is on Wix).
- Supabase: turn on point-in-time recovery (Pro plan) before launch.
