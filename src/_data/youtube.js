// Latest uploads from the Gulf Youth Sport YouTube channel, read from its public feed at build time.
// The feed lists the 15 newest uploads. Netlify rebuilds the site on a schedule
// (netlify/functions/rebuild-videos.mjs) so new videos appear without anyone publishing.
//
// If the feed fails (YouTube sometimes returns 404 for a channel's feed for days), the page
// keeps the last list that loaded instead of going empty:
//   1. the copy saved by the last successful build (node_modules/.cache, which Netlify keeps between builds)
//   2. failing that, the copy committed in lib/youtube-seed.json
// /build.json shows which one was used ("videosSource").

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CHANNEL_ID = "UC2rpm9JTyGuyiyMMjIauZRA";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const CACHE_FILE = path.join(process.cwd(), "node_modules/.cache/gys/youtube.json");
const SEED_FILE = path.join(process.cwd(), "lib/youtube-seed.json");

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

async function loadFeed() {
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
        description: pick(entry, /<media:description>([^<]*)<\/media:description>/),
      };
    })
    // Shorts are vertical clips: they don't suit the 16:9 layout.
    .filter((video) => video.id && !video.url.includes("/shorts/"))
    .sort((a, b) => b.date - a.date);

  // A feed with no videos at all is treated as a failure, so it never wipes the saved list.
  if (!videos.length) throw new Error("feed had no videos");
  return videos;
}

// Reads a saved list (dates are stored as text, so turn them back into dates).
async function loadSaved(file) {
  const saved = JSON.parse(await readFile(file, "utf8"));
  const videos = (saved.videos || [])
    .map((video) => ({ ...video, date: new Date(video.date) }))
    .filter((video) => video.id && !Number.isNaN(video.date.getTime()));
  if (!videos.length) throw new Error("no videos saved");
  return videos;
}

export default async function () {
  try {
    const videos = await loadFeed();
    try {
      await mkdir(path.dirname(CACHE_FILE), { recursive: true });
      await writeFile(CACHE_FILE, JSON.stringify({ savedAt: new Date().toISOString(), videos }, null, 2));
    } catch (error) {
      console.warn(`[youtube] Could not save the video list for next time: ${error.message}`);
    }
    return { channelId: CHANNEL_ID, source: "feed", videos };
  } catch (error) {
    // Never fail the whole site build because YouTube didn't answer.
    console.warn(`[youtube] Could not load the channel feed: ${error.message}`);
  }

  for (const [source, file] of [["cache", CACHE_FILE], ["seed", SEED_FILE]]) {
    try {
      const videos = await loadSaved(file);
      console.warn(`[youtube] Using the saved video list (${source}): ${videos.length} videos`);
      return { channelId: CHANNEL_ID, source, videos };
    } catch {
      // Try the next copy.
    }
  }

  // Nothing saved either: the page falls back to a link to the channel.
  return { channelId: CHANNEL_ID, source: "none", videos: [] };
}
