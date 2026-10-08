# When something goes wrong

Plain steps for the most likely problems, in the order to try them. Most
need only the admin pages, Cloudflare or Supabase in a browser. Nothing here
asks you to share a password or key with anyone.

## "MegaDeal: the database isn't answering" (email)

The site checks its database every hour and emails you when it stops
answering (and again when it's back).

1. Go to **supabase.com**, open the **megadeal** project.
2. If it says the project is **paused**, press **Restore project**. Your data
   is kept; it takes a few minutes. (Free projects pause after a week with no
   use. The site's hourly check normally prevents that.)
3. If it isn't paused, look at **status.supabase.com**: if Supabase itself is
   having problems, wait; the site recovers by itself when it's back.
4. Admin > **Moving off Wix** > box 1 should go back to "Database answers".

## The whole site is down or showing errors

1. Check **cloudflarestatus.com**. If Cloudflare is having problems, wait.
2. If it started straight after an update, roll back to the version before:
   Cloudflare > **Workers & Pages** > **megadeal** > **Deployments** > the
   previous one > **Rollback**. The site is back in under a minute; then tell
   Claude what happened so the update can be fixed.
3. If you see **"Error 1027"** or a daily-limit message, the free Cloudflare
   plan's daily request limit was reached: Workers & Pages > **Plans** >
   Workers Paid ($5 a month) lifts it straight away.

## A business can't sign in

- Ask them to use **Forgot password** on the sign-in page: it emails a link
  that works once.
- If the email doesn't arrive (check their spam folder first): Admin >
  **Businesses** > the business > **Generate new password**. It's shown once;
  give it to them by phone or text, and ask them to change it.

## Emails aren't arriving

1. Go to **resend.com** > **Emails**: each one says delivered, bounced or
   failed, and why.
2. If it says you've reached a sending limit, the free plan's daily limit is
   used up: wait until tomorrow, or move to a paid plan for the month.
3. If a domain problem is shown, check Resend > **Domains**: megadeal.co.nz
   should say **Verified**.

## Data was deleted or changed by mistake

The site saves a full copy of the database every night (about 2:30am),
kept for 30 days, in Cloudflare R2 (`megadeal-backups`, folder `backups/`).

- **One business, deal or setting wrong:** fix it in admin if you can (deal
  version history keeps earlier wording and photos). Otherwise ask Claude: it
  can find the record in last night's copy and put back just that part.
- **The whole database lost** (for example a new Supabase project): Admin >
  **Moving off Wix** > box 1 > **Restore from a backup**. **Rehearse** first:
  it shows what would come back and changes nothing. It only restores into an
  empty database, so it can never overwrite data that's there.

## You think a key or password has leaked

Replace it, then delete the old one. Claude can tell you exactly where each
one goes.

- **Admin password:** Cloudflare > megadeal > Settings > Variables and
  Secrets > `ADMIN_PASSWORD` > edit. Changing `ADMIN_SESSION_SECRET` too signs
  everyone out of admin.
- **Supabase secret key:** Supabase > Project Settings > API Keys: create a new
  secret key, put it in Cloudflare as `SUPABASE_SERVICE_ROLE_KEY`, then delete
  the old key in Supabase.
- **Resend:** resend.com > API Keys: create a new sending key, put it in
  Cloudflare as `RESEND_API_KEY`, delete the old one.

## Going back to Wix (only while Wix is still paid for)

Possible for a couple of weeks after the move: Claude removes the switches in
`wrangler.toml` and the site reads Wix again. Anything changed on MegaDeal
since the move stays only in the new database, so this is a last resort.
See `docs/WIX-MIGRATION.md`.
