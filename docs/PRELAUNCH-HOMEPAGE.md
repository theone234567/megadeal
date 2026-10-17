# Public prelaunch homepage

From 17 October 2026 (the homepage pack), "/" is public before launch and
looks like the marketplace, without launching the site.

## What visitors see, in order

1. Purple header. The business button reads "Claim my free advertising"
   ("Advertise free" where it's narrower) and goes to /list-your-business.
2. Dark prelaunch bar (`components/PrelaunchBar.tsx`), above the header on
   every public page: information only (the header has the "Advertise
   free" button), with a T&Cs link.
3. Hero (`components/PrelaunchHero.tsx`): "Auckland first", the one `<h1>`
   "Big local deals are coming to Auckland.", the offer, "Claim my free
   advertising", "See example deals", one trust line. Auckland skyline photo
   plus the current mascot, `public/megadeal/mascot/megadeal-mascot-hero.webp`,
   as a separate layer at its own proportions.
4. Example deals (`lib/demoDeals.ts`): fixed examples with "Example …"
   businesses and the site's own photos, labelled EXAMPLE. Each opens an
   example deal page (`/example/[slug]`): the real deal page under an
   "Example only" banner, code "EXAMPLE", contact details on example.com
   only, no phone. Never searched, counted, indexed or put in structured
   data.
5. Categories, deal type, Filters (price and distance) and Sort: these
   control the real deals only, so they sit right above them. No map before
   launch (its pins open the deal pages, which are still private).
6. Launch deals: real approved deals, labelled "Available at launch", in a
   row (`components/DealRail.tsx`). Any category, filter, search or "View
   all deals" shows the usual grid. The cards don't link: deal and business
   pages stay admin-only until launch.
7. Business strip with the full offer, then the footer.

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
