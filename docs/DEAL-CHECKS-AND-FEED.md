# Deal checks, tags and the deals feed

What MegaDeal tells customers, search engines and AI tools about where a deal came from and how
fresh it is, and where each fact comes from. Added 13 Oct 2026
(`supabase/migrations/20261017000000_deal_provenance.sql`). It needs **Admin → System checks →
Apply database updates** once (it also adds `20261018000000_deal_gallery.sql`); until then the site works as before, but tags and "Still running
as listed" aren't saved.

## What each deal records

The database keeps these itself (triggers), whichever part of the site changes a deal:

| Field | Meaning | Set when |
| --- | --- | --- |
| `content_updated_at` | When anything a customer sees last changed | Name, description, photo, prices, conditions, booking, tags, dates, status or quantity change. Not views or clicks. |
| `approved_at` | When MegaDeal last approved what the deal says | An admin approves a submission, approves a change request or photo, or edits the deal. Not when the business pauses, restarts, confirms or marks it sold out. |
| `merchant_confirmed_at` | When the business last said it's still running as listed | The business presses **Still running as listed** on a live deal in its portal. |
| `source` | Who put the deal on MegaDeal | Always `merchant` today; `admin` and `community` are there for later. |
| `gallery` | Up to 4 more photos besides the main one (`lib/dealGallery.ts`, 14 Oct 2026) | The business picks them from its profile photos or uploads them; MegaDeal checks them with the deal; changes on a submitted deal go through "Request a change". |
| `tags` | Up to 5 facts from a fixed list (`lib/dealTags.ts`) | The business picks them; MegaDeal checks them on approval and can edit them. |

Businesses record `claimed_at`: when the owner first linked a login.

## What the public sees

- **Deal page:** a small box under the conditions: "Business verified" (the business runs its own
  account) or "Listed by MegaDeal", then "Checked by MegaDeal 13 Oct" (or "Confirmed by the
  business") and "Updated 13 Oct". The tags show under the description. The price panel shows
  the end date, and the days left in the final week.
- **Business page:** a "Business verified" badge for a claimed business.
- **Structured data** (`lib/dealJsonLd.ts`): WebPage, Product, Offer and LocalBusiness, with the
  same dates. No star ratings: the ratings MegaDeal holds are typed in by an admin, and Google
  only allows reviews collected on the site.
- **The feed** (`/feed/deals.json`, `lib/dealFeed.ts`): every live deal as JSON, with filters,
  documented at `/developers` and described for tools at `/feed/openapi.json`. It never contains
  deal codes, email addresses, or the street and map pin of a business that hides them.

## Changing things

- **A new tag:** add it to `DEAL_TAGS` in `lib/dealTags.ts`. Renaming or removing one changes what
  existing deals say, so move those deals' tags too.
- **A new field in the feed:** add it in `lib/dealFeed.ts` and describe it in `lib/feedOpenApi.ts`
  (a test fails if you forget). Adding is fine any time; renaming or removing a field is a breaking
  change: bump `FEED_VERSION`'s major number and say so on `/developers` first.
