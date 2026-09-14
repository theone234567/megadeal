# Mascot & brand artwork

Drop the supplied PNGs in this folder using **exactly** these filenames.
The coming-soon page looks for them at build time
(`lib/megadealAssets.ts`) and uses them automatically on the next deploy.

| Filename                  | What it is                              | Used on                          |
| ------------------------- | --------------------------------------- | -------------------------------- |
| `megadeal-logo.png`       | Wordmark + elephant lockup              | Header                           |
| `hero-auckland-card.png`  | Auckland skyline, tilted photo card     | Hero, right side                 |
| `mascot-big-deals.png`    | Mascot holding "BIG DEALS AHEAD!" tag   | Hero, overlapping the card       |
| `mascot-wave.png`         | Waving half-body mascot                 | Launch-updates signup section    |
| `mascot-jump.png`         | Full-body jumping mascot                | Business offer section           |

`asset-pack-guide.png` is reference material only — it does not need to be
committed, and nothing loads it.

## Nothing breaks while these are missing

Every lookup returns `null` when a file isn't here, and each spot falls
back to the vector artwork the site already ships (`components/Logo.tsx`,
`components/ElephantMascot.tsx`, `AucklandSkylineArt`). The page is
complete either way — it just gets the illustrated versions once these
land. That avoids putting broken-image glyphs on the live signup page,
and means no code change is needed when you add them.

## Adding them from a phone or browser

GitHub can do this without a computer:

1. Open this folder on github.com.
2. **Add file → Upload files**.
3. Select the PNGs, named exactly as above, and commit.

Cloudflare rebuilds on push, so they appear on the site a few minutes
later. Confirm which build is live at `/api/version`.

## Format notes

PNG is what the pack was originally delivered as, but the files actually
committed here are `.webp` — the PNGs were 8-11x larger for the same look
(a 2MB hero photo alone) and were the slowest thing on the page to load.
Resolution order is PNG, then `.webp`, then `.avif`, so dropping in a new
PNG under one of the names below still works and simply takes priority
over the existing `.webp` until that's cleaned up too. Keep transparent
backgrounds on the mascots: they sit over a purple gradient and a white
box behind them would show.
