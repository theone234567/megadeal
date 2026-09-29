# Repository integration

## Scope

Add a sibling business marketing page at `/advertise/home-car`. Build in the existing project, not a new Next.js scaffold. This pack does not contain inspected repository code and does not claim to be a production-ready drop-in application.

1. Read applicable AGENTS.md and installed version documentation. Find the Beauty & Spa source with `rg`, not guessed filenames. Inspect layout groups/middleware, launch redirects, current offer configuration, signup links, header/footer, FAQ and fonts.
2. Inspect git status and isolate the change in a branch. Preserve all unrelated work.
3. Prefer the existing marketing template with Home & Car content. Use scoped classes/CSS Modules. Refactor shared code only where small and regression-testable; avoid a design-system overhaul.
4. Identify whether a parent already renders header, footer and main. Avoid duplicate landmarks, fonts or headers.
5. Add the six category sections with stable IDs from OFFER-IDEAS.json. Server-render text, copy and lists. Plain anchors work without JS. Use scroll-margin-top so the sticky header does not cover targets.
6. Copy original assets into a namespaced folder. Reuse existing image abstraction and font loader. Keep the original approved mascot as its own layer, not embedded into the generated screenshot.
7. Route hero/header CTA to #launch-offer. Final signup is the existing flow, observed as /list-your-business#signup. Re-verify current source before implementation. Do not invent category query parameters, promo-code auto-fill or new backend fields.
8. If supported, carry a fixed `home_car` landing source using the current attribution mechanism. Treat it as untrusted metadata, never an approval/category permission. Preserve the signup hash and existing campaign attribution. Otherwise track the CTA on the landing page and leave the URL intact.
9. Use current shared launch-offer values in one place. Update all headings/FAQ/qualifications consistently if terms differ. Eligibility is not broadened merely by including a category on this page.
10. Implement SEO and preview controls. Preserve homepage coming-soon gating. Allow this page through routing only in the same deliberate way as the sibling advertising pages.

## Suggested component responsibilities, adapted to actual repository

`HomeCarLandingPage` composes existing header/footer and sections. `HomeCarHeroArt` handles decorative layers. `BusinessTypeSection` renders one JSON category. `LaunchOffer` uses the shared current offer. Existing `FAQ` renders answers. Keep FAQs/analytics the only client islands where appropriate; don't mark the whole page use-client unnecessarily.

The supplied starter contains only the two-layer artwork component and CSS. It is not the whole page. Copy the current Beauty & Spa structure and wire the supplied content into it. Ensure the original mascot keeps its full silhouette when resizing. Do not attempt to crop individual assets out of the mockup.

## Offer ideas

OFFER-IDEAS.json is editorial content, not a live deal table or migration. Keep it in source or the existing editorial CMS, not merchant production records. Use the four idea titles and descriptions for each section. Present scope notes as short practical guidance below the list or next to relevant items. They should not look like mandatory conditions for all merchants.

PAGE-COPY.md includes complete text and implementation notes. Remove bracketed instructions from rendered copy after resolving the real booking/payment flow. Use current source to resolve routine facts; ask the owner only if the conflict genuinely cannot be resolved. Finish the rest of the page while blocked on any one factual issue.

## Analytics

Use existing consent-aware analytics. Proposed events if no equivalents exist:

- `business_landing_view`: landing_category=home_car
- `business_signup_cta_click`: landing_category, placement=header|hero|process|offer|closing
- `business_category_anchor_click`: one of the six fixed category IDs
- `business_faq_open`: fixed FAQ ID

Completion belongs to the existing signup success path. A CTA click is not a completed application, approved business or sale. Do not collect email, phone, street address, company contact name, application text, credentials or full URLs in these events. Do not add session replay for this task.

## Reversibility

- Dedicated route/component/data/assets and a focused commit make rollback simple.
- Preserve old mascot/assets and Beauty & Spa source. Do not replace the global brand mascot as part of this page.
- Document each integration edit (navigation, sitemap, template config). Separate page work and production discoverability changes if practical.
- No schema migration, auth rewrite, pricing change or new external service.
- Revert the feature commit or roll back to the previous verified Vercel deployment through the existing process. Preserve independently created merchant data.
