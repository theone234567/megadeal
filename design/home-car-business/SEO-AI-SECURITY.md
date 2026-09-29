# SEO, AI discovery and security

## Search intent and copy

This is a business acquisition page. Target natural language around advertising home services and automotive businesses in Auckland, not consumer phrases such as cheap oil changes. Suggested title: **Home & Car Business Advertising Auckland | MegaDeal**. Suggested description: **Explore promotion ideas for Auckland cleaners, gardeners, home-maintenance and automotive businesses. See MegaDeal's current business advertising offer.**

Use one H1 and descriptive H2/H3 headings. All 24 examples and FAQ answers must be rendered as accessible text. Category links go to real section IDs. Add links to this page from the relevant existing business advertising hub when ready for public release. Do not automatically change the consumer navigation or category model.

Use canonical `https://megadeal.co.nz/advertise/home-car` only after confirming the route and trailing-slash convention. Avoid canonical URLs built from untrusted Host headers. Tracking query variants canonicalise to the stable page. Do not canonicalise this page to Beauty & Spa. Add it to the production sitemap when intentionally released, with accurate lastmod semantics.

Keep copy distinct and service-specific. Do not swap beauty keywords mechanically. Do not add mass-produced suburb pages, fabricated customer numbers, misleading free-forever claims, fake reviews or unsupported rankings.

## AI discovery

Google says its ordinary SEO foundations also apply to AI Overviews and AI Mode. No special AI schema or new AI text file is required. Practical approach: readable server-rendered explanations, accurate company identity, real links, explicit eligibility and clear offer examples. Make content easy to cite without promising inclusion or ranking.

An AI API/chatbot is not needed for this page. Crawler/training policies are separate sitewide decisions; preserve existing robots rules and do not change them wholesale for this landing page.

## Structured data

- Reuse the site's existing Organization identity/@id; do not duplicate contradictory business identities.
- WebPage and BreadcrumbList can describe the page/hierarchy if consistent with visible breadcrumbs and site structure.
- Do not label MegaDeal as a cleaner, mechanic or local service provider.
- Do not generate Product/Offer markup for illustrative promotion ideas, fictitious prices, review ratings, testimonials or individual invented businesses.
- Ordinary FAQ text is valuable for users. Google retired FAQ rich results in May 2026 and removed the documentation in June 2026. Keep FAQs for users; do not add FAQ markup expecting a Google rich-result enhancement.
- Use current safe JSON serialization for JSON-LD. Escape `<` to `\u003c` in serialized data; never concatenate user-supplied strings into an HTML script tag. Keep this page's structured data sourced from trusted editorial data.

## Preview and production

Protected previews must remain protected. `noindex` is not authentication. Use the project's available Vercel deployment protection and verify the effective setting, including production aliases and preview URLs. Add/retain `X-Robots-Tag: noindex` or equivalent route metadata on previews. Do not rely only on robots.txt disallow, which can prevent crawlers from seeing noindex.

Keep staging out of sitemaps and public navigation. After owner-authorised release, verify the production page has no unintended noindex and the correct canonical, while preview hosts stay protected/noindex. Preserve existing protection and indexation controls for unrelated pages, including the already indexed Vercel-domain concern. Do not globally alter host redirects in this scoped task.

## Security requirements specific to this work

1. Reuse the existing signup endpoint. No new form, card collection, payment integration or extra credential requirement.
2. Server-side eligibility, authentication, authorisation and approval remain authoritative. A source/category query parameter must not bypass business verification or grant publishing access.
3. Use fixed internal CTA destinations. Do not implement `?redirect=<arbitrary URL>`; use allowlisted identifiers if redirect support is already needed.
4. Treat attribution/query values as untrusted, bound their length and allowlist values. Avoid arbitrary remote image URLs or server fetches derived from URL inputs.
5. Keep secrets in appropriate server-side environment variables. Never put private keys in NEXT_PUBLIC variables, repository content, client bundles or preview logs.
6. Reuse current request validation, CSRF protections, abuse controls and durable rate limits in the signup flow. Do not weaken them to make preview testing pass. This page itself should need no write API.
7. Escape editorial text in React by default. Avoid dangerouslySetInnerHTML for copy. If the existing CMS uses HTML, retain its proven sanitisation.
8. Use the current CSP/security-header setup; do not invent a permissive global policy or add unsafe-inline/unsafe-eval merely to fix a component. Integrate local images with existing image rules.
9. Use the existing terms/privacy links and explicit consent in the signup flow. Marketing consent remains separate where already supported. Do not precheck terms or auto-submit them.
10. Do not claim businesses are verified, insured, vetted or endorsed unless the current process and data justify it. Generated photos are illustrations only.

## Primary references

Checked 29 September 2026; Claude should check installed/current guidance for implementation details.

- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google structured-data policies: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google FAQ retirement update: https://developers.google.com/search/updates
- Vercel deployment protection: https://vercel.com/docs/deployment-protection
- OWASP redirects: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
- Actual design reference: https://megadeal.co.nz/advertise/beauty-spa

The live MegaDeal page was inspected in a browser for design, copy and destinations. Repository/server security and current account settings were not audited. These requirements guide the implementation; they are not a security certification.
