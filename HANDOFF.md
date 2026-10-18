# Handoff: work in progress

Articles and tasks that are started but not finished. Nothing in this file is published: the site only builds pages from `src/`.

## JESS Edinburgh rugby tour article (draft, not published)

Drafted 16 October 2026 from the TWEDEX trip itinerary (Google Drive) and the TWEDEX live blog (live.twedex.com). Anything not confirmed is marked [placeholder].

### Still needed before publishing

1. **Scores for Melrose and Fettes College.** The live blog confirms both were wins but gives no score. If nobody has them, reword those two sentences without scores and remove the placeholders.
2. **A quote** from Alex Glashan (trip leader, PE teacher) or the squad. If none comes, drop that paragraph.
3. **A text-free featured photo.** The live blog has tour photos: get the OK before using one, or ask the school to send one.
4. **Check the itinerary-only items.** The itinerary lists a pool recovery session and a "Fuelling an Elite Athlete" seminar, but the live blog doesn't mention either. They are left out unless someone confirms they happened.

### Notes

- No pupils are named: only the staff trip leader. Naming players needs consent first (see `docs/publishing-guide.md`).
- "Melrose, the birthplace of rugby sevens" is background knowledge (the first sevens tournament was held there in 1883), not from the trip material.
- Only the itinerary, the booking form and the live blog were read. The pupils' traveller forms and invitation letters were not opened. Keep the trip price out of the article.

### Publishing

Save as `src/stories/YYYY-MM-DD-jess-arabian-ranches-edinburgh-rugby-tour-2026.md` (or add it through the CMS) with:

- **Headline:** Unbeaten in Scotland: JESS Arabian Ranches Sweep Edinburgh Rugby Tour
- **Slug:** jess-arabian-ranches-edinburgh-rugby-tour-2026
- **Category (kicker):** Rugby. Categories: Rugby, Sports Travel.
- **Standfirst:** JESS Arabian Ranches took a 26-strong rugby squad to Edinburgh with TWEDEX and came home unbeaten, with wins over The Edinburgh Academy, Melrose and Fettes College.
- **Meta description** (149 characters): JESS Arabian Ranches went unbeaten on their Edinburgh rugby tour with TWEDEX, beating The Edinburgh Academy 40-7, Melrose and Fettes College.
- **Featured image:** [placeholder: text-free tour photo]

### Article

JESS Arabian Ranches have returned from Scotland with a perfect record. Over five days in October, the Dubai school's rugby squad took on three of Scottish rugby's most storied names, The Edinburgh Academy, Melrose Rugby Club and Fettes College, and won all three.

The Edinburgh Rugby Challenge Tour, organised by TWEDEX, saw 26 players and three staff, led by PE teacher Alex Glashan, fly from Dubai to Glasgow on 7 October before transferring to their base in Edinburgh. The first evening was spent finding their feet on Princes Street, followed by a much-requested team dinner at Nando's.

#### A Winning Start at The Edinburgh Academy

The squad's first full day began on the grass pitches of The Edinburgh Academy. Founded in 1824, it is one of Scotland's oldest independent schools and has a long, proud rugby tradition.

After a morning session split between backs and forwards, and lunch at the Raeburn, the team returned to face the Academy in blustery conditions. JESS delivered a convincing performance, winning 40–7 to open the tour in style.

#### Into the Borders at Melrose

Day three mixed culture with competition. The squad explored Edinburgh Castle and the Royal Mile in the morning and had lunch at the University of Edinburgh. Then they headed south to the Scottish Borders to face Melrose Rugby Club, the birthplace of rugby sevens.

On Melrose's 4G pitch, in front of a strong crowd, JESS again proved too strong, winning [placeholder: score]. The visit ended with the two sides exchanging commemorative plaques, a fitting close to a day of rugby and cultural exchange.

#### A Hard-Fought Finish at Fettes

The final fixture took the squad to Fettes College, founded in 1870 and known for its striking architecture and 100-acre campus. It proved the toughest test of the tour, with both sides giving everything in a highly competitive game. JESS rose to the occasion once more, winning [placeholder: score] to complete a clean sweep.

[placeholder: quote from Alex Glashan or a player on the tour, e.g. what the squad learned from Scottish rugby]

Three fixtures, three wins and a week of Scottish hospitality: a tour the JESS Arabian Ranches squad will not forget in a hurry.

(In the story file, the `####` subheadings above become `##`.)

### Instagram brief

- **Carousel (4 slides):**
  1. "3 GAMES. 3 WINS. UNBEATEN IN SCOTLAND 🏴󠁧󠁢󠁳󠁣󠁴󠁿🏉"
  2. Edinburgh Academy, 40–7
  3. Melrose, the home of sevens
  4. Fettes College, completing the clean sweep
- **Caption:** UNBEATEN IN SCOTLAND! 🏴󠁧󠁢󠁳󠁣󠁴󠁿🏉 JESS Arabian Ranches took on The Edinburgh Academy, Melrose RC and Fettes College on their Edinburgh Rugby Challenge Tour with @twedex, and won the lot! 💪 Full story via the link in our bio. #GulfYouthSport #JESSDubai #SchoolRugby #RugbyTour #Edinburgh #TWEDEX
- **Tag:** @twedex, plus JESS's handle if they have one.

## Other open items

- **Netlify Forms:** turn on form detection, redeploy, and add an email notification to info@gulfyouthsport.com (`docs/admin-setup.md` section 5).
- **CMS logins:** OAuth app and editor access for /admin, if not done yet (`docs/admin-setup.md`).
- **Google Search Console:** verify gulfyouthsport.com with a TXT record in Namecheap (leave the MX/TXT email records alone) and submit `https://gulfyouthsport.com/sitemap.xml`.
- **Partners:** Dubai Marlins Aquatics has no website yet (links to Instagram); check the ICE Education Instagram handle.
- **Scheduled:** the WSG Football Cup article goes live at about 9:01am UAE on Friday 23 October 2026.
