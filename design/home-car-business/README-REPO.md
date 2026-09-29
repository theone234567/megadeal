# Home & Car business pack — as used in this repository

The page is `app/advertise/home-car/` (page.tsx, businessTypes.ts, opengraph-image.tsx).
These are the pack's written specifications (29 Sep 2026), kept for reference.

- Images: the pack's PNGs (0.9–2.9 MB each) are not stored here. Web-sized WebP copies
  (640 and 1200 px for photos; 900/1400 for the backdrop; 480/820 for the mascot) are in
  `public/images/home-car-business/`. The mascot is the site's current hoodie elephant.
- `OFFER-IDEAS.json` was turned into `app/advertise/home-car/businessTypes.ts` word for word.
- Differences from the pack, and why:
  - Deploys go to Cloudflare Workers (push to the branch), not Vercel.
  - The bookings/payments FAQ answers from the site's actual model: customers book and pay
    the business directly; MegaDeal takes no bookings or payments.
  - "How it works" follows the real order: approval, then creating an offer in the business
    portal, then each offer is reviewed before it's published.
  - Offer months and code come from `lib/promo.ts` (PRELAUNCH_PROMO), so they can't drift
    from the signup form.
  - No FAQ or Product/Offer structured data; a WebPage entry only.
- Rollback: revert the commit that added `app/advertise/home-car/`; it also touches
  `components/Header.tsx`, `components/icons.tsx`, `app/sitemap.ts`, `app/llms.txt/route.ts`,
  `app/api/admin/seo/indexnow-submit-all/route.ts` and `app/list-your-business/page.tsx`.
