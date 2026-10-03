# Admin test deals

Handoff pack, FINAL-SPEC §8. Everyday and Flash deals only an admin can see, for checking how
deals look and behave before launch.

## Using them

Admin → **Test deals**: New test deal, Edit, Restart timer, View deal page, Copy to real draft,
Delete. Up to 20.

- **Same form as a business:** New and Edit open the business "Create a deal" form
  (`NewDealForm`) in test mode, with every field, hint, check and the preview step. The server
  checks a test deal with the same rules as a real submission (`lib/dealSubmission.ts`, shared
  with `/api/deals/create`). Test mode differs only where a business account would be involved:
  the business name and suburb are typed in (a business's come from its profile), the photo is
  one of the site's sample photos, there's no autosave, credits or launch notice, and the
  Platform settings type switches and shorter maximum runs don't apply.

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
- **Older test deals:** ones saved before the form was shared are read back with the new fields
  (no quantity, no website code).

## Copy to real draft

The one action that writes to Wix, and only when you click **Create draft** for a business you
pick. It creates an ordinary Deals row with status Draft for that business: a new id, a fresh
MEGA code, the name, category, prices, duration, quantity, booking answer, description and
conditions, and no photo, own code or dates. The business still adds a photo, checks it and submits it for approval; credits
are taken only on submission, as for any deal. Refused for suspended businesses and businesses
that already have 25 drafts. The test deal is unchanged.

## Storage

Workers KV (`RATE_LIMIT_KV`, key `admin-test-deals:v1`), the same namespace as the platform
settings. Code: `lib/testDeals.ts` (rules, tested), `lib/dealSubmission.ts` (shared checks, tested),
`lib/testDealStore.ts`, `app/api/admin/test-deals`, `app/admin/test-deals` (new, edit, view),
`app/portal/new-deal/NewDealForm.tsx` (test mode), `components/admin/TestDealsPanel.tsx`,
`lib/useTestDeals.ts`.
