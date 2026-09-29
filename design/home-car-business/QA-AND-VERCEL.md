# Acceptance and Vercel handoff

## Before implementation

Capture Beauty & Spa desktop/mobile baselines from the actual repo preview. Record current route, fonts, logo, source of launch offer, signup destination and launch gate. Inspect the owner's existing changes before choosing files to edit.

## Visual/content checks

- It is recognisably the Beauty & Spa business template, now specific to Home & Car.
- Original current hoodie mascot is used without redraw; ears, trunk, hands and feet are not clipped.
- Actual current white logo is used; not the logo rendered inside the mockup.
- Six business sections and exactly four concrete ideas each are visible and meaningful.
- Scope guidance and example-only label prevent the page looking like live deal inventory.
- No consumer search/filter/booking controls.
- No guaranteed leads, rankings, revenue, fake reviews or new prices.
- Current eligibility, promotion limits, code and terms are consistent wherever repeated.
- No bracketed implementation notes from PAGE-COPY remain in the UI.

## Functional and accessibility checks

- Header/hero anchors reach the launch offer and how-it-works sections.
- All six category shortcuts reach the correct headings with sticky-header offset.
- Final signup reaches the real existing signup section. Check without creating a real account.
- Terms, contact and footer links are real.
- FAQ works with pointer and keyboard; expanded state and answer relationships are correct.
- One main landmark/H1; no duplicate page headers/footers or duplicate IDs.
- Focus is visible; text and controls meet WCAG AA contrast; targets about 44px where practical.
- Test 200% zoom, reduced motion and keyboard-only navigation.

## Responsive screenshots

Review 1440, 1024, 768, 390 and 320 CSS-pixel widths. Inspect first screen, category nav, all business cards, offer panel and expanded FAQ. Body text remains readable and no horizontal overflow occurs. The hero image cannot overlap text. Do not hide overflow globally to conceal broken layout.

## Technical checks

Run the actual project scripts for type/build/lint plus relevant existing tests. Check image paths, console errors, broken links and hydration warnings. Inspect server-rendered HTML for headings/copy/metadata. Check canonical and robots values independently in production configuration versus preview. Confirm example content is not injected into merchant data or marked up as real offers.

Check current shared Beauty & Spa page for regressions. Only broaden testing for an actual shared change. No new test framework is required.

Measure image loading and layout movement; category images below the fold lazy-load, dimensions are reserved, and original PNG files are delivered through the project's normal optimisation where supported. Use measured findings rather than claiming an untested performance score.

## Vercel

1. Use the existing connected repository/project, Node version, lockfile and package manager.
2. Use a feature branch; preserve production branch and existing project settings.
3. Build locally/current environment first. Deploy a protected Preview using the established Git integration or authenticated workflow when authorised and available.
4. Verify preview protection, noindex, images, CTA destination and environmental separation. Do not change production secrets or reuse a production write endpoint just for testing.
5. Provide the reviewable preview and screenshots. Do not promote/merge into production without the owner's release instruction.
6. If deployment cannot be done, give the finished code/diff, local preview evidence and exact missing permission/credential/configuration. Do not ask for secrets in chat.

## Final Claude report

Provide route, preview URL, changed files, screenshots, checks actually run, unresolved factual decisions, signup destination and image-source confirmation. Explain rollback: revert this feature's focused commits and integration edits, or use the preceding verified deployment. No database rollback should be necessary.

## Pack validation boundary

The pack creator checked the asset files, PNG dimensions/transparency, JSON structure, category/idea counts and archive integrity. This is not a claim that code was integrated, built or deployed in the unseen repository. Claude must perform those checks after implementation.
