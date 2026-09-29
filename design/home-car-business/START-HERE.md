# MegaDeal Home & Car — business acquisition landing page

Prepared 29 September 2026. This pack is for Claude Code in the existing MegaDeal Next.js repository deployed on Vercel.

## The actual task

Build a business signup page inspired by the current **https://megadeal.co.nz/advertise/beauty-spa**, with the same purple theme, fonts, navigation, signup flow and detailed offer-idea approach. Proposed route: `/advertise/home-car`, subject to checking existing routes.

This pack supersedes the consumer category-grid mockups earlier in the conversation. The final goal is to encourage home-service and automotive businesses to apply. There are no customer search filters, live deals, checkout, customer accounts or booking calendars on this page.

## Hand this to Claude

1. Upload/extract this complete ZIP in the existing project workspace.
2. Paste the contents of `CLAUDE-PROMPT.md` into Claude Code.
3. Ask Claude to finish the implementation and return a protected Vercel preview, screenshots and a focused code diff before production release.

## Included

- Final desktop concept with the current hoodie mascot.
- Original transparent welcoming lavender mascot, copied unchanged from the latest named mascot artwork located on 28 September 2026.
- Separate transparent house-and-car background. Layer the original mascot over it in HTML/CSS; do not redraw the character.
- Six individual illustrative category photos.
- Complete copy and 24 concrete offer ideas with scope notes.
- Responsive design, SEO/AI, security, signup attribution, Vercel and rollback instructions.
- Small optional hero-art component and scoped CSS as integration aids; the existing Beauty & Spa template is the primary implementation source.
- Asset dimensions, byte sizes and SHA-256 manifest.

## Read order

`CLAUDE-PROMPT.md` → `PAGE-COPY.md` → `OFFER-IDEAS.json` → `DESIGN-AND-ASSETS.md` → `IMPLEMENTATION.md` → `SEO-AI-SECURITY.md` → `QA-AND-VERCEL.md`.

## Source of truth

1. Latest explicit owner instruction: B2B page, detailed offer ideas, latest mascot.
2. Actual repository business rules, launch offer and current terms.
3. This pack's written specifications and exact copy.
4. Live Beauty & Spa design and shared components.
5. Generated mockup, for visual guidance only.

The mockup's text, car badge, small accent marks and logo are not authoritative assets. Reuse the current repository logo and original mascot; use the separate supplied generic backdrop. The full original mascot has no extra decorative marks added above its head. Use only the original image.

## Current commercial details observed on Beauty & Spa

- 0% commission.
- Launch promotion: up to six months free; WELCOME6 displayed.
- Eligible Auckland businesses applying before launch; currently NZ registered limited company required; subject to approval and fair use.
- Header/hero offer CTAs link to `#launch-offer`; final signup links to `/list-your-business#signup`.
- Terms `/terms`, contact `/contact`.

These are observations, not a new policy. Recheck the shared offer config and eligibility for Home & Car before publishing. Do not invent future subscription prices, guaranteed leads or automatic acceptance. No production changes have been made by this pack.
