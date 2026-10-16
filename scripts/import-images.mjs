// One-off image import for the old WordPress posts. Runs on a developer's computer only.
//
//   node scripts/import-images.mjs plan    [path-to-gys-import]
//   (cd ../gys-import && tar -xf gys-uploads-2026-10-09.tar -C extracted -T import-images.txt)
//   node scripts/import-images.mjs convert [path-to-gys-import]
//
// Rules: every post keeps its featured image; posts from 2022 onwards also keep their inline
// images; older posts lose inline images. Always the original upload, never WordPress's resized
// copies ("-1024x683", "-scaled"). Output: WebP, max 1600px wide, in src/images/archive/YYYY/MM/.
// Only image files are ever extracted from the archive. The converter (import-wordpress.mjs)
// reads import-reports/image-map.json to update the image paths in the articles.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const [mode = "plan", importArg] = process.argv.slice(2);
const IMPORT_DIR = path.resolve(importArg || "../gys-import");
const TAR = path.join(IMPORT_DIR, "gys-uploads-2026-10-09.tar");
const LIST = path.join(IMPORT_DIR, "import-images.txt");
const EXTRACTED = path.join(IMPORT_DIR, "extracted");
const OUT_DIR = path.resolve("src/images/archive");
const PUBLIC_PREFIX = "/images/archive";
const REPORT_DIR = path.resolve("import-reports");
const PLAN_FILE = path.join(REPORT_DIR, "image-plan.json");
const MAP_FILE = path.join(REPORT_DIR, "image-map.json");

const KEEP_INLINE_FROM_YEAR = 2022;
const MAX_WIDTH = 1600;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

// "2023/05/photo-1024x683.jpg" → "2023/05/photo.jpg"; "photo-scaled.jpg" → "photo.jpg"
function originalName(file) {
  return file.replace(/-\d+x\d+(?=\.[a-z]+$)/i, "").replace(/-scaled(?=\.[a-z]+$)/i, "");
}

// Path inside the uploads folder for an image URL on the old site, or null for anything else.
export function uploadsPath(url) {
  const match = String(url).match(/^(?:https?:)?\/\/(?:www\.)?gulfyouthsport\.com\/wp-content\/uploads\/([^?#]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function safeName(name) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function readTarListing() {
  // name → size in bytes, for every file in the archive's uploads folder.
  const listing = execFileSync("tar", ["--force-local", "--quoting-style=literal", "-tvf", TAR], { maxBuffer: 1 << 28 }).toString("utf8");
  const files = new Map();
  for (const line of listing.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6 || line.startsWith("d")) continue;
    const name = parts.slice(5).join(" ");
    if (name.startsWith("uploads/") && !name.endsWith("/")) files.set(name.slice("uploads/".length), Number(parts[2]));
  }
  return files;
}

function plan() {
  const files = readTarListing();
  const manifest = JSON.parse(fs.readFileSync(path.join(REPORT_DIR, "image-manifest.json"), "utf8"));
  const pick = (candidates) => candidates.find((c) => c && files.has(c) && IMAGE_EXT.test(c)) || null;

  const needed = new Map(); // archive path → { size, uses }
  const featured = {}; // post id → archive path
  const inline = {}; // original uploads path → archive path
  const missing = [];
  let inlineDropped = 0;
  let inlineOffSite = 0;

  const use = (file, why) => {
    if (!needed.has(file)) needed.set(file, { size: files.get(file), uses: [] });
    needed.get(file).uses.push(why);
  };

  for (const post of manifest) {
    if (post.featured?.file) {
      const file = post.featured.file;
      const dir = path.posix.dirname(file);
      // Prefer WordPress's untouched upload ("original_image"), then the file itself without size suffixes.
      const hit = pick([post.featured.original && `${dir}/${post.featured.original}`, originalName(file), file]);
      if (hit) {
        featured[post.id] = hit;
        use(hit, `featured: ${post.file}`);
      } else missing.push({ post: post.file, image: file, kind: "featured" });
    }
    for (const url of post.inline) {
      const p = uploadsPath(url);
      if (!p) { inlineOffSite++; continue; }
      if (post.year < KEEP_INLINE_FROM_YEAR) { inlineDropped++; continue; }
      const hit = pick([originalName(p), p]);
      if (hit) {
        inline[p] = hit;
        use(hit, `inline: ${post.file}`);
      } else missing.push({ post: post.file, image: p, kind: "inline" });
    }
  }

  fs.writeFileSync(LIST, [...needed.keys()].map((f) => `uploads/${f}`).join("\n") + "\n");
  fs.writeFileSync(PLAN_FILE, JSON.stringify({ featured, inline, missing, files: Object.fromEntries(needed) }, null, 2));
  const originalBytes = [...needed.values()].reduce((n, f) => n + f.size, 0);
  console.log(JSON.stringify({
    imagesToExtract: needed.size,
    originalSizeMB: +(originalBytes / 1e6).toFixed(1),
    featuredImages: Object.keys(featured).length,
    inlineImagesKept: Object.keys(inline).length,
    inlineImagesRemovedBefore2022: inlineDropped,
    inlineImagesOnOtherSitesRemoved: inlineOffSite,
    missing: missing.length,
    listFile: LIST,
  }, null, 2));
}

async function convert() {
  const { featured, inline, files } = JSON.parse(fs.readFileSync(PLAN_FILE, "utf8"));
  const outputs = new Map(); // archive path → public path
  const taken = new Set();
  const failures = [];
  const fallbacks = [];
  let inBytes = 0;
  let outBytes = 0;

  const listing = readTarListing();
  const largestCopy = (file) => {
    const base = file.replace(/\.[^.]+$/, "");
    const ext = path.posix.extname(file);
    return [...listing.keys()]
      // Only "<same name>-WIDTHxHEIGHT.ext": "photo-1-768x1024.jpg" is a different upload, not a copy of "photo.jpg".
      .filter((f) => f.endsWith(ext) && /^-\d+x\d+\.[a-z]+$/i.test(f.slice(base.length)) && f.startsWith(`${base}-`))
      .map((f) => ({ f, w: Number(f.slice(base.length).match(/-(\d+)x\d+\./)[1]) }))
      .sort((a, b) => b.w - a.w)[0]?.f;
  };

  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  for (const file of Object.keys(files).sort()) {
    const src = path.join(EXTRACTED, "uploads", file);
    const dir = path.posix.dirname(file);
    let name = safeName(path.posix.basename(file).replace(/\.[^.]+$/, ""));
    // "photo.jpg" and "photo.png" in the same month would both become photo.webp.
    if (taken.has(`${dir}/${name}`)) {
      let n = 2;
      while (taken.has(`${dir}/${name}-${n}`)) n++;
      name = `${name}-${n}`;
    }
    taken.add(`${dir}/${name}`);
    const dest = path.join(OUT_DIR, dir, `${name}.webp`);

    const encode = (input) =>
      // Re-encoding from pixels also drops anything hidden in the original file (metadata, trailing data).
      sharp(input, { animated: /\.gif$/i.test(input) })
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(dest);

    try {
      if (!fs.existsSync(src)) throw new Error("not extracted");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      let info;
      let used = src;
      try {
        info = await encode(src);
      } catch (error) {
        // A damaged original: fall back to the largest resized copy WordPress made while it was intact.
        const fallback = largestCopy(file);
        if (!fallback) throw error;
        execFileSync("tar", ["--force-local", "-xf", TAR, "-C", EXTRACTED, `uploads/${fallback}`]);
        used = path.join(EXTRACTED, "uploads", fallback);
        info = await encode(used);
        fallbacks.push({ file, used: fallback, reason: error.message.split("\n")[0] });
      }
      inBytes += fs.statSync(used).size;
      outBytes += info.size;
      outputs.set(file, `${PUBLIC_PREFIX}/${dir}/${name}.webp`);
    } catch (error) {
      failures.push({ file, reason: error.message });
    }
  }

  const map = {
    featured: Object.fromEntries(Object.entries(featured).filter(([, f]) => outputs.has(f)).map(([id, f]) => [id, outputs.get(f)])),
    inline: Object.fromEntries(Object.entries(inline).filter(([, f]) => outputs.has(f)).map(([p, f]) => [p, outputs.get(f)])),
  };
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "image-failures.json"), JSON.stringify({ failures, fallbacks }, null, 2));
  console.log(JSON.stringify({
    converted: outputs.size,
    failed: failures.length,
    usedResizedCopyBecauseOriginalDamaged: fallbacks.map((f) => `${f.file} → ${f.used}`),
    originalSizeMB: +(inBytes / 1e6).toFixed(1),
    webpSizeMB: +(outBytes / 1e6).toFixed(1),
    featuredMapped: Object.keys(map.featured).length,
    inlineMapped: Object.keys(map.inline).length,
  }, null, 2));
}

if (mode === "plan") plan();
else if (mode === "convert") await convert();
else console.error("Usage: node scripts/import-images.mjs plan|convert [path-to-gys-import]");
