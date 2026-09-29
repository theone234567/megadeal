# Visual and responsive specification

## Match the actual Beauty & Spa page

Observed on 29 September 2026: purple header with white logo; purple-gradient hero; Fredoka H1, weight 600, desktop 62px / 66.96px; Plus Jakarta Sans paragraphs, links and controls. Main text #0F172A; secondary text #475569; CTA text #6520B5. Reuse current source tokens/classes when available.

Hero background observed:

```css
radial-gradient(ellipse at 90% 0%, #813ada 0%, transparent 53%),
linear-gradient(120deg, #3c087d 0%, #6416bf 62%, #7020c7 100%)
```

Use white headings with #ADDFFF for the selected hero phrase; white rounded primary CTA with purple text. Secondary button should follow the current Beauty & Spa component; if the mockup shows a different border style, prefer the real shared component. Lavender sections about #F5F0FC; white cards; subtle lavender borders. Avoid serif fonts, pink section backgrounds and third font families.

## Structure and geometry

- Container: about 1184px, centred; side gutters 24–32px desktop, 16–20px phone.
- Header: approximately 80–88px desktop, simpler 64–72px mobile. Logo remains the actual repository artwork.
- Hero: two columns with text occupying roughly half. H1 48–62px desktop, 34–40px phone; line-height 1.08–1.15. Never use fixed line breaks that break narrow layouts.
- Hero art: current original mascot over separate house/car backdrop on rounded lavender panel. Text and art are separate grid columns. Mascot must not overlap or cover copy.
- Category navigation: six labelled anchor chips on desktop; static 2-column x 3-row grid on phones. Each navigates to a real visible section. No automatic scrolling.
- Intro/benefits: white section, three benefit columns desktop, stacked mobile.
- Business sections: two substantial cards per row desktop, one per row below about 760px. All six cards contain the complete four-item idea list. These are not compact consumer deal cards.
- Card image: 16:9 desktop with object-fit cover; cap image height near 200–220px so text has room. Use a slightly shorter crop if needed, not a stretched image.
- Card body: title, paragraph, lavender idea-list area, concise scope note. Body 16px / 1.55; list titles semibold. Scope notes may be 14–15px, never tiny. Do not force equal fixed heights that clip content.
- Section rhythm: 56–80px desktop; 32–48px mobile. The longer content will make the final page taller than the mockup. Preserve reading comfort.
- FAQs: current accessible accordion or native details/summary; full answers in server-rendered markup, keyboard support, visible focus.
- Launch panel: purple; qualified offer and single obvious signup button; full eligibility line at least 14px with good contrast. Do not hide terms behind hover.
- Bottom CTA: normal document flow. Do not add a fixed mobile bar unless the existing business template already uses one and it can avoid obscuring content/cookie controls.

## Responsive targets

| Width | Behaviour |
|---|---|
| 1440px | Full nav, split hero, six category chips, two rich industry cards per row |
| 1024px | Reduce gaps/heading before shrinking body; hero still split if readable |
| 768px | Stack hero if needed; switch industry grid to one column when copy becomes cramped |
| 390px | Text/CTA first, compact mascot art below; 2x3 category grid; one-column content |
| 320px | Natural wrapping, full-width buttons, no horizontal page overflow; terms readable |

Hero illustration should remain within about 230–300px tall on mobile so it does not dominate several screens. Keep feet, ears and trunk visible. Allow content to grow with 200% zoom. Use reduced motion; no animation is needed.

## Asset mapping

| File | Placement | Treatment |
|---|---|---|
| mascot-welcome-current.png | Hero, optionally one small closing decoration | Original transparent PNG, contain, no redraw |
| hero-home-car-background.png | Behind mascot in hero | Transparent decorative layer, contain |
| cleaning.png | Cleaning card | Cover crop; preserve cleaner when possible |
| gardening.png | Garden & Outdoors card | Cover crop; show mower and lawn |
| home-maintenance.png | Home Maintenance card | Cover crop; gutter and gloved hands |
| car-detailing.png | Car Wash & Detailing card | Cover crop; person/car surface |
| car-servicing.png | Servicing & Repairs card | Cover crop; mechanic/engine bay |
| tyres-wheels.png | Tyres & Wheels card | Cover crop; wheel/alignment equipment |

Copy to `/public/images/home-car-business/` or the repository's existing asset convention. Do not overwrite current files. Original PNG files are included; use the existing Next/image optimisation or build pipeline to serve appropriately sized images. Do not ship all full-size PNGs eagerly. Read actual manifest dimensions and use correct sizes/aspect ratios. Lazy-load below-fold imagery. Only preload the actual hero LCP resource if measurement warrants it.

Suggested alt for the mascot: `MegaDeal's welcoming lavender elephant wearing a purple M hoodie`. Use empty alt on the decorative house/car backdrop. Category photos can have concise descriptive alt, or empty alt if their adjacent text makes them entirely redundant. They are illustrative generated scenes, not actual participating businesses or staff. Never use them as testimonial evidence or portfolio work.

All new photos, backdrop and mockup were made with the built-in image generation tool. The current mascot was retrieved and copied unchanged. The mockup is not a screenshot of working code. The separate backdrop and original mascot are intentionally layered in code to preserve the exact approved character. Reuse the existing white MegaDeal logo; the mockup logo is only a visual approximation.
