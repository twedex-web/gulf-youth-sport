# Partners and sponsors (Gulf Youth Sport)

## Partner tiers (agreed)

| Tier | Partner | Role | Instagram | Logo |
|---|---|---|---|---|
| 1. Headline sponsor | TWEDEX | Headline Sponsor (Travel & Tours Partner) | @twedex | `twedex.webp` |
| 2. Official partners | World School Games (WSG) | Official Events Partner | @wsgevents | `world-school-games.webp` (undated Event Series logo) |
| 2. Official partners | J20 Sports | Official Kit Partner | @j20sportsofficial | `j20-sports.webp` (supplied on white; white made transparent) |
| 3. Supported by | The Overlord Academy | Partner | @theoverlordacademy | `the-overlord-academy.webp` (supplied white-on-black; used as a black-on-transparent version of the same artwork) |
| 3. Supported by | Edfundo | Partner | @edfundo | `edfundo.webp` |
| 3. Supported by | Dubai Marlins Aquatics | Partner | @dubaimarlinsaq | `dubai-marlins-aquatics.webp` (off-white background removed; links to Instagram until a website is supplied) |

Order within each tier is as listed. Websites: twedex.com, wsgevents.com, j20sports.com, theoverlordacademy.com, edfundo.com (note: https://www.edfundo.com fails, so the link uses https://edfundo.com).

## How it's built

- **One data file:** `src/_data/partners.json`. Each partner has `name`, `tier` (`headline`, `official` or `supported`), `role`, `instagram` (handle without @), `website`, `logo`, `accent` (blue, green, red, maroon, orange or yellow) and `description`. There is also an optional `partnerPack` (a PDF link). The header credit, the partner strip and the Partners page all read from it, so adding, removing or reordering a partner is one edit.
- **Editable in the CMS:** Site settings → Partners in `/admin`. Drag to reorder. Logos and the partner pack upload to `src/images/partners/`.
- **Links:** the logo and name go to the partner's website (or Instagram if no website is set). On the Partners page the @handle is a separate link to their Instagram; in the strip the handle appears in the logo's hover label. All partner links carry `rel="sponsored noopener"`, as Google asks for paid placements.
- **WSG brand rules** (WSG Brand Guidelines 2025/26): never stretch, crop, recolour, rotate or add effects to their logo; keep clear space around it equal to the size of its globe; don't shrink it until the text is illegible. Full asset suite: media@wsgevents.com.
- **Logos:** transparent PNG, SVG or WebP in `src/images/partners/`, with the partner's name as alt text. A partner without a logo shows their name in a dashed placeholder box, never a broken image. The supplied PNGs were converted to WebP (220 KB down to 55 KB) because the strip loads on every page.
- **Templates:**
  - Header credit: `src/_includes/layouts/base.njk` (first partner in the `headline` tier). Logo only: the "Headline sponsor" wording was dropped from view after team feedback and lives in the link's hover and screen-reader label.
  - Partner strip: `src/_includes/partner-strip.njk`, included above the footer in the base layout, so it appears on every page.
  - Partners page: `src/partners.njk` at `/partners/`, the fourth tab in the main navigation.
  - Logo or placeholder: `src/_includes/partner-logo.njk`.
  - Filters `partnerTier`, `partnerUrl` and `partnerHandle` are in `eleventy.config.js`.
- **Styles:** the "Partners" section at the end of `src/assets/site.css`. The main navigation keeps the site's own style (condensed italic tabs with the red underline) rather than the pill tabs in the original mock.
- **Mobile:** below 1080px the header becomes two rows (logo and sponsor credit, then the four tabs). Below 360px the "Headline sponsor" label hides and only the logo shows. The strip's tiers stack vertically below 600px.

## Rules

- Keep sponsors visually calm: no banner ads, no auto-rotating carousels, no pop-ups. Logos sit on white or the soft surface colour.
- Sponsored content is always labelled as such and never disguised as a story.

## Optional premium placements (not built yet, off by default)

These were agreed in principle but deliberately left out. How they would plug in:

1. **Sponsored tile in the homepage story grid.**
   - Add to `partners.json` a top-level `sponsoredTile` object: `{ "enabled": false, "partner": "TWEDEX", "position": 3, "image": "", "headline": "", "url": "" }`, plus matching fields in the CMS settings file.
   - In `src/index.njk`, inside the "More stories" loop, insert the tile at `position` when `enabled` is true. It shows one fewer story in that grid so the grid stays at six.
   - Add `src/_includes/sponsored-tile.njk`: same 4:5 shape as a story tile, white background, 2px ink border, a visible label with the partner's role (e.g. "Headline Sponsor"), and `rel="sponsored"` on the link.
2. **"Presented by [partner]" on a category, plus a credit box at the end of its articles.**
   - Add to each partner an optional `presents` list of categories, e.g. `["DASSA"]`.
   - In `src/_includes/layouts/article.njk`, after the article body: when the story's `kicker` or `categories` match a partner's `presents`, show a small box: "[Category] coverage presented by [logo + name]", linking to the partner.
   - The site has no category pages yet. If they're added (for example `/stories/dassa/`), show the same "Presented by" credit under the page title.
