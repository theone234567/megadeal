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

Launch with the code switch (`LAUNCHED = true` in `lib/siteConfig.ts`, then push): these
pages are pre-rendered, so a runtime-only `SITE_LAUNCHED` would leave the form on WELCOME6.

## Must be updated before or at launch (owner to approve wording)

Every line below still says 6 months / WELCOME6 / "before launch". Proposed replacements are
drafts only.

### 1. Terms — `app/terms/page.tsx` (the offer paragraph) — needs owner/legal approval

Now: "MegaDeal may offer up to 6 months of free advertising credits to businesses that join
before our official launch in Auckland — this offer is only available before launch, not
after."

Proposed: "MegaDeal may offer free advertising credits to new businesses: up to 6 months for
businesses approved before our official launch in Auckland, and up to 3 months (code
WELCOME3) for businesses approved after it. Businesses approved before launch keep their
pre-launch offer." (rest of the paragraph unchanged)

### 2. /list-your-business — `app/list-your-business/page.tsx`

- Title/description (lines ~26–29): "Up to 6 Months Free Advertising…" → "Up to 3 Months Free
  Advertising for Auckland Businesses"; "claim up to 6 months free advertising on MegaDeal
  before launch" → "get up to 3 months free advertising on MegaDeal".
- Hero badge / bullets / "Up to 6 months FREE" card, FAQ "Is MegaDeal really free?" and the
  "only time the up-to-6-months offer" answer, the JSON-LD Offer, "Coming soon to Auckland —
  up to 6 months free before launch", "Pre-launch offer — up to 6 months free", "The
  up-to-6-months-free offer is only available to qualifying businesses that join before deals
  go live… use code WELCOME6" → 3 months / WELCOME3, and drop "before launch" framing.
- Share image `app/list-your-business/opengraph-image.tsx`: "Up to 6 months free advertising".

### 3. /advertise/restaurants and /advertise/beauty-spa

Titles ("| 6 Months Free"), descriptions, hero buttons ("Get 6 months free →"), FAQs ("How do I
get up to six months free?", "Use WELCOME6 at signup"), the "6 Months Free" card, JSON-LD
Offer, launch panel ("Up to 6 months free advertising", "Join MegaDeal — 6 months free →",
"Use WELCOME6 at signup."), phone bar ("Up to 6 months free"), share images.

### 4. /advertise/home-car

Reads months and code from `PRELAUNCH_PROMO`; at launch change it to `LAUNCH_PROMO` and reword
"applying before launch" in the launch panel, "Why MegaDeal" card and FAQs.

### 5. Site-wide

- Footer `components/Footer.tsx`: "get up to 6 months free advertising — use code WELCOME6".
- `app/llms.txt/route.ts` BUSINESS_PITCH: "…before launch can receive up to 6 months…".
- `/coming-soon` and `components/comingSoon/*` redirect to `/` after launch, so they can stay.

## After launch, check

- Approve a test business that entered WELCOME3: 12 credits, email names WELCOME3.
- `/list-your-business` signup form shows WELCOME3.
- Search the site for "6 months" and "WELCOME6": only historical/terms mentions remain.
