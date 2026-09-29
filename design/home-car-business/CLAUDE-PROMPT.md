# Copy this prompt into Claude Code

Implement a **Home & Car business signup landing page** in my existing MegaDeal.co.nz Next.js repository, deployed through the existing Vercel project. The attached `home-car-business-pack` contains artwork, full copy, 24 offer ideas and implementation requirements. Finish the work in a reviewable preview; do not stop after planning.

## Most important direction

Use **https://megadeal.co.nz/advertise/beauty-spa** as the reference. I like how it explains each business type and gives actual promotion ideas. Build the Home & Car equivalent, not a consumer deal-results page. Keep the same purple gradient, white buttons, Fredoka headings, Plus Jakarta Sans body, rounded cards, spacing and existing business header/footer. Use the latest **lavender elephant in a purple M hoodie**, supplied as `assets/mascot-welcome-current.png`, unchanged. Do not use the older small M-shirt elephant or redraw the logo.

Read every document in this pack and open `mockups/home-car-business-desktop.png` before editing. The written copy overrides generated image text. All headlines, lists, CTAs, labels and FAQs must be actual HTML. Images are decorative/category illustrations, never a flattened website screenshot.

## Inspect, then implement

Read applicable AGENTS.md and installed Next.js guidance. Inspect current branch and uncommitted work; preserve unrelated changes. Identify the router, installed framework versions, actual Beauty & Spa route, shared advertising template, CSS, fonts, current logo/mascot, signup destination, terms/offer configuration, launch gating, analytics and Vercel settings. Briefly state the findings and intended files, then proceed autonomously with safe scoped implementation.

Create `/advertise/home-car` if that route does not already exist; if it exists, update it carefully. Reuse the Beauty & Spa page structure/components where safe. If a broad shared refactor would risk other pages, use a scoped sibling implementation. Do not replace global styles or rebuild the site. Preserve the public coming-soon behaviour and all unrelated routes.

## Content and conversion

Use the full `PAGE-COPY.md`, the six business sections and all four offer ideas per section in `OFFER-IDEAS.json`. Every business card needs a meaningful paragraph, four clearly labelled **Example offer ideas**, and a short practical scope note. Categories are Cleaning; Garden & Outdoors; Home Maintenance; Car Wash & Detailing; Servicing & Repairs; Tyres & Wheels. The six top shortcuts are anchor links, not deal filters.

Include quieter-days benefits, practical offer-writing guidance, three how-it-works steps, a launch-offer panel, FAQs and closing signup CTA. No fake prices, merchant listings, reviews, savings, guarantees or invented customer counts. Keep the latest eligibility wording visible. Current Beauty & Spa shows up to six months free / WELCOME6 for eligible Auckland limited companies applying before launch; verify current applicability before reusing it. Do not change pricing or eligibility to make the page easier to write.

Hero/header offer buttons go to `#launch-offer`; final action uses the real existing signup destination, observed as `/list-your-business#signup`. Reuse the actual application flow and server-side approval rules. No new form or signup API. Do not auto-create an account, accept terms or submit a real application during testing. Retain an existing business-login route only if present in the shared template.

## Brand fidelity

Use the original transparent mascot with `object-fit: contain`. The supplied transparent house/car background can sit behind it in a separate positioned layer. The optional `starter/HomeCarHeroArt.tsx` demonstrates this; adapt its imports and image strategy to the installed Next version. Use the six standalone photos in corresponding cards. Reuse existing white header logo exactly. Do not use the rendered logo or text from the mockup. Follow `DESIGN-AND-ASSETS.md` for mobile behaviour and composition. No auto-scrolling, bouncing mascot or rotating categories.

## SEO, AI discovery and security

Implement unique business-focused metadata, one H1, descriptive headings, crawlable copy/anchors and a canonical on the production domain after release. Use the sitewide Organization identity and accurate WebPage/BreadcrumbList markup only where appropriate. This is not a merchant listing or live offer catalogue: do not add Product/Offer prices, fake LocalBusiness locations, reviews or Service-provider claims. FAQ content helps users; do not promise FAQ rich results or AI rankings. Keep offer examples indexable as normal text. Do not mass-generate suburb pages.

No extra AI API, chatbot, third-party booking integration, secrets or new database schema is required. Use existing auth, server validation, rate limits and approval controls in the signup flow. Allowlist any source attribution values and keep redirect destinations fixed. No personal data in analytics. Preview must remain protected and noindex; noindex is not access control. Details are in `SEO-AI-SECURITY.md`.

## Reversible Vercel delivery

Work in an isolated branch and focused commits. Copy assets under a namespaced public directory, preserve old assets, document changed files and rollback steps. Use the existing Vercel project and build configuration; do not create a new project or change DNS. Prepare a protected preview deployment through the established workflow if credentials and permissions are available. Never expose secrets or disable launch/protection controls. If preview deployment is blocked, finish the local implementation and provide the exact blocker.

Run the project's build/type/lint checks and meaningful existing tests. Review screenshots at 1440, 1024, 768, 390 and 320px; fix overflow, wrapping, mascot overlap and unreadable terms. Check anchors, all signup links, FAQ keyboard behaviour, metadata and preview indexing. Check Beauty & Spa for regressions. Don't claim pixel accuracy without reviewing screenshots.

Return: actual route, preview URL or precise blocker, changed files, current-mascot confirmation, all checks run, desktop/mobile screenshots, verified CTA destination, remaining factual issues and rollback instructions. Keep production publishing/merge as the final owner decision. Do not stop before the page is implemented and reviewable.
