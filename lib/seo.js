// Search-engine helpers shared by the story data file, the templates and eleventy.config.js.
import fs from "node:fs";
import path from "node:path";

const SITE_SUFFIX = " | Gulf Youth Sport";
// Google shows roughly 60 characters of a title and 155 to 160 of a description.
const MAX_TITLE = 65;
const MAX_DESCRIPTION = 158;

// Turns a Markdown or HTML article body into plain text.
export function plainText(text) {
  return String(text || "")
    .replace(/<(script|style|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/[*_>`]+/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/\s+/g, " ")
    .trim();
}

// Shortens text to fit a search result, cutting at a word boundary.
export function shorten(text, max = MAX_DESCRIPTION) {
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}

// "Headline | Gulf Youth Sport", dropping the site name when it would push the title past what
// Google shows. Stories that share a headline (e.g. weekly features) get their date added.
export function storyTitle(title, dateLabel, duplicate) {
  const base = duplicate ? `${title}, ${dateLabel}` : title;
  return (base + SITE_SUFFIX).length <= MAX_TITLE ? base + SITE_SUFFIX : base;
}

// Headlines used by more than one story, lower-cased. Read once per build from the front matter.
let duplicates;
export function duplicateTitles(dir = "src/stories") {
  if (duplicates) return duplicates;
  const counts = new Map();
  (function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith(".md")) {
        const match = fs.readFileSync(file, "utf8").match(/^title:\s*["']?(.*?)["']?\s*$/m);
        if (match) {
          const key = match[1].trim().toLowerCase();
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
    }
  })(dir);
  duplicates = new Set([...counts].filter(([, n]) => n > 1).map(([key]) => key));
  return duplicates;
}
