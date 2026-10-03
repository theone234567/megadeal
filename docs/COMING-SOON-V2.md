# Coming-soon V2 design: switch, rollback, sources and checks

From the "Coming Soon" Claude pack (3 Oct 2026). The existing page is untouched and still the
default; V2 only shows when switched on, or to a signed-in admin as a preview.

## Switching

| What | How |
| --- | --- |
| Preview (admin only) | Sign in at `/admin`, then open `/coming-soon?design=v2`. Never cached, `noindex`. Everyone else keeps the current page. |
| Show V2 to everyone | Add `COMING_SOON_DESIGN: v2` to the **Build** step's `env` in `.github/workflows/deploy.yml`, commit, push. |
| Roll back the design | Remove that line (or set it to `legacy`), commit, push. |
| Roll back the code | `git revert <V2 commit>`, newest first if several. No `reset --hard`, no force-push. |

`/coming-soon` is prerendered, so the switch is read at **build** time: Cloudflare's runtime
variables are too late and every change needs a deploy. Only the exact value `v2` turns it on;
anything else keeps the current page (`comingSoonDesign` in `lib/siteConfig.ts`, tested).
The launch redirect in `middleware.ts` runs before either design. Newsletter sign-ups are
untouched by switching or rolling back.

## What V2 reuses

- Header, footer and footer signup: the root layout's, rendered once (V2 renders neither).
- Email form: `components/EmailSignupForm.tsx`, same `/api/email-signup` request
  (`audience: customer`, `source: coming-soon`), same consent wording (agrees to emails, terms and
  privacy policy), same double opt-in. Only a `shape="rounded"` option was added (8px corners,
  48px controls); every other form keeps its pill shape.
- Fonts: Fredoka (headings) and Plus Jakarta Sans (body) from `lib/fonts.ts`, via their CSS
  variables; purple `#6520B5` (`--md-purple`, Tailwind `brand-600`). Confirmed from computed
  styles in the browser.
- Social links: `SOCIAL_URLS` in `components/SocialLinks.tsx` (the site's existing profiles).
- Copy, FAQs and category photos: `lib/comingSoonV2Content.ts`.

## Image sources

| Use | File / URL | Source |
| --- | --- | --- |
| Hero | `public/megadeal/hero/auckland-skyline.webp` (master `design/hero/auckland-skyline-source.webp`) | Owner-supplied Auckland skyline photo, already used on the homepage hero |
| Mascot | `public/megadeal/coming-soon-v2/mascot-hoodie.webp` (master `design/coming-soon-v2/mascot-hoodie-source.png`) | Supplied in the pack |
| Example deal | `public/images/beauty-spa/beauty-massage.webp` | Owner-supplied beauty-spa pack |
| Categories | Unsplash URLs in `lib/comingSoonV2Content.ts` | Same photos as the current page (Unsplash licence) |

**Owner to supply:** the pack asks for a hotel **bedroom** (Travel & Getaways) and **kayaking**
(Things To Do). Those two are still the current page's photos; swap the URLs in
`lib/comingSoonV2Content.ts`.

## Checks run (3 Oct 2026, local dev and production builds)

- Builds: default build renders the current page (title "Big Local Deals Are On The Way in
  Auckland"); `COMING_SOON_DESIGN=v2` build renders V2 (title "Auckland Local Deals Coming Soon"),
  none of the banned phrases in the HTML. Typecheck and all unit tests pass.
- Routes: anonymous `/coming-soon?design=v2` gets the current page; anonymous
  `/coming-soon/v2-preview` redirects to `/coming-soon`; admin gets V2 with `X-Robots-Tag: noindex`.
- Browser at 320, 390, 768, 1024, 1440px: no horizontal scroll; one h1; one footer; no "free to
  join" / "early access" / approved-business wording; phone order headline → 160px skyline (110px
  mascot, unclipped) → form → socials; categories 2 × 3 on phones, 3 × 2 at 768, 6 across from
  1024.
- Signup (requests intercepted, nothing sent): invalid email blocked; no consent → message and
  focus on the box; pending disables the button (a second click sent nothing); server error keeps
  the email and shows the message; success shows the confirm-email message; footer form unaffected.
- Not checked here: category photos load (Unsplash is blocked in the build sandbox, they load for
  visitors as on the current page); deployed cache headers; a real newsletter submission.

## Read-only SEO / security review (findings, not changed here)

- **Critical (fix separately): Next.js 16.3.5 is affected by GHSA-vcvr-r3jv-pc5j** (remote code
  execution in `next/og` ImageResponse, fixed in 16.3.6). Exposure is low: all six
  `opengraph-image` routes are static, built once with no visitor input. Recommended: upgrade to
  16.3.6 in its own commit.
- Admin API routes all check the admin session (except login/logout, by design); deal and
  business API routes all check the signed-in member.
- `robots.txt` disallows `/admin`, `/portal`, `/api`; the sitemap lists public routes only; the V2
  preview sends `noindex` and isn't listed.
- CSP is enforced (`CSP_ENFORCE` can drop it to report-only), plus nosniff, `X-Frame-Options:
  DENY`, Referrer-Policy, Permissions-Policy and HSTS.
- Public build variables (`NEXT_PUBLIC_*`) hold only non-secret IDs (site URL, analytics, pixel,
  verification codes, Wix client ID).
- The **current** page still says "Free to join, unsubscribe anytime", "Early access before deals
  go public" and "Every business is approved by our team" (the pack's banned claims). Left as is,
  per the pack; remove when approved, or by switching to V2.
