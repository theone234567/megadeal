# Launch day

Everything that has to happen to open MegaDeal to the public, in order. Most of the site
switches by itself when `LAUNCHED` turns on; this is the short list of what doesn't.

## The week before

1. **Terms.** Update the offer paragraph in `app/terms/page.tsx` (proposed wording in
   `docs/LAUNCH-OFFER-CHECKLIST.md`). It's the only launch wording that doesn't switch by
   itself, because it's a legal document.
2. **Test deals and the test business.** In **Admin**, cancel or delete the test deals
   (Admin → Test deals) and the test business, so the public homepage opens with real deals
   only. Test deals already stop appearing in listings after launch (`docs/TEST-DEALS.md`).
3. **Line up the first deals.** Before launch a business can only build and save deals as
   drafts; submitting opens at launch (`app/api/deals/create/route.ts`), and each submitted
   deal goes live once an admin approves it. So the homepage starts empty until approved
   businesses submit. Agree a time with them, and keep an admin free to approve that morning.

## Launching

4. In `lib/siteConfig.ts` set:

   ```ts
   const LAUNCHED = true;
   export const LAUNCHED_ON = "2026-11-02"; // today, New Zealand date
   ```

   Then commit and push. Use this code switch, not only the Worker variable: the business
   pages are pre-rendered, and a runtime-only `SITE_LAUNCHED` would leave them on the
   pre-launch wording (`docs/LAUNCH-OFFER-CHECKLIST.md`).
5. Wait for **Workers Builds: megadeal** to show success on that commit (GitHub, or the
   Cloudflare dashboard). If it fails, the site simply stays on "coming soon" until a build
   succeeds; nothing half-launches.

What then changes by itself:

- `/` becomes the deals homepage; `/coming-soon` sends visitors to it.
- `/auckland`, category, Flash, deal and business pages open to everyone and to search
  engines, and the sitemap lists them.
- Every business page, the footer, `llms.txt` and the share images switch from up to 6 months
  (WELCOME6) to up to 3 months (WELCOME3), with no "before launch" wording left. The signup
  form pre-fills WELCOME3, and approvals from then on give 12 credits.
- The sitemap gives the pages that changed wording today's date (`LAUNCHED_ON`), so search
  engines recrawl them.
- Businesses can submit their saved drafts; each goes live once an admin approves it. Nothing
  is published automatically.

## Straight after

6. **Look at it signed out** (a private window): the homepage, a category, a deal page, a
   business page, `/list-your-business` (should say up to 3 months, WELCOME3).
7. **Tell search engines.** Admin → **Submit all pages to Bing** (IndexNow, which also
   reaches Yandex and others).
   In Google Search Console, resubmit `https://megadeal.co.nz/sitemap.xml`.
   Then check Google can actually see the site: Search Console → **URL Inspection** →
   `https://megadeal.co.nz/` → **Test live URL** → View tested page. It should show the
   deals homepage. If it shows "Just a moment..." or a 403, Cloudflare's bot protection is
   stopping Google: look in Cloudflare → the domain → Security → Events for what challenged
   it, and turn that rule or setting off. (Cloudflare challenges requests from data centres,
   seen on 7 Oct 2026; verified search engines like Google are normally let through.)
8. **Share a link to yourself** (Messenger, WhatsApp or similar) for the homepage and
   `/list-your-business`: the preview should show the new logo and, for the business page,
   up to 3 months. Facebook keeps old previews for a while; its Sharing Debugger refreshes one.
9. **Tell the people who asked.** The coming-soon page and footer promised subscribers an
   email at launch, and the portal promised approved businesses one. Admin → Subscribers →
   **Email subscribers** (email name `launch`): pick the group (deal-alert subscribers, businesses on the launch
   waitlist, approved businesses, businesses awaiting approval: the application email
   promised them a launch email too), edit the draft, Preview, Send me a test, then Send. It
   goes only to confirmed subscribers who haven't unsubscribed, each person once (pressing
   Send again sends nothing new), with their own unsubscribe link. An address that can't be
   sent to is passed over so it doesn't hold up the rest, and tried again if you press Send
   an hour or more later. Sending only works once
   the site has launched.

   These go out through Resend from megadeal.co.nz (`EMAIL_PROVIDER=resend`, switched on
   7 Oct 2026). Check Resend's plan covers the list first: its free plan has a daily
   sending limit, so for a launch list bigger than that, move to a paid plan for the
   month. A new sending domain builds its reputation slowly, so send each group once,
   not in quick repeats. Later emails (say, a monthly round-up of new deals) use the
   same tool with a new email name, such as `deals-2026-12`.
10. **Check the offer end to end** (`docs/LAUNCH-OFFER-CHECKLIST.md`, "After launch, check"):
    approve a test signup that used WELCOME3; it should get 12 credits and its email should
    name WELCOME3.

## If you need to go back

Set `LAUNCHED = false` and push. The site returns to "coming soon"; nothing is lost.
