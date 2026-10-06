# Launch-day offer checklist: 6 months (WELCOME6) → 3 months (WELCOME3)

Owner decision (28 Sep 2026): at launch the business offer drops to **up to 3 months free
advertising, code WELCOME3 (12 credits)**. Businesses approved before launch keep their 6
months. After launch, WELCOME6 typed before launch still counts, as the 3-month offer.

## Already switches automatically at launch (no copy change needed)

Driven by `lib/promo.ts` and `SITE_LAUNCHED`:

- **Approval credits** (`app/api/admin/merchants/[id]/route.ts`): before launch WELCOME6 →
  24 credits; from launch WELCOME3 or WELCOME6 → 12 credits. Decided at the moment the
  admin approves, so a business that applied before launch but is approved after gets 12.
- **Signup form** (`MerchantSignupForm`): pre-fills WELCOME3 and says "up to 3 months free
  advertising" (no "if you're approved before launch").
- The approval email and credit history name the code that was redeemed.
- **Every business page and site-wide mention** (Oct 2026): `/list-your-business` (the v2
  design that is live), `/advertise/restaurants`, `/advertise/beauty-spa`,
  `/advertise/home-car`, `/advertise/things-to-do`, `/how-it-works`, `/about`, the footer
  banner, `llms.txt` and the share images that state the offer. Before launch they render
  exactly as before; from launch they say up to 3 months with WELCOME3 and drop the
  "before launch" framing. The owner approved the post-launch wording on 6 Oct 2026.

Launch with the code switch (`LAUNCHED = true` in `lib/siteConfig.ts`, then push): these
pages are pre-rendered, so a runtime-only `SITE_LAUNCHED` would leave them on the pre-launch
wording.

## Must be updated before or at launch (owner to approve wording)

### Terms — `app/terms/page.tsx` (the offer paragraph) — needs owner/legal approval

Now: "MegaDeal may offer up to 6 months of free advertising credits to businesses that join
before our official launch in Auckland — this offer is only available before launch, not
after."

Proposed: "MegaDeal may offer free advertising credits to new businesses: up to 6 months for
businesses approved before our official launch in Auckland, and up to 3 months (code
WELCOME3) for businesses approved after it. Businesses approved before launch keep their
pre-launch offer." (rest of the paragraph unchanged)

## Not switched, because visitors don't see them after launch

- `/coming-soon` and `components/comingSoon/*` redirect to `/` after launch.
- The older `/list-your-business` design (`LIST_BUSINESS_DESIGN=legacy`) and its founder's
  note (`components/FounderNote.tsx`) still say 6 months / WELCOME6. From launch the page
  shows the redesign whatever that setting says, so they can't appear.

## After launch, check

- Approve a test business that entered WELCOME3: 12 credits, email names WELCOME3.
- `/list-your-business` signup form shows WELCOME3.
- Search the site for "6 months" and "WELCOME6": only historical/terms mentions remain.
- Share a business page link (e.g. in a message to yourself): the preview says up to 3 months.
