# Public prelaunch homepage

From 17 October 2026 (the homepage pack), "/" is public before launch and
looks like the marketplace, without launching the site.

## What visitors see, in order

1. Purple header. The business button reads "Claim my free advertising"
   ("Advertise free" where it's narrower) and goes to /list-your-business.
2. Black prelaunch bar (`components/PrelaunchBar.tsx`).
3. Hero (`components/PrelaunchHero.tsx`): "Auckland first", the one `<h1>`
   "Big local deals are coming to Auckland.", the offer, "Claim my free
   advertising", "See demo deals", one trust line. Auckland skyline photo
   plus the current mascot, `public/megadeal/mascot/megadeal-mascot-hero.webp`,
   as a separate layer at its own proportions.
4. Demo deals (`lib/demoDeals.ts`): fixed examples with "Example …"
   businesses and the site's own photos, labelled DEMO, with no link, code
   or date. They are never searched, counted or put in structured data.
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
