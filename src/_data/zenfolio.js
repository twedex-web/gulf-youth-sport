// Recently added galleries from the Gulf Youth Sport Zenfolio site, read from its public RSS feed at build time.
// The feed also lists sub-folders with bare names ("DAY 1", "SCS"). Only galleries whose name
// includes a date or year ("DASSA Golf (June 26)", "U11 BSME Green Games 2026") are shown,
// so naming galleries that way puts them on the Photos page.

const FEED_URL = "https://gys001.zenfolio.com/recent.rss";
const SHOW = 6;
// A year (2026), a short year ('26) or a month name (June).
const HAS_DATE = /\b(19|20)\d\d\b|'\d\d\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;

function decode(text) {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function pick(xml, pattern) {
  const match = xml.match(pattern);
  return match ? decode(match[1].trim()) : "";
}

export default async function () {
  try {
    const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();

    const galleries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map(([, item]) => {
        // Thumbnail URLs end in -2.jpg (400px wide); -3 and -4 are 580px and 800px versions.
        const thumb = pick(item, /<media:thumbnail url="([^"]+)"/);
        const base = thumb.replace(/-\d\.jpg$/, "");
        return {
          title: pick(item, /<title>([^<]*)<\/title>/),
          url: pick(item, /<link>([^<]+)<\/link>/),
          image: thumb ? { small: `${base}-2.jpg`, medium: `${base}-3.jpg`, large: `${base}-4.jpg` } : null,
        };
      })
      .filter((gallery) => gallery.url && gallery.image && HAS_DATE.test(gallery.title))
      .slice(0, SHOW);

    return { galleries };
  } catch (error) {
    // Never fail the whole site build because Zenfolio didn't answer: the page still links to the gallery.
    console.warn(`[zenfolio] Could not load the gallery feed: ${error.message}`);
    return { galleries: [] };
  }
}
