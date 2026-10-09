// Latest uploads from the Gulf Youth Sport YouTube channel, read from its public feed at build time.
// The feed lists the 15 newest uploads. Netlify rebuilds the site on a schedule
// (netlify/functions/rebuild-videos.mjs) so new videos appear without anyone publishing.

const CHANNEL_ID = "UC2rpm9JTyGuyiyMMjIauZRA";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function decode(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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

    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
      .map(([, entry]) => {
        const id = pick(entry, /<yt:videoId>([^<]+)<\/yt:videoId>/);
        return {
          id,
          title: pick(entry, /<title>([^<]*)<\/title>/),
          url: pick(entry, /<link rel="alternate" href="([^"]+)"/),
          date: new Date(pick(entry, /<published>([^<]+)<\/published>/)),
        };
      })
      // Shorts are vertical clips: they don't suit the 16:9 layout.
      .filter((video) => video.id && !video.url.includes("/shorts/"))
      .sort((a, b) => b.date - a.date);

    return { channelId: CHANNEL_ID, videos };
  } catch (error) {
    // Never fail the whole site build because YouTube didn't answer: the page falls back to a link.
    console.warn(`[youtube] Could not load the channel feed: ${error.message}`);
    return { channelId: CHANNEL_ID, videos: [] };
  }
}
