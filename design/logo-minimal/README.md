# MegaDeal minimalist logo implementation pack

## Contents

- `concept-reference.png`: visual direction approved in ChatGPT; not a production asset.
- `megadeal-logo-white.svg` and `megadeal-logo-purple.svg`: horizontal header logos with transparent backgrounds.
- `megadeal-logo-white@2x.png` and `megadeal-logo-purple@2x.png`: raster alternatives. The wordmark in PNGs is a close fallback; use SVG in the actual Next.js site when possible. The SVG uses Fredoka if the site loads it, and falls back to a rounded sans-serif otherwise.
- `megadeal-elephant-white.svg`, `megadeal-elephant-purple.svg`: standalone marks.
- `megadeal-icon-purple-background.svg` and `megadeal-icon-purple-background-512.png`: square icon variants for preview and optional social/avatar use.
- `preview-white-on-purple.png`: simple preview.

The purple in these assets is `#6520B5`, sampled from the primary button in the supplied current homepage hero screenshot. The public coming-soon page has also used a slightly different purple (`#650FC7`) in some UI, so Claude should inspect the actual shared brand token and reconcile it across the site rather than adding another variant.

These production assets are a clean vector redraw of the approved image concept. They are not a pixel-perfect extraction. Review the shape and wordmark at actual header size (desktop and mobile) before enabling sitewide. The current logo and full-colour mascot should remain in the repository for instant rollback.

## Usage guidance

- On the site's current light header, use `megadeal-logo-purple.svg` on white or very pale lavender. Do not switch the whole header to purple solely to accommodate the white variant.
- On a purple header/footer or dark marketing panel, use `megadeal-logo-white.svg`.
- Avoid placing white on pale backgrounds or purple on similarly dark purple surfaces. Verify contrast.
- Do not make the full-colour 3D mascot part of every header. It can remain in one hero placement.
- Test logo at approximately 160–220 CSS px desktop and 130–170 CSS px mobile, preserving the SVG viewBox/aspect ratio. These are starting ranges; compare with the current header.
- The square icon is optional. Existing favicon/social assets can remain until the new mark is approved at small sizes.
- Set the logo link accessible name to `MegaDeal home`; SVG title is provided but the wrapping link should be labelled too.

## Reversible implementation prompt for Claude Code

```text
You are working in my existing Next.js MegaDeal repository deployed by Vercel. I have attached a ZIP containing a new minimalist logo concept and production SVG/PNG assets. I like the white elephant and bold white wordmark on purple. I want the new branding across the website header, but the change must be easy to reverse. Do not deploy or change the current coming-soon/preview gating.

First inspect the repository and list the existing header/logo components, light/dark header variants, logo assets, favicon metadata, portal/header and business pages. Identify the current font loading, especially Fredoka, and the exact places where the old logo is used. Show the proposed file changes before editing.

Implement one shared BrandLogo component (or adapt the existing one) with a single centrally configured `classic` versus `minimal` variant. Default to `minimal` for the review branch, and make rollback a one-line change in that central configuration. Keep every old logo file, class and component path recoverable; do not delete or overwrite original assets. Avoid route-by-route logo duplication.

Place the supplied SVGs in the existing public assets structure. The vector purple is #6520B5, matching the supplied launch hero button; compare this with the repository token and align all shared components to one approved brand purple before publishing. Use the PURPLE logo on light headers, WHITE logo on purple/dark surfaces. Keep the header background and page hierarchy coherent; do not recolour the whole site purple. Set appropriate dimensions and `alt`/accessible link name. Ensure the wordmark renders in the intended rounded font: verify computed font loading and compare the actual screenshot to `concept-reference.png`; if the external SVG font fallback is inconsistent, make an outlined/vector wordmark with consistent appearance or use the matching PNG only after visual review. Do not claim the provided vector is pixel-perfect to the concept.

Apply the central logo switch consistently to consumer pages, business signup, portal entry, support pages and the footer wherever the shared brand header appears. Preserve any intentionally different layout but ensure the logo variant has contrast. Do not change customer or business login, routing, forms, offers, pricing, authentication or launch mode. Do not add the large full-colour mascot to every header.

Keep favicon/social icon changes in a separate, clearly identified optional commit or a separate review stage. Test the icon at 16, 32 and 48 CSS px before replacing the current favicon. It must still read as an elephant. The square purple icon is supplied as a concept.

Build and lint. Take screenshots at 1440, 1024, 390 and 320 px for a light header and any purple header/footer, and inspect the actual site for blur, clipping, stretched aspect ratio, mismatched type, contrast and mobile wrapping. Give me the diff summary, screenshot/preview, the single rollback line, and confirm the original assets remain. Stop before publishing so I can approve the result.
```
