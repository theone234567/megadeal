# Public prelaunch homepage

From 17 October 2026 (the homepage pack), "/" is public before launch and
looks like the marketplace, without launching the site.

## What visitors see, in order

1. Dark prelaunch bar (`components/PrelaunchBar.tsx`), above the header on
   every public page except the portal and admin: information only (the
   header has the "Advertise free" button), with a "Conditions apply" link.
   One line on a computer, two on a phone, never cut off. Scrolls away.
2. Purple header. The business button reads "Claim my free advertising"
   ("Advertise free" where it's narrower) and goes to /list-your-business.
3. Hero (`components/PrelaunchHero.tsx`), kept short so the example deals
   show on the first screen: the one `<h1>` "Big local deals are coming to
   Auckland.", the offer, "0% commission. No lock-in. No credit card." as
   one bold two-tone line, "Claim my free advertising". Beside
   it, three example deals as small deal cards (`public/megadeal/hero/
   collage-*`), each in front of the one to its left so every saving, name
   and price shows, and the current mascot,
   `public/megadeal/mascot/megadeal-mascot-hero.webp`, at its own
   proportions, bottom right, his open hand towards them.
4. Example deals: the fixed examples in `lib/demoDeals.ts`, the first six
   one from each category. A test business's live deals come first only for
   a signed-in admin (`lib/adminViewer.ts`), so the owner can preview a real
   deal; the public never sees them, and their example pages answer "not
   found" to anyone else. "Example …" businesses, the site's own photos,
   labelled EXAMPLE. Each opens an example deal page (`/example/[slug]`):
   the real deal page under an "Example only" banner, code "EXAMPLE",
   contact details on example.com only, no phone. Never searched, counted,
   indexed or put in structured data.
5. (The shoppers' email sign-up, "Get Auckland's launch deals by email",
   is in the footer on every page, with the social links, `#deal-alerts`.)
6. Categories (`components/CategoryNav.tsx`), all always on screen: one row
   on a computer, equal tiles on a tablet and phone. While deals are live
   they link to the real category pages (`/auckland/<category>`). Then deal
   type, "Near me", Filters, Sort and the map, right above the live deals.
   "Near me" puts the nearest deals first with each one's distance (the
   same as Sort's "Nearest to me"); on a phone a "Deals near me" button
   also floats at the bottom of the screen once you've scrolled past the
   top, and steps aside over the footer. Location is asked for only when
   one of them is pressed.
7. Live deals: real approved deals in a row (`components/DealRail.tsx`).
8. "How MegaDeal works" for shoppers (3 steps) and 5 questions, also given
   to search engines as FAQPage data.
9. Purple business card with the offer, one button, and a sample listing
   (the mascot pointing at it), then the footer.

Sizes are one scale throughout: every section heading is 24px on a phone
and 28px from 1024px wide (the business card's 26/32px, as the one
feature block), section descriptions 14/15px, and 40px between sections on
a phone, 48px on a computer.

## Search engines

- "/" is the canonical, indexable front door, titled "MegaDeal — Big local
  deals are coming to Auckland". Filter and search views stay noindex.
- /coming-soon redirects to "/" (308) and has left the sitemap; "/" took
  its place.
- No deal list or offer in the structured data before launch.

## Turning it off

In `lib/siteConfig.ts`, set `PRELAUNCH_HOME_LIVE` to `"off"` and push (or
set `PRELAUNCH_HOME=off` in the build environment). "/" then redirects to
/coming-soon again, as before. At launch (`SITE_LAUNCHED`) it switches
off by itself and the normal homepage takes over.

## Live deals before launch (`DEALS_OPEN`)

`PRELAUNCH_DEALS_LIVE` in `lib/siteConfig.ts`. When on (before launch):

- Approved businesses can submit deals. Each can run **1 Everyday Deal and
  1 Flash Deal at a time, free** (no credits used; `lib/prelaunchAllowance.ts`).
  A deal counts while waiting, live or paused.
- Approved deals are live: deal, business and /auckland pages are public and
  indexable, in the sitemap, IndexNow and the feeds. The homepage row is
  "Live deals" and its cards open the deal pages; the map is back.
- The business offer still follows launch (WELCOME6 before, WELCOME3 after).

Turn it on only after every test business is marked as a test (below).

## Test businesses

Admin → Businesses → a business → **Test business**. A test business and all
its deals are never public, whatever their status: not on any page, listing,
search, feed, sitemap or the public database views. Admins still see them.
Needs the database update `20261023000000_test_businesses.sql`.

## Credits (17 Oct 2026)

- An Everyday Deal (up to 30 days) costs **30 credits**, a Flash Deal **3**
  (Platform settings; a store saved on the old 4/1 scale is moved across).
- Every business gets the current offer on its **first approval**, code or
  not: **180 credits** before launch (up to 6 months), **90** after (up to 3
  months). The referral bonus is 30 credits each side.
- Existing balances and what each deal was charged move to the new scale
  once, with the database update `20261022000000_credit_rescale.sql`
  (balances ×7.5, so 24 → 180; a line in each business's activity).
- The wording says offers may change at any time (Terms, business page,
  homepage strip, llms.txt).
