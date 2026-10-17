# Gulf Youth Sport website (gulfyouthsport.com)

Project brief for Claude Code. Read this before making changes.

## What this site is

Gulf Youth Sport (GYS) covers school and youth sport across the Gulf. Instagram (@gulfyouthsport) is where the audience is; the website is where Instagram followers land to read full articles and watch videos. The homepage replaces Linktree: the Instagram bio links straight to the homepage, and the newest article is always at the top.

## Current state

- The full site is live from `main` (it replaced the temporary holding page). It includes 977 articles imported from the old WordPress site (Aug 2016 to Oct 2026).
- Hosting: Netlify, deployed automatically from this GitHub repository on every push to `main` (pull requests get deploy previews). Run locally with `npm start` (http://localhost:8080). The full build (about 1,000 pages) takes under 10 seconds.
- Photos tab: `src/_data/zenfolio.js` reads the gallery's recent.rss at build time and shows up to six recent galleries. Only galleries whose name includes a date or year (e.g. "DASSA Golf (June 26)") are shown, which skips sub-folders like "DAY 1".
- Videos tab: `src/_data/youtube.js` reads the channel's public feed at build time (15 newest uploads, Shorts excluded). `netlify/functions/rebuild-videos.mjs` triggers a rebuild every 6 hours (refreshing videos and galleries) through a Netlify build hook stored in the `BUILD_HOOK_URL` environment variable (never commit the hook URL). `/build.json` shows when the site last built and what triggered it (`"build hook: Scheduled refresh"` for the 6-hourly job), plus story, video and gallery counts.
- Domain: gulfyouthsport.com is being transferred into Namecheap. DNS will stay at Namecheap, with records pointing to Netlify. Do not suggest moving nameservers to Netlify: the domain's email (info@gulfyouthsport.com) runs through existing MX/TXT records that must not be disturbed.

## Privacy and removal requests

- `/privacy/` (`src/privacy.njk`) and `/contact/` (`src/contact.njk`, with a `#removal` section for correction and takedown requests) are linked from the footer; the Photos page links to removal requests too.
- The site is operated by GYS Travels LLC. Name it only in the privacy policy ("Who runs this site"), nowhere else: not in the header, footer, page titles or metadata.
- Story submissions: `/submit-a-story/` (`src/submit-a-story.njk`) is a Netlify Forms form named `story-submission` (thanks page `/submit-a-story/thanks/`), linked from the homepage "Got a story?" band, the footer, the end of every article and the contact page. Netlify setup steps: `docs/admin-setup.md` section 5.
- Keep the privacy policy accurate if the site changes: it says the site has no accounts, analytics or advertising and sets no cookies of its own, and that the story form is the only form; YouTube loads only on play; gallery covers load from Zenfolio. Adding analytics, forms or new embeds means updating it (and possibly a cookie banner).
- Fonts are self-hosted in `src/assets/fonts/` (Barlow, SIL Open Font License) so visitors never contact Google Fonts. Don't add Google Fonts links back.
- Safeguarding and removal-request rules for the team are in `docs/publishing-guide.md`.

## Generator and build (Eleventy)

- Static site generator: Eleventy (11ty) 3, configured in `eleventy.config.js`. Templates are Nunjucks (`.njk`); articles are Markdown with front matter.
- Netlify build settings, all in `netlify.toml` (nothing to set in the Netlify UI): build command `npm run build`, publish directory `_site`, Node 22. Functions live in `netlify/functions/`.
- Netlify environment variable: `BUILD_HOOK_URL` (for the scheduled rebuild). Never commit its value.

## Folder structure

```
src/
  index.njk                Stories homepage (lead story, grid of six, Earlier list)
  archive.njk              /stories/ and /stories/page/N/ (24 per page)
  videos.njk, photos.njk   Videos and Photos tabs
  partners.njk             Partners tab (data: _data/partners.json; see PARTNERS.md)
  privacy.njk, contact.njk Privacy policy and contact / removal requests
  404.njk                  Custom "Out of bounds" 404 page
  redirects.njk            Builds Netlify's /_redirects file (see Redirects below)
  sitemap.njk, robots.njk  /sitemap.xml and /robots.txt
  stories/                 New stories, written through the CMS (YYYY-MM-DD-slug.md)
    stories.11tydata.js    Shared settings for every story: layout, URL, SEO fallbacks
    archive/YYYY/          The 977 imported WordPress posts (not shown in the CMS)
  images/uploads/          Images uploaded through the CMS
  images/archive/YYYY/MM/  Imported WordPress images as WebP (max 1600px wide)
  images/partners/         Partner logos (and the optional partner pack)
  _data/                   Site settings, YouTube and Zenfolio feeds, legacy redirect lists
  _includes/               Layouts (base, article) and the story tile
  admin/                   Decap CMS (config.yml, preview styles)
  assets/                  site.css and the logo
scripts/                   One-off WordPress import scripts (run locally, never on Netlify)
docs/                      Admin setup and publishing guides
```

- Story URLs are `/YYYY/MM/DD/slug/` (the old WordPress pattern), built from the story's date in Gulf time and its slug. All stories, new and imported, appear together on the homepage and archive, newest first.

## Redirects

`src/redirects.njk` generates `/_redirects` at build time:
- The 23 old WordPress pages (listed in `src/_data/legacyPages.js`) redirect to the homepage; none were kept.
- `/?p=ID` short links go to the matching article (imported articles keep their WordPress ID as `wpId`). No rule for `/?page_id=ID`: Netlify forwards query strings, so a redirect from `/` to `/` would loop; those addresses just show the homepage.
- Old WordPress category, tag, author, feed and page-N listings go to `/stories/`.
- Old image addresses (`/wp-content/uploads/...`) for imported images go to the WebP copies (`src/_data/legacyImages.json`).

## WordPress import (done October 2026)

- The export lived in `../gys-import` (outside this repo). Never commit export files, the uploads archive, extracted files or `import-reports/` (all git-ignored).
- `scripts/import-wordpress.mjs` converted the posts: suspicious-content scan, strict HTML allowlist, shortcodes and tracking code removed, YouTube kept (as youtube-nocookie embeds), other embeds turned into plain links. `scripts/import-images.mjs` extracted only the images used and converted them to WebP. Posts from 2022 onwards keep inline images; older posts keep only their featured image.
- The old site was compromised: treat anything from the old export as untrusted. Do not bring across old themes, plugins or code.
- Do not re-run `scripts/import-wordpress.mjs` over `src/stories/archive/`: imported articles have since been edited by hand (e.g. chatbot notes removed from the 7 Oct 2026 "Barcelona Bound" article), and the converter would overwrite those edits. Edit the Markdown files directly instead.

## Site structure (agreed)

Four tabs in the main navigation:

1. **Stories** (homepage): newest article first as a large lead story (image or colour tile, date, standfirst, "Read the full story" button), then a grid of the next six, then an "Earlier" list and a "Load older stories" link to the archive. Fully automatic: publishing an article puts it at the top.
2. **Videos**: latest YouTube uploads, newest first, pulled automatically from the channel's public feed (https://www.youtube.com/c/GulfYouthSport). One large latest video, then a grid of six. "Subscribe on YouTube" button.
3. **Photos**: links out to the Zenfolio gallery (https://gys001.zenfolio.com/). A large maroon panel with "Open the photo gallery" button, optionally a strip of recent gallery covers.
4. **Partners** (`/partners/`): headline sponsor, official partners and "Supported by", plus a "Partner with Gulf Youth Sport" panel. A headline sponsor credit sits in the header and a three-tier partner strip sits above the footer on every page. All partner details live in `src/_data/partners.json` (editable in the CMS under Site settings → Partners). Full details, rules and the not-yet-built premium placements: `PARTNERS.md`.

Each article also needs its own page template (headline, date, featured image, body, share links).

## Publishing workflow (agreed)

- Articles are written in Google Docs (each doc includes an SEO title, meta description, slug, categories, standfirst and Instagram brief).
- The team publishes through Decap CMS at `/admin`, which commits articles into this repository. Article fields: title, slug, date, kicker/category, standfirst, featured image (the Canva graphic), body, SEO title, meta description.
- Interns are not developers: the admin must be simple.
- Admin login: GitHub backend through Netlify's OAuth provider (each editor needs a GitHub account with Write access to the repo). Not Netlify Identity / Git Gateway, whose future is uncertain. Config in `src/admin/config.yml`; it also has an optional `imageAlt` field. Setup steps: `docs/admin-setup.md`. Team instructions: `docs/publishing-guide.md`.
- Local CMS testing: `npm start` plus `npm run cms`, then http://localhost:8080/admin/ (edits local files only).

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
- Story tiles: a story with a featured photo shows the photo (headline underneath the tile); a story without one gets a colour tile, rotating through the six colours (red, yellow, green, maroon, orange, blue), with the headline inside. Featured images must be the photo only, with no text: the team uploads text-free photos from now on.
- Imported posts from before 2026 always use colour tiles, because their featured images are Instagram graphics with the headline baked in (`photoTile` in `src/stories/stories.11tydata.js`). The 2026 imported images were cropped to the photo with `scripts/crop-featured-text.mjs`.
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
