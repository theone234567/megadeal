# MegaDeal launch design implementation pack

**For:** Claude Code working in the existing Next.js repository deployed on Vercel  
**Reference:** supplied screenshot `image(2).png` of the hidden homepage. Attach it to Claude along with this file. If the earlier approved desktop and mobile mockups are available, attach those too and identify them as visual references, not code specifications.  
**Status:** design direction and implementation brief, not a claim that the repository has been inspected. The live public root redirects to `/coming-soon`; the hidden homepage was assessed from the screenshot. Claude must inspect the repository and preview before selecting exact code changes.

## 1. Desired outcome

A professional Auckland local-deals website that still feels recognisably MegaDeal: approachable elephant, purple identity, clear real deals, restrained accent colour. Deal hunters can find offers immediately. New businesses can sign up and create deals. Existing businesses have an unmistakable sign-in path. The launch homepage should feel less crowded and less pink than the screenshot.

This is a **launch-state** design. Preserve the current coming-soon experience until the owner explicitly switches the live site to launch. Do not deploy, change production environment variables, disable preview protection, publish hidden pages, or remove redirects as part of this design task. Implement and show a preview/diff first.

## 2. Before editing: repository reconnaissance

1. Identify Next.js version, App Router versus Pages Router, CSS framework, global styles, font loading, icon library, component structure, design tokens, responsive breakpoints, image assets, and existing test/build commands.
2. Find the actual homepage, business signup, business login/portal, deal card, flash card, filters, header, footer, About, How it works, Help, Redeem, and business marketing pages. Trace routes and existing redirects; do not assume routes from this brief are correct in the repo.
3. Find how launch/preview mode is controlled and what production currently serves. Document it. Preserve its behaviour.
4. Trace the business signup through account creation and deal creation. Use real destinations and existing auth semantics. Do not invent a signup endpoint or claim immediate publication when approval is required.
5. Identify all existing uses of the current fonts, colours, buttons, badges, emoji and icons. List areas with bespoke styles. Inspect whether typography is inherited or overridden in page-specific styles.
6. Check image asset licences/ownership and actual filenames. Use the two new transparent mascot PNGs supplied in this pack as the preferred replacement for the old character cutout. Preserve the original files for rollback. Inspect any existing composite hero background so the old elephant is not duplicated behind the new one. Do not bake page text into an image. Avoid stretching the mascot or covering the headline.
7. Take desktop and mobile baseline screenshots at representative widths (1440, 1024, 390, 320 CSS px) before editing if local preview permits. Compare with supplied references.
8. Summarise findings and intended files/components before broad edits. If a required route or asset is missing, choose the closest existing flow and report it; do not create a disconnected fake action.

## 3. Design system

### Typography

Existing public pages use **Plus Jakarta Sans** and **Fredoka**. Standardise deliberately:

- Plus Jakarta Sans: body, navigation, buttons, labels, forms, deal titles, prices, captions and long-form content.
- Fredoka: H1 and selected H2 headings only, preferably medium/semibold. Do not use it for paragraph text, tiny labels or every card title.
- Logo is artwork; preserve its own lettering. Remove handwritten/decorative text over the hero artwork. No third interface font.
- Define a single type scale in shared tokens. Suggested desktop: H1 `clamp(2rem, 3vw, 3rem)` with line height ~1.1; H2 `clamp(1.5rem, 2vw, 2rem)`; body 16px/1.5; card title 15–16px/1.35; metadata 13–14px with sufficient contrast. Mobile H1 roughly 30–36px and body 15–16px. These are initial values; inspect rendered results.
- Avoid tiny text merely to fit more cards. Use sentence case for buttons and content, consistent capitalisation for category names and Flash Deals.

### Colour tokens (starting point; refine against existing logo and contrast)

| Token | Suggested colour | Use |
|---|---|---|
| `ink` | `#211A35` | Main text/headings |
| `muted` | `#625C70` | Secondary text, not critical price/expiry |
| `brand` | `#6520B5` | Primary actions, selected controls, links |
| `brandHover` | `#501590` | Interactive hover |
| `lavender` | `#F5F0FC` | Limited section tint |
| `surface` | `#FFFFFF` | Cards, page surfaces |
| `page` | `#FBFAFD` | Overall background |
| `border` | `#E7E0EF` | Card and control borders |
| `flashAccent` | `#D62780` | Small Flash Deals emphasis only |

Verify contrast in real components; adjust tokens to meet WCAG AA for text and controls. Do not spray pale pink behind every section. Photos and mascot provide the expressive colour. Avoid multiple unrelated gradients and purple shades. Promo tags may use a tinted background but should not all be saturated.

### Shared components

- One primary filled button and one secondary outline/text button, with consistent minimum height, padding, radius, focus ring and disabled state. No uppercase promotional button variant throughout the business journey.
- One card radius (about 12–16px), subtle border, minimal shadow, consistent image crop and internal padding.
- One icon family already installed if suitable (e.g. Lucide if present); consistent 18–20px stroke icons. Remove emoji as interface icons on the business page. Do not mix solid, emoji and outline icons. Meaningful labels remain visible.
- One spacing scale (4/8/12/16/24/32/48/64px) and shared content container (approximately 1120–1200px max width). Long text pages use narrower reading width (about 680–760px). These values are targets, not an instruction to alter all layouts indiscriminately.
- Use shared tokens/components rather than page-by-page hardcoded near-duplicates. Scope changes so portal/dashboard dense workflows remain usable.
- Honour reduced-motion preferences; no autoplay carousel or bouncing decorative elements. Horizontal scrolling categories on mobile may be user-controlled with visible affordance; do not auto-scroll them.

## 4. Launch homepage layout

### Header

Desktop: logo left; search and area selection comfortably sized; `Business sign in` as a clear, restrained link to the actual portal login; `List your business` as a visible secondary/primary business signup action according to available width. Avoid the vague `For businesses` label. Keep the browsing route visually primary for deal hunters. Do not show customer saved/sign-in features that are not implemented.

Mobile: logo, compact search/location access, and a discoverable business route in menu or visible navigation. Both business actions must be accessible without hunting in the footer. Do not squeeze all desktop controls into a tiny row. Touch targets at least ~44px where practical.

### Hero

- Reduce desktop height approximately 25–30% versus screenshot; initial target ~280–340px depending on artwork and text. Ensure the first deal section begins within a normal laptop viewport without a huge blank visual pause.
- Keep text in a protected left column (~45–50%); put the new welcoming elephant distinctly on the right, with its silhouette clear of headline, paragraph and CTAs. Preserve visible head/trunk and safe padding at intermediate widths. Crop Auckland background intentionally.
- Headline suggestion: `Big local deals. More to enjoy.` Supporting line: `Discover standout offers from Auckland businesses. Contact or book directly with the business.` Verify business model/copy before adopting.
- Primary button `Browse deals` scrolls/focuses the deal section or routes to the existing listing. Secondary button `List your business` routes to real signup/marketing entry. Keep `Business sign in` in header, not as another hero button.
- Remove floating handwritten `Dine / Explore / Relax / Enjoy Local` words, extra micro-links and pink brush label if they compete with the message. If `Auckland deals` is needed, use a small accessible location label rather than a large paint splash.
- Mobile: use a shorter text-first composition and smaller/moved elephant; no overlap with text. Do not crop the mascot's face or create a tall image-only screen. Prioritise usable buttons and immediate category/deal access.

### Discovery and deal lists

- One category area with consistent icons and text. Desktop may show all six categories in a row. Mobile should show visible first categories and permit deliberate horizontal swipe or a compact two-row grid if testing shows labels remain legible. Avoid automatic movement and duplicated category UI.
- Distinguish category selection from filters. Keep All deals, Everyday Deals, Flash Deals as a small segmented control if these genuinely filter the same dataset. Price, distance and sort remain clearly secondary. Don't show an unimplemented Grid/Map toggle.
- Flash Deals section followed by a compact business invitation, then Everyday Deals. Maintain a sensible order if live data or empty states differ.
- Remove the thin `1. Browse / 2. Get the code / 3. Contact & redeem` strip from homepage; make How it works and deal-specific redemption terms easy to find on relevant pages.
- Remove the large `Love MegaDeal?` footer section. Keep social links under `Follow MegaDeal` in a simple footer.

### Deal cards

- Use one shared card layout for regular and flash deals. Suggested 4 columns on wide desktop only when readable, 3 at medium desktop, 2 at tablet, 1 or 2 on phone after visual inspection. Do not force four tiny cards into a narrow content width. Keep grid container aligned with header and hero.
- Fixed image aspect ratio around 4:3 or 3:2, `object-fit: cover`, predictable crop, accessible alt. Source images vary; do not stretch them. Require minimum image quality and graceful placeholder.
- Compact card body: title at most two lines with stable height; business and suburb in one clear metadata line; price prominent; original price subdued/struck through only if genuine; expiry or redemption constraint in a predictable final position. Avoid unused white space and excessively tall cards.
- Percentage discount and Flash label should not compete. Flash: one flash marker and one countdown/time-left treatment in fixed positions. Regular: discount badge if applicable. Never show contradictory countdown/expiry states. Use actual business data, not mock values.
- Icons: one family, only where meaning is useful (e.g. location/time), with labels so they aren't ambiguous. Remove duplicate decorative icons and badges.
- Limit pink to a small flash cue. Consistent spacing and photo crop will improve quality more than extra decoration.

### Business invitation

After the first deal section: restrained lavender or white panel, not another busy hero. Example: `Own a local business? Put your next deal in front of Auckland customers.` CTA: `Sign up & list a deal`. Small supporting text can explain direct bookings and no commission **only if current commercial terms support the claim**. Link to real signup flow. Existing account route remains `Business sign in` in header and may appear as a text link within the panel.

## 5. Site-wide launch audit

Review homepage, `/about`, `/how-it-works`, `/list-your-business`, `/portal`, help/redeem pages, footer, email signup panels, and any business-category landing pages. Apply shared styles without rewriting working logic. Replace launch-only copy when launch is actually activated:

- `coming soon`, `before launch`, `day one`, `early access`, `get launch updates`, `claim my free advertising`, limited prelaunch offer, countdown samples and queued-until-launch promises must be checked against real launch status and campaign terms. Do not silently delete valid promotions or promises; flag owner decisions.
- Current public business page repeats an uppercase `CLAIM MY FREE ADVERTISING` action many times. Reduce repetition; use a straightforward `Sign up & list a deal` action and a coherent hero, benefit summary, process and FAQ. Confirm whether signup creates a business account, requires review, and when a submitted deal becomes visible.
- Align explanation of customer flow everywhere: browse → read terms → get code/contact or book → pay business directly. Some offers require booking, are walk-in, or are valid only at specified times. Never imply all deals can be redeemed whenever convenient.
- Keep free-to-browse and 0% commission claims only where backed by current business rules. Pricing/free-advertising claims and WELCOME6 details require owner confirmation before changing.
- Simplify footer and keep navigation destinations valid. Add/de-emphasise links according to real features; do not add placeholder pages.
- Check title case/sentence case, category naming, area naming, labels, error/success/empty states, form spacing and focus states across customer and business pages.

## 6. Technical implementation safeguards

- Respect current router, TypeScript conventions, data fetching, authentication, form validation, SEO, accessibility, and deployment setup.
- Avoid changing database schemas, payment logic, offer eligibility, auth/session rules or legal terms for a visual redesign.
- Keep all deal cards data-driven; test empty, long title, missing photo, no old price, price-free offer, expired flash deal and very short timer states.
- Prevent layout shift with image dimensions/aspect ratio. Ensure countdown timers use correct end time/timezone and accessible updates; never render misleading stale time.
- Avoid text baked into hero imagery. Use semantic headings, proper button/link elements, visible focus, labelled search/filter fields, reduced motion and readable contrast.
- Preserve public coming-soon redirect until launch is authorised. Preview hidden homepage through existing repo mechanism. No accidental SEO exposure of preview URLs.
- Check Vercel preview build and route behaviour; deployment/publishing is a separate decision.

## 7. Acceptance criteria and review sequence

1. Claude provides a concise repository map and file list before editing, including found routes and launch toggle.
2. Claude implements shared tokens/type/buttons/icons and then homepage sections. Show a component-by-component diff summary, not an unsupported claim of pixel-perfect equivalence.
3. Desktop screenshots at 1440 and 1024: elephant is clearly right of text; hero shorter; both audiences' routes visible; four-card row only when cards remain readable; fewer pink blocks; predictable card heights.
4. Mobile screenshots at 390 and 320: no horizontal page overflow, no overlapping mascot/headline, buttons readable, category controls usable without auto-scroll, deal cards readable, business sign in and signup discoverable.
5. Check About, How it works, business landing, portal entry, at least one deal detail and footer at desktop/mobile for consistent fonts, colours and iconography.
6. Build, lint and relevant existing tests pass. Test actual button destinations and browse/filter interactions; do not add superficial tests just to mirror CSS.
7. Provide before/after screenshots or preview URL, changes made, remaining copy/product decisions, and any deliberately untouched launch gating. Do not merge or publish without explicit owner instruction.

## 8. Claude Code prompt — copy from here

```text
You are working in my existing MegaDeal Next.js repository deployed via Vercel. I have attached a detailed implementation pack and screenshots. Read the entire pack first. This is a hidden launch homepage; the public site currently redirects to /coming-soon. Do not deploy or expose the hidden homepage.

My goal: make the launch website calmer, more professional and consistent across pages while keeping the elephant and purple MegaDeal identity. I dislike the oversized hero, elephant overlapping the text, mismatched fonts/icons, overly tall white deal cards and excessive pink. New businesses must see “List your business” / “Sign up & list a deal”; existing businesses must see “Business sign in”. Deal hunters should browse immediately. Businesses will be able to create deals when this launch design goes live.

FIRST inspect the repository. Identify the router, styles, fonts, existing assets, component reuse, real routes, signup/deal-creation flow, launch gating, and build commands. Tell me your findings and exact files you plan to edit. Do not guess URLs, alter business logic, or disable preview gating. Replace the old mascot with the two supplied transparent PNGs only in the approved placements. If earlier visual mockups are attached, use them for direction while respecting real content and responsive behaviour.

THEN implement the pack in logical stages: (1) shared design tokens and typography/icon/button rules; (2) compact hero and clear header CTAs; (3) categories, filters and compact consistent data-driven deal cards; (4) restrained business invitation and footer cleanup; (5) consistency pass across About, How it works, business landing, portal entry and relevant support/deal pages. Keep launch-specific copy behind the existing launch state and flag claims/promotions that require owner decisions. Never replace valid terms with assumed terms.

Be careful about visual fidelity: inspect real browser previews rather than trusting CSS values. Capture and review 1440px, 1024px, 390px and 320px screenshots; fix overlap, crop, wrapping, spacing, contrast and overflow. Use the supplied `megadeal-mascot-hero.png` to the right of the text, not covering it. Use `megadeal-mascot-search.png` only in a relevant empty state or compact explainer. Do not repeat either mascot on every section. The hero should be materially shorter than the supplied screenshot. Cards should be compact but readable, with consistent imagery and badges. Pink should be a small accent mainly for Flash Deals.

Run the project's build/lint and relevant existing tests; click through key links and filters in preview. Report the actual files changed, routes confirmed, before/after visuals, tests run, unresolved decisions and any limits. Stop with a reviewable preview and code diff; do not deploy production, disable preview mode, publish hidden routes, or change data/auth/payment behaviour.
```

## 9. Owner decisions to resolve after first preview

- Exact wording of the business promotion and whether WELCOME6/up-to-six-months-free remains valid after launch.
- Whether business signup directly creates a draft deal, or approval/profile completion intervenes. CTA can still say `Sign up & list a deal` if the flow clearly explains the steps.
- Final category behaviour on mobile after seeing a real 320/390px render.
- Whether the earlier mockups are the definitive visual reference, or this pack's quieter direction takes precedence where they conflict.

## 10. New mascot assets and placement rules

The accompanying ZIP contains two actual transparent RGBA PNG assets generated using the screenshot as a character reference:

| File | Purpose | Placement |
|---|---|---|
| `megadeal-mascot-hero.png` | Full-body welcoming elephant | Once in launch homepage hero, on the right, fully separated from headline and CTAs |
| `megadeal-mascot-search.png` | Compact waist-up elephant with magnifying glass | Optional no-results/empty deals state or a small `Discover local deals` explainer; choose one, not both |

**Restraint:** the elephant should be the brand's signature moment, not a repeated decoration. Keep logo/header as the existing logo. No elephant in every card, every category, the business promo panel and footer. For the business signup page, prefer real business photography and straightforward product UI. A small mascot may appear in onboarding success only if that screen needs warmth, but omit it by default.

**Implementation:** place files under the repository's established asset directory with stable names. Use Next.js `Image` or the project's image component with explicit dimensions, `object-fit: contain`, no distortion, and an appropriate `sizes` value. Treat purely decorative mascot as empty alt; if it conveys content, use concise alt such as `MegaDeal elephant mascot welcoming visitors`. Keep an uncluttered fallback if the image fails. On mobile reduce or reposition the hero mascot and ensure it does not dominate the first screen. The transparent image is a character cutout, not a complete hero background. If the current hero is a single flattened image containing the old elephant and brush lettering, replace that composite with a clean Auckland background or build a layered background with no old character/text. Never overlay the new mascot on top of an existing embedded old mascot.

**Quality check:** inspect the alpha edge against both white and lavender, check all limbs and the hoodie `M`, crop only empty transparent padding if needed without cutting the character, and compare render at desktop/tablet/mobile. If a PNG edge looks poor in the actual site, flag it rather than adding a bright glow to conceal it. Preserve the old asset files for rollback until the owner approves the replacement.
