# MegaDeal

Local deals in Auckland: businesses list time-limited offers, customers
find them and contact or book the business directly. Live at
[megadeal.co.nz](https://megadeal.co.nz) (coming soon until launch).

## How it runs

- **Next.js 16** (App Router) on **Cloudflare Workers**, through OpenNext
  (`@opennextjs/cloudflare`). `worker.mjs` is the Worker's entry: the site,
  the edge cache for share images (`lib/assetCache.ts`), and Cloudflare's
  Cron Triggers for the scheduled jobs (`lib/scheduledJobs.ts`).
- **Publishing:** every push to `claude/deal-website-storefront-9iqkg3` is
  built and published by Cloudflare Workers Builds (the "Workers Builds:
  megadeal" check). The GitHub workflow only checks (types, tests, build).
- **Data:** Supabase Postgres (Sydney), reached through Cloudflare
  Hyperdrive (`lib/db/`). Schema in `supabase/migrations`; updates are
  applied from Admin > Moving off Wix > "Apply database updates".
- **Photos:** Cloudflare R2 (`PHOTOS`), resized by Cloudflare Images.
- **Email:** Resend, from megadeal.co.nz (`lib/sendEmail.ts`).
- **Business sign-in:** moving from Wix to Supabase Auth
  (`AUTH_BACKEND`, `lib/authSession.ts`); see the migration guide.
- **Backups:** nightly to R2 (`BACKUPS`), restorable from admin.

Bindings and switches are in `wrangler.toml`; secrets live in Cloudflare
(Workers & Pages > megadeal > Settings > Variables and Secrets), never in
the repository.

## Working on it

```sh
npm ci
npx tsc --noEmit      # types
npm test              # unit and database tests (PGlite, no setup needed)
npm run cf:build      # the Cloudflare bundle, as Workers Builds makes it
```

Read `AGENTS.md` first: this Next.js version differs from older ones, and
its guide is in `node_modules/next/dist/docs/`.

## Guides (`docs/`)

| Guide | For |
| --- | --- |
| `WIX-MIGRATION.md` | Moving off Wix: what's switched, how, and how to go back |
| `LAUNCH-DAY.md` | Opening the site to the public |
| `LAUNCH-OFFER-CHECKLIST.md` | The launch offer's wording and credits |
| `TEST-DEALS.md` | Private test deals for checking the site before launch |
| `SCHEDULING.md` | Deals that start at a set time instead of on approval |
| `ADMIN-TWO-FACTOR.md` | Admin sign-in with a second step |
| `COMING-SOON-V2.md`, `LIST-BUSINESS-V2.md` | The coming-soon and list-your-business designs, their switches and rollback |
| `THINGS-TO-DO-IMAGES.md` | Where the Things To Do advertising page's photos came from |
