# Gulf Youth Sport website (gulfyouthsport.com)

Project brief for Claude Code. Read this before making changes.

## What this site is

Gulf Youth Sport (GYS) covers school and youth sport across the Gulf. Instagram (@gulfyouthsport) is where the audience is; the website is where Instagram followers land to read full articles and watch videos. The homepage replaces Linktree: the Instagram bio links straight to the homepage, and the newest article is always at the top.

## Current state

- `index.html` is a temporary holding page (logo, "new website is on its way", links to Instagram, YouTube and the photo gallery). It will be replaced by the real homepage.
- Hosting: Netlify, deployed automatically from this GitHub repository on every push. Static site built with Eleventy (11ty): source in `src/`, `netlify.toml` runs `npm run build` and publishes `_site/`. Articles are Markdown files in `src/stories/`. Run locally with `npm start` (http://localhost:8080).
- Photos tab: `src/_data/zenfolio.js` reads the gallery's recent.rss at build time and shows up to six recent galleries. Only galleries whose name includes a date or year (e.g. "DASSA Golf (June 26)") are shown, which skips sub-folders like "DAY 1".
- Videos tab: `src/_data/youtube.js` reads the channel's public feed at build time (15 newest uploads, Shorts excluded). `netlify/functions/rebuild-videos.mjs` triggers a rebuild every 6 hours (refreshing videos and galleries) through a Netlify build hook stored in the `BUILD_HOOK_URL` environment variable (never commit the hook URL).
- Domain: gulfyouthsport.com is being transferred into Namecheap. DNS will stay at Namecheap, with records pointing to Netlify. Do not suggest moving nameservers to Netlify: the domain's email (info@gulfyouthsport.com) runs through existing MX/TXT records that must not be disturbed.
- The old WordPress site was taken offline after being flagged by a school group's cyber security check. Old posts and pages are being exported from WordPress (XML plus the uploads folder) and may be imported later as content only. Do not bring across old themes, plugins or code.

## Site structure (agreed)

Three tabs in the main navigation:

1. **Stories** (homepage): newest article first as a large lead story (image or colour tile, date, standfirst, "Read the full story" button), then a grid of the next six, then an "Earlier" list and a "Load older stories" link to the archive. Fully automatic: publishing an article puts it at the top.
2. **Videos**: latest YouTube uploads, newest first, pulled automatically from the channel's public feed (https://www.youtube.com/c/GulfYouthSport). One large latest video, then a grid of six. "Subscribe on YouTube" button.
3. **Photos**: links out to the Zenfolio gallery (https://gys001.zenfolio.com/). A large maroon panel with "Open the photo gallery" button, optionally a strip of recent gallery covers.

Each article also needs its own page template (headline, date, featured image, body, share links).

## Publishing workflow (agreed)

- Articles are written in Google Docs (each doc includes an SEO title, meta description, slug, categories, standfirst and Instagram brief).
- The team publishes through Decap CMS at `/admin`, which commits articles into this repository. Article fields: title, slug, date, kicker/category, standfirst, featured image (the Canva graphic), body, SEO title, meta description.
- Interns are not developers: the admin must be simple.

## Brand

Logo: `gys-logo.png` (the "GYS CIRCLE" logo: ring with "Gulf Youth Sport" and "Electrifying Youth Sport", multicolour ball). Use the GYS Sport logo, never the GYS Travel one.

Colours:

| Role | Hex |
|---|---|
| Ink / text, footer background | #1C2752 |
| Blue | #445EA8 |
| Red | #E7302A |
| Yellow | #F1D824 |
| Green | #008C58 |
| Maroon | #8E193E |
| Orange | #F28E20 |
| White background | #FFFFFF |
| Soft surface | #F3F5FA |
| Muted text | #5B6584 |

- Text on yellow and orange is ink (#1C2752); text on the other colours is white.
- Signature element: a thin six-colour stripe across the top of every page (blue, green, yellow, orange, red, maroon).
- Story tiles rotate through the six colours (red, yellow, green, maroon, orange, blue). The team likes this: keep colour tiles in the story grid even when photos are available, with photos on the lead story and video thumbnails.
- Tile shape: portrait 4:5 to match Instagram.

Type (Google Fonts):

- Headlines: Barlow Condensed, 800, italic, uppercase. Echoes the italic "Electrifying Youth Sport" slogan.
- Body and UI: Barlow, 400 to 700.
- Rounded pill buttons (min 44px tall), 6px corner radius on tiles and cards.

## Links

- Instagram: https://www.instagram.com/gulfyouthsport/
- YouTube: https://www.youtube.com/c/GulfYouthSport
- Photos: https://gys001.zenfolio.com/
- Email: info@gulfyouthsport.com

## Ground rules

- Keep it small, fast and cheap to run: static files on Netlify, no database, no paid services unless agreed.
- Mobile first: most visitors arrive from Instagram on a phone.
- Never commit passwords, API keys or tokens to this repository.
- Use real article content only; mark anything missing with a clear [placeholder].
