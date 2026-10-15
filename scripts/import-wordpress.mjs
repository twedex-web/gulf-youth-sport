// One-off converter: old WordPress posts → Markdown stories in src/stories/archive/YYYY/.
//
//   node scripts/import-wordpress.mjs [path-to-gys-import]
//
// Runs on a developer's computer only, never on Netlify. The old site was compromised,
// so every post's HTML is treated as untrusted: it is scanned for suspicious content,
// then rebuilt from a strict allowlist of tags before being turned into Markdown.
// Reports go to import-reports/ (git-ignored). Images are handled separately (Stage 3).

import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import sanitizeHtml from "sanitize-html";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const IMPORT_DIR = path.resolve(process.argv[2] || "../gys-import");
const POSTS_XML = path.join(IMPORT_DIR, "gys-posts-2026-10-09.xml");
const INDEX_CSV = path.join(IMPORT_DIR, "gys-posts-index.csv");
const OUT_DIR = path.resolve("src/stories/archive");
const REPORT_DIR = path.resolve("import-reports");
const SITE_HOSTS = new Set(["gulfyouthsport.com", "www.gulfyouthsport.com", "gys.wbdv.uk"]);

// Categories that say nothing to a reader: never used as the kicker if a better one exists.
const GENERIC_CATEGORIES = new Set(["news-features", "gys", "uncategorised"]);

const SPAM_WORDS = /\b(casino|poker|slots?|betting|bet365|sportsbook|gambl\w*|viagra|cialis|pharma\w*|pills?|loans?|payday|crypto\w*|bitcoin|forex|porn\w*|xxx|escorts?|hookup|dating|essay\w*|replica|backlinks?|seo services|cbd|vape|weight ?loss|keto|diet pills)\b/i;
const HIDDEN_STYLE = /(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?![.\d]*[1-9])|opacity\s*:\s*0(?![.\d]*[1-9])|(?<![\w-])(left|top|text-indent)\s*:\s*-\d{3,}|(?<![\w-])(height|width)\s*:\s*[01]px)/i;
const FOREIGN_SCRIPT = /[\u3040-\u30ff\u4e00-\u9fff\u0400-\u04ff]/;

// ---------------------------------------------------------------------------------------------
// Small helpers

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", pound: "£", euro: "€", eacute: "é" };

function decodeEntities(text) {
  return String(text ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function text(value) {
  return String(value ?? "").trim();
}

function meta(item, key) {
  const entry = (item["wp:postmeta"] || []).find((m) => m["wp:meta_key"] === key);
  return entry ? text(entry["wp:meta_value"]) : "";
}

function hostOf(url) {
  try {
    return new URL(url, "https://gulfyouthsport.com").hostname.toLowerCase();
  } catch {
    return "";
  }
}

function youtubeId(url) {
  const match = decodeEntities(url).trim().match(
    /^(?:https?:)?\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

// Yoast titles and descriptions can contain template variables such as %%title%% %%sep%% %%sitename%%.
function expandYoast(value, title) {
  return decodeEntities(value)
    .replace(/%%title%%/g, title)
    .replace(/%%sep%%/g, "|")
    .replace(/%%sitename%%/g, "Gulf Youth Sport")
    .replace(/%%[a-z_]+%%/g, "")
    .replace(/\s+\|\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function readCsv(file) {
  const rows = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { cells.push(cell); cell = ""; }
      else cell += c;
    }
    cells.push(cell);
    rows.push({ id: cells[0], date: cells[1], title: cells[2], url: cells[3] });
  }
  return rows;
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------------------------------------------------------------------------------------------
// Suspicious content scan: runs on the raw HTML before anything is removed.

function scan(raw, post) {
  const findings = [];
  const add = (type, detail) => findings.push({ type, detail: detail.replace(/\s+/g, " ").slice(0, 200) });

  for (const m of raw.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) add("script", m[0]);
  for (const m of raw.matchAll(/<iframe\b[^>]*src=["']?([^"'\s>]+)/gi)) {
    if (!youtubeId(m[1])) add("iframe (not YouTube)", m[1]);
  }
  for (const m of raw.matchAll(/<(style|object|embed|form|input|meta|link|base)\b[^>]*>/gi)) add(`<${m[1].toLowerCase()}> tag`, m[0]);
  for (const m of raw.matchAll(/\son[a-z]+\s*=\s*["'][^"']*["']/gi)) add("event handler attribute", m[0]);
  for (const m of raw.matchAll(/(javascript:|vbscript:|data:text\/html|eval\(|atob\(|document\.write|base64,)/gi)) add("script-like code", m[0]);
  for (const m of raw.matchAll(/<[a-z]+\b[^>]*style\s*=\s*["']([^"']*)["'][^>]*>/gi)) {
    if (HIDDEN_STYLE.test(m[1])) add("hidden text styling", m[0]);
  }
  if (FOREIGN_SCRIPT.test(raw)) {
    const sample = raw.match(new RegExp(`.{0,40}${FOREIGN_SCRIPT.source}.{0,40}`))?.[0] || "";
    add("Japanese/Chinese/Cyrillic text (common in SEO spam hacks)", sample);
  }
  for (const m of raw.matchAll(/<a\b[^>]*href=["']?([^"'\s>]+)[^>]*>([\s\S]*?)<\/a>/gi)) {
    const anchor = m[2].replace(/<[^>]+>/g, "");
    if (SPAM_WORDS.test(m[1]) || SPAM_WORDS.test(anchor)) add("spam-like link", `${anchor.trim()} → ${m[1]}`);
  }
  if (SPAM_WORDS.test(post.title)) add("spam-like word in title", post.title);
  for (const m of raw.matchAll(/href=["']?(https?:\/\/(?:bit\.ly|t\.co|mrqz\.me|tinyurl\.com|ow\.ly)\/[^"'\s>]*)/gi)) add("link shortener (destination hidden)", m[1]);
  for (const m of raw.matchAll(/<img\b[^>]*src=["']?(https?:\/\/[^"'\s>]+)/gi)) {
    if (!SITE_HOSTS.has(hostOf(m[1]))) add("image hosted on another site", m[1]);
  }
  return findings;
}

// ---------------------------------------------------------------------------------------------
// Shortcodes (WordPress core and WPBakery page builder)

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["\u201d\u2033]([^"\u201d\u2033]*)["\u201d\u2033]`));
  return m ? m[1] : "";
}

function convertShortcodes(html, ctx) {
  const embeds = ctx.embeds;
  const embed = (url, source) => {
    const id = youtubeId(url);
    if (id) {
      embeds.push(id);
      return `\n\n<p>YTEMBED${String(embeds.length - 1).padStart(4, "0")}</p>\n\n`;
    }
    ctx.removed.push(`${source}: ${url}`);
    return "";
  };
  const images = (ids) =>
    ids
      .split(",")
      .map((id) => ctx.attachments.get(id.trim()))
      .filter(Boolean)
      .map((a) => `<p><img src="${a.url}" alt="${(a.alt || "").replace(/"/g, "&quot;")}"></p>`)
      .join("\n");

  return html
    // [caption ...]<img ...> Caption text[/caption]
    .replace(/\[caption\b[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (_, inner) => {
      const img = inner.match(/<img\b[^>]*>/i)?.[0] || "";
      const caption = inner.replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/i, "").replace(/<img\b[^>]*>/i, "").trim();
      return `\n\n<figure>${img}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>\n\n`;
    })
    .replace(/\[embed\b[^\]]*\]([\s\S]*?)\[\/embed\]/gi, (_, url) => embed(url, "[embed]"))
    .replace(/\[vc_video\b([^\]]*)\]/gi, (_, attrs) => embed(attr(attrs, "link"), "[vc_video]"))
    .replace(/\[video\b([^\]]*)\]([\s\S]*?\[\/video\])?/gi, (_, attrs) => {
      const src = attr(attrs, "mp4") || attr(attrs, "src") || attr(attrs, "webm") || "(no source)";
      return embed(src, "self-hosted [video]");
    })
    .replace(/\[audio\b[^\]]*\]([\s\S]*?\[\/audio\])?/gi, (m) => { ctx.removed.push(`[audio]: ${m.slice(0, 120)}`); return ""; })
    .replace(/\[gallery\b([^\]]*)\]/gi, (_, attrs) => images(attr(attrs, "ids")))
    .replace(/\[vc_(?:gallery|images_carousel)\b([^\]]*)\]/gi, (_, attrs) => images(attr(attrs, "images")))
    .replace(/\[vc_single_image\b([^\]]*)\]/gi, (_, attrs) => images(attr(attrs, "image")))
    .replace(/\[vc_btn\b([^\]]*)\]/gi, (_, attrs) => {
      const link = decodeURIComponent((attr(attrs, "link").match(/url:([^|]*)/) || [])[1] || "");
      const label = attr(attrs, "title") || link;
      return link ? `\n\n<p><a href="${link}">${label}</a></p>\n\n` : "";
    })
    // Any other page-builder or plugin shortcode: drop the tag, keep the text inside it.
    .replace(/\[\/?(vc_[a-z_]+|ultimate_[a-z_]+|divider|row|column|one_half|one_third|two_third|fusion_[a-z_]+|et_pb_[a-z_]+|su_[a-z_]+|contact-form-7|wpforms|ninja_form|instagram-feed|custom-facebook-feed)\b[^\]]*\]/gi, "")
    // WordPress turns a YouTube link on its own line into a player: keep that behaviour.
    .replace(/^\s*(https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\/\S+)\s*$/gim, (_, url) => embed(url, "bare video link"));
}

// ---------------------------------------------------------------------------------------------
// Third-party embeds. Their scripts and iframes are never kept. YouTube becomes our own player;
// everything else becomes a plain link to the same content, so nothing readers need is lost.

function linkParagraph(href, label) {
  return `\n\n<p><a href="${href.replace(/"/g, "&quot;")}">${label}</a></p>\n\n`;
}

function convertEmbeds(html, ctx) {
  return html
    .replace(/<blockquote\b[^>]*class=["'][^"']*instagram-media[^"']*["'][^>]*>[\s\S]*?<\/blockquote>/gi, (block) => {
      const url = decodeEntities(block.match(/data-instgrm-permalink=["']([^"']+)/i)?.[1] || block.match(/href=["'](https:\/\/www\.instagram\.com\/[^"']+)/i)?.[1] || "");
      ctx.replaced.push(`Instagram embed → link: ${url}`);
      return url ? linkParagraph(url.split("?")[0], "View this post on Instagram") : "";
    })
    .replace(/<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>/gi, (_, rawSrc) => {
      const src = decodeEntities(rawSrc);
      const yt = youtubeId(src);
      if (yt) {
        ctx.embeds.push(yt);
        return `\n\n<p>YTEMBED${String(ctx.embeds.length - 1).padStart(4, "0")}</p>\n\n`;
      }
      let href = "";
      let label = "";
      if (/facebook\.com\/plugins\/video/i.test(src)) {
        href = new URL(src).searchParams.get("href") || "";
        label = "Watch this video on Facebook";
      } else if (/player\.vimeo\.com\/video\/(\d+)/i.test(src)) {
        href = `https://vimeo.com/${src.match(/player\.vimeo\.com\/video\/(\d+)/i)[1]}`;
        label = "Watch this video on Vimeo";
      } else if (/docs\.google\.com\/forms\//i.test(src)) {
        href = src.replace(/[?&]embedded=true/, "");
        label = "Open the form";
      }
      ctx.replaced.push(href ? `iframe → link: ${href}` : `iframe removed: ${src}`);
      return href ? linkParagraph(href, label) : "";
    });
}

// ---------------------------------------------------------------------------------------------
// Links: tracking parameters are stripped; tracking redirects, misspelt domains, dead shorteners
// and placeholder links lose the link (the text stays) and are logged for review.

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|dclid|mc_cid|mc_eid|igshid|igsh|si|_hsenc|_hsmi)$/i;

function cleanHref(href, ctx) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  const host = url.hostname.toLowerCase();
  const drop = (reason) => {
    ctx.droppedLinks.push(`${reason}: ${href}`);
    return null;
  };

  if (!host.includes(".")) return drop("malformed address");
  if (host.endsWith("yamm-track.appspot.com")) return drop("email tracking redirect");
  if (host.endsWith("mimecast.com")) return drop("email security redirect");
  if (host === "facbook.com" || host === "www.facbook.com") {
    // Misspelling in the old posts (approved fix): point to the real Facebook.
    url.hostname = "www.facebook.com";
    url.protocol = "https:";
    ctx.replaced.push(`misspelt domain corrected → ${url}`);
  }
  if (host === "goo.gl" || host.endsWith(".page.link")) return drop("dead link shortener (service closed by Google in 2025)");
  if (/^(www\.)?google\.[a-z.]+$/.test(host) && url.pathname === "/search") {
    const q = url.searchParams.get("q") || "";
    if (/^https?:\/\//.test(q)) return cleanHref(q, ctx);
    return drop("placeholder search link");
  }

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.hash = url.hash === "#_blank" ? "" : url.hash;
  return url.toString();
}

// ---------------------------------------------------------------------------------------------
// WordPress stores paragraphs as blank lines, not <p> tags (its "wpautop" adds them on display).

const BLOCK_START = /^<(p|h[1-6]|ul|ol|li|blockquote|figure|table|thead|tbody|tr|div|hr|pre|section|article)\b/i;

function autop(html) {
  return html
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => (BLOCK_START.test(block) ? block : `<p>${block.replace(/\n/g, "<br>\n")}</p>`))
    .join("\n\n");
}

// ---------------------------------------------------------------------------------------------
// Allowlist sanitising: anything not listed here is removed.

function sanitise(html, ctx) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "a", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td", "hr"],
    allowedAttributes: { a: ["href"], img: ["src", "alt"], th: ["colspan", "rowspan"], td: ["colspan", "rowspan"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "form", "select", "button"],
    transformTags: {
      h1: "h2", h5: "h4", h6: "h4", b: "strong", i: "em",
      a: (tagName, attribs) => {
        const raw = decodeEntities((attribs.href || "").trim());
        const href = /^https?:/i.test(raw) ? cleanHref(raw, ctx) : raw;
        // An unknown tag name is removed by the allowlist, leaving just the link text.
        if (href === null) return { tagName: "unwrap", attribs: {} };
        const host = hostOf(href);
        if (href && host && !SITE_HOSTS.has(host) && /^https?:/i.test(href)) ctx.links.add(host);
        // Links to old articles on this site become relative, so they keep working.
        if (SITE_HOSTS.has(host)) {
          const p = new URL(href, "https://gulfyouthsport.com").pathname;
          return { tagName, attribs: { href: p } };
        }
        return { tagName, attribs: { href } };
      },
    },
    exclusiveFilter: (frame) =>
      // Remove empty paragraphs and links left over after cleaning.
      (["p", "a", "strong", "em"].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren?.length && !/<img/i.test(frame.text)) ||
      (frame.tag === "img" && !/^https?:\/\/[^\s<>"]+$/i.test(frame.attribs.src || "")),
  });
}

// ---------------------------------------------------------------------------------------------
// HTML → Markdown

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", emDelimiter: "_", codeBlockStyle: "fenced" });
turndown.use(gfm);
// Figures (image + caption) stay as HTML: Markdown has no caption syntax.
turndown.keep(["figure"]);

function youtubeEmbed(id) {
  return `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}

// ---------------------------------------------------------------------------------------------

function yamlString(value) {
  return JSON.stringify(value);
}

function frontMatter(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) continue;
    if (Array.isArray(value)) lines.push(`${key}: [${value.map(yamlString).join(", ")}]`);
    else if (typeof value === "number") lines.push(`${key}: ${value}`);
    else lines.push(`${key}: ${key === "date" ? value : yamlString(value)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function firstParagraphText(html) {
  const p = html.match(/<p>([\s\S]*?)<\/p>/i);
  if (!p) return "";
  const plain = decodeEntities(p[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  if (plain.length <= 220) return plain;
  const cut = plain.slice(0, 220);
  const sentenceEnd = cut.lastIndexOf(". ");
  return sentenceEnd > 80 ? cut.slice(0, sentenceEnd + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function main() {
  const xml = fs.readFileSync(POSTS_XML, "utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    processEntities: false,
    isArray: (name) => ["item", "category", "wp:postmeta"].includes(name),
  });
  const items = parser.parse(xml).rss.channel.item;

  // Attachments: id → file in the uploads folder, public URL and alt text.
  const attachments = new Map();
  for (const item of items.filter((i) => i["wp:post_type"] === "attachment")) {
    const metadata = meta(item, "_wp_attachment_metadata");
    attachments.set(text(item["wp:post_id"]), {
      id: text(item["wp:post_id"]),
      file: meta(item, "_wp_attached_file"),
      url: text(item["wp:attachment_url"]),
      alt: decodeEntities(meta(item, "_wp_attachment_image_alt")),
      // WordPress 5.3+ keeps the untouched upload as "original_image" when it makes a "-scaled" copy.
      original: (metadata.match(/s:14:"original_image";s:\d+:"([^"]+)"/) || [])[1] || "",
    });
  }

  const posts = items.filter((i) => i["wp:post_type"] === "post");
  const published = posts.filter((i) => i["wp:status"] === "publish");
  const skipped = posts.filter((i) => i["wp:status"] !== "publish");

  const index = new Map(readCsv(INDEX_CSV).map((row) => [row.id, row]));
  const results = [];
  const failures = [];
  const suspicious = [];
  const domainPosts = new Map();
  const imageManifest = [];

  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  for (const item of published) {
    const id = text(item["wp:post_id"]);
    const title = decodeEntities(text(item.title)).replace(/\s+/g, " ");
    const slug = text(item["wp:post_name"]);
    const postDate = text(item["wp:post_date"]); // site-local time, as used in the old URLs
    const [day, time] = postDate.split(" ");
    const [year, month, date] = day.split("-");
    const url = `https://gulfyouthsport.com/${year}/${month}/${date}/${slug}/`;
    const raw = String(item["content:encoded"] ?? "");

    try {
      if (!raw.trim()) throw new Error("Post has no content");
      if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Unusual slug: ${slug}`);

      const findings = scan(raw, { title });
      if (findings.length) suspicious.push({ id, title, url, findings });

      const ctx = { embeds: [], removed: [], replaced: [], droppedLinks: [], links: new Set(), attachments };
      const html = sanitise(autop(convertShortcodes(convertEmbeds(raw, ctx), ctx)), ctx)
        .replace(/(<br\s*\/?>\s*){2,}/gi, "<br>")
        .replace(/<p>\s*<br\s*\/?>/gi, "<p>")
        .replace(/<br\s*\/?>\s*<\/p>/gi, "</p>")
        .replace(/<p>\s*<\/p>/gi, "");
      for (const host of ctx.links) {
        if (!domainPosts.has(host)) domainPosts.set(host, []);
        domainPosts.get(host).push(url);
      }

      let body = turndown.turndown(html).replace(/\n{3,}/g, "\n\n").trim();
      body = body.replace(/^YTEMBED(\d{4})$/gm, (_, n) => youtubeEmbed(ctx.embeds[Number(n)]));
      // The misspelt address also appears as visible link text (approved fix).
      body = body.replace(/\bfacbook\.com/gi, "facebook.com");
      if (!body.replace(/<[^>]+>/g, "").trim() && !ctx.embeds.length && !/<img|!\[/.test(body)) {
        throw new Error("Nothing left after cleaning");
      }

      // Category: Yoast's primary category isn't usable (no term list in the export),
      // so take the first category that tells a reader something.
      const cats = (item.category || []).filter((c) => c["@_domain"] === "category");
      const names = cats.map((c) => decodeEntities(text(c["#text"])));
      const specific = cats.find((c) => !GENERIC_CATEGORIES.has(c["@_nicename"]));
      const kicker = specific ? decodeEntities(text(specific["#text"])) : "";

      const excerpt = decodeEntities(text(item["excerpt:encoded"]).replace(/<[^>]+>/g, ""));
      const metaDescription = expandYoast(meta(item, "_yoast_wpseo_metadesc"), title);
      const seoTitle = expandYoast(meta(item, "_yoast_wpseo_title"), title);
      const featured = attachments.get(meta(item, "_thumbnail_id")) || null;

      const fields = {
        title,
        // Old posts are dated in site time; stored as Gulf time so the date in the URL never shifts.
        date: `${day}T${time}+04:00`,
        slug,
        kicker,
        categories: names,
        standfirst: excerpt || metaDescription,
        // Short summary for homepage cards when there's no standfirst. Not shown on the article page.
        excerpt: excerpt || metaDescription ? "" : firstParagraphText(html),
        imageAlt: featured?.alt || "",
        seoTitle: seoTitle && seoTitle !== `${title} | Gulf Youth Sport` ? seoTitle : "",
        metaDescription,
        wpId: Number(id),
        wpFeaturedImage: featured?.file || "",
      };

      const dir = path.join(OUT_DIR, year);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${day}-${slug}.md`);
      fs.writeFileSync(file, `${frontMatter(fields)}\n\n${body}\n`);

      imageManifest.push({
        id,
        year: Number(year),
        file: path.relative(process.cwd(), file).replace(/\\/g, "/"),
        featured,
        inline: [...body.matchAll(/(?:!\[[^\]]*\]\(|<img[^>]*src=")(https?:\/\/[^\s)"]+)/g)].map((m) => m[1]),
      });
      results.push({ id, title, url, file, removed: ctx.removed, replaced: ctx.replaced, droppedLinks: ctx.droppedLinks, embeds: ctx.embeds.length, hasFeatured: !!featured });
    } catch (error) {
      failures.push({ id, title, url, reason: error.message });
    }
  }

  // Cross-check every URL against the index CSV.
  const converted = new Map(results.map((r) => [r.id, r]));
  const allIds = new Set([...published.map((i) => text(i["wp:post_id"]))]);
  const urlProblems = [];
  for (const [id, row] of index) {
    const ours = converted.get(id);
    const failed = failures.find((f) => f.id === id);
    if (!allIds.has(id)) urlProblems.push({ id, issue: "In the CSV but not a published post in the XML", csv: row.url, ours: "" });
    else if (failed) continue;
    else if (ours.url !== row.url) urlProblems.push({ id, issue: "URL differs", csv: row.url, ours: ours.url });
  }
  for (const id of allIds) {
    if (!index.has(id)) urlProblems.push({ id, issue: "Published in the XML but missing from the CSV", csv: "", ours: converted.get(id)?.url || "" });
  }

  // Reports
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, "image-manifest.json"), JSON.stringify(imageManifest, null, 2));
  fs.writeFileSync(
    path.join(REPORT_DIR, "external-domains.csv"),
    "domain,posts,example_post\n" +
      [...domainPosts.entries()]
        .sort((a, b) => a[1].length - b[1].length || a[0].localeCompare(b[0]))
        .map(([host, urls]) => [host, new Set(urls).size, urls[0]].map(csvCell).join(","))
        .join("\n") + "\n"
  );
  fs.writeFileSync(
    path.join(REPORT_DIR, "suspicious-content.csv"),
    "post_id,url,title,finding,detail\n" +
      suspicious.flatMap((s) => s.findings.map((f) => [s.id, s.url, s.title, f.type, f.detail].map(csvCell).join(","))).join("\n") + "\n"
  );
  fs.writeFileSync(
    path.join(REPORT_DIR, "removed-media.csv"),
    "post_id,url,removed\n" +
      results.flatMap((r) => r.removed.map((what) => [r.id, r.url, what].map(csvCell).join(","))).join("\n") + "\n"
  );
  fs.writeFileSync(
    path.join(REPORT_DIR, "link-changes.csv"),
    "post_id,url,change\n" +
      results.flatMap((r) => [...r.replaced, ...r.droppedLinks].map((what) => [r.id, r.url, what].map(csvCell).join(","))).join("\n") + "\n"
  );
  fs.writeFileSync(
    path.join(REPORT_DIR, "failures.csv"),
    "post_id,url,title,reason\n" + failures.map((f) => [f.id, f.url, f.title, f.reason].map(csvCell).join(",")).join("\n") + "\n"
  );
  fs.writeFileSync(
    path.join(REPORT_DIR, "url-check.csv"),
    "post_id,issue,csv_url,our_url\n" + urlProblems.map((u) => [u.id, u.issue, u.csv, u.ours].map(csvCell).join(",")).join("\n") + "\n"
  );

  const typeCounts = {};
  for (const s of suspicious) for (const f of s.findings) typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;

  const summary = {
    publishedInXml: published.length,
    skippedNotPublished: skipped.map((i) => `${text(i["wp:status"])}: ${decodeEntities(text(i.title))}`),
    converted: results.length,
    failed: failures.length,
    urlProblems: urlProblems.length,
    withFeaturedImage: results.filter((r) => r.hasFeatured).length,
    youtubeEmbedsKept: results.reduce((n, r) => n + r.embeds, 0),
    postsWithRemovedMedia: results.filter((r) => r.removed.length).length,
    embedsReplacedWithLinks: results.reduce((n, r) => n + r.replaced.length, 0),
    linksRemovedKeptText: results.reduce((n, r) => n + r.droppedLinks.length, 0),
    postsWithSuspiciousFindings: suspicious.length,
    findingsByType: typeCounts,
    externalDomains: domainPosts.size,
  };
  fs.writeFileSync(path.join(REPORT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main();
