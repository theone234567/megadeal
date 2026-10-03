# Admin test deals

Handoff pack, FINAL-SPEC §8. Everyday and Flash deals only an admin can see, for checking how
deals look and behave before launch.

## Using them

Admin → **Test deals**: New test deal, Edit, Restart timer, View deal page, Copy to real draft,
Delete. Up to 20.

- **Where they show:** before launch, on the private homepage, category and Flash previews
  (marked "Test deal"), added in the browser for a signed-in admin only. Each card opens the
  test deal's own admin page (`/admin/test-deals/<id>`); the public `/deal` pages never show one.
  After launch they're no longer added to listings; their own pages stay available from the tab.
- **Timer:** runs from when the deal was added or last restarted. Restarting touches only that
  test deal. Editing keeps the timer running from the same start.
- **Not real:** no Wix product or Deals row, no credits, no stock, no analytics (pages are in
  preview mode). Contact and booking links are off. They ignore the Everyday/Flash switches in
  Platform settings, so a type switched off for businesses can still be tried.
- **Photos:** chosen from the site's own illustrations; nothing is uploaded.

## Copy to real draft

The one action that writes to Wix, and only when you click **Create draft** for a business you
pick. It creates an ordinary Deals row with status Draft for that business: a new id, a fresh
MEGA code, the name, category, prices, duration, booking answer, description and conditions, and
no photo or dates. The business still adds a photo, checks it and submits it for approval; credits
are taken only on submission, as for any deal. Refused for suspended businesses and businesses
that already have 25 drafts. The test deal is unchanged.

## Storage

Workers KV (`RATE_LIMIT_KV`, key `admin-test-deals:v1`), the same namespace as the platform
settings. Code: `lib/testDeals.ts` (rules, tested), `lib/testDealStore.ts`,
`app/api/admin/test-deals`, `components/admin/TestDealsPanel.tsx`, `lib/useTestDeals.ts`.
