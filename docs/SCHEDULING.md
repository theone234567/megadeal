# Scheduled start times

Handoff pack, FINAL-SPEC §7. A business can ask for a deal to start at a set time (e.g. Friday
11:30 am for a lunch Flash deal) instead of as soon as it's approved.

## Switching it on

Admin → Platform settings → Deal types → **Scheduled start times**. Off by default. Off: the
create form doesn't offer it and the server refuses new scheduled submissions; deals already
scheduled keep their agreed times.

## How it works

- **Form** (`NewDealForm`): "When should it start?" → "As soon as it's approved" or "At a set
  time", with a New Zealand date and time. At least 2 hours ahead, at most 60 days. The line
  under it shows exactly when the deal would show and end. Saved with drafts.
- **Submission** (`/api/deals/create`): checked again (`parseScheduledStart`) before anything is
  charged; stored as `scheduledStartAt` (UTC) on the Deals row.
- **Approval** (admin, or the AI review's auto-publish): `firstPublicationFields` sets
  `firstPublishedAt` to the agreed start and `expiresAt` to start + run, so the agreed start and
  end are kept whenever approval comes first. Approved up to 15 minutes after the start: still
  kept. Any later: approval is refused ("needs a new start time") instead of the deal being moved.
- **Showing it**: `isDealLive` hides a deal until `firstPublishedAt`, on every public read
  (listings, deal page, business page, sitemap; the "ended" page doesn't apply either). No job
  switches deals on or off, so a late or failed job can't show one early or keep one up late.
  Listings are cached for up to a minute, so a deal appears within about a minute of its start.
- **Search engines**: not told when a scheduled deal is approved (its pages aren't public yet); the
  hourly job (`/api/cron/expired-deals`) tells them once it has started.
- **Business portal**: approved-but-not-started deals show as **Scheduled** ("Starts …", own
  filter, Pause/Cancel as for a live deal). Waiting for approval: "Starts … if approved", or
  "Start time passed — needs a new time".
- **Admin deals list**: "Starts …" under the end date, or "Start time passed — set a new one to
  approve" in red, with **Change start** (new NZ date and time, or "Start on approval instead"). A
  new start and approval can be done in the same save. Once a deal is showing, its start can't
  change.

Credits are unchanged: taken on submission, as for any deal. Cancelling an approved (scheduled)
deal isn't refunded, as for any approved deal; withdrawing one still waiting for approval is.

Code: `lib/dealSchedule.ts`, `lib/nzTime.ts` (NZ time and daylight saving), `lib/dealDuration.ts`
(`firstPublicationFields`), `lib/dealVisibility.ts`, `lib/dealStatus.ts`. Tests:
`lib/dealSchedule.test.ts`, `lib/nzTime.test.ts`, `lib/adminSchedule.test.ts`.
