// One-off: crop the headline text off imported featured images, keeping just the photo.
//
//   node scripts/crop-featured-text.mjs preview [year]   → contact sheet in import-reports/, nothing changed
//   node scripts/crop-featured-text.mjs apply   [year]   → overwrites the WebP files in src/images/archive/
//
// The old featured images are Instagram graphics: a photo on top, then a dark panel with the
// headline (white line, then yellow highlighted lines), summary and "Read more". The crop line
// is found from the first wide yellow highlight bar. Works from the original uploads in
// ../gys-import/extracted when available (better quality), otherwise from the existing WebP.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [mode = "preview", year = "2026"] = process.argv.slice(2);
const STORIES = path.resolve(`src/stories/archive/${year}`);
const EXTRACTED = path.resolve("../gys-import/extracted/uploads");
const PLAN = path.resolve("import-reports/image-plan.json");
const REPORT_DIR = path.resolve("import-reports");
const MAX_WIDTH = 1600;

async function findCut(file) {
  const W = 270;
  const { data, info } = await sharp(file).rotate().resize({ width: W }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const H = info.height;
  // Share of a row that is highlight yellow. The template's highlight is a lime yellow, about
  // rgb(208, 224, 32), with almost no blue. Highlight bars are inset from the image edges, so a row
  // whose yellow reaches either edge is part of the photo (sunlit grass, buildings), not a bar.
  const rowStats = (y) => {
    let n = 0, first = -1, last = -1;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (r > 170 && g > 180 && b < 70 && g - b > 140 && Math.abs(r - g) < 45) {
        n++;
        if (first < 0) first = x;
        last = x;
      }
    }
    const inset = first >= 2 && last <= W - 3;
    return { share: inset ? n / W : 0, unbroken: n > 0 ? n / (last - first + 1) : 0 };
  };
  const yellowShare = (y) => rowStats(y).share;
  for (let y = Math.floor(H * 0.3); y < H * 0.92; y++) {
    if (yellowShare(y) > 0.2) {
      let bar = 0;
      let solid = 0;
      while (y + bar < H && yellowShare(y + bar) > 0.2) solid = Math.max(solid, rowStats(y + bar++).unbroken);
      // Every highlight box has solid top and bottom edges: one unbroken run of yellow. Yellow
      // patches in a photo (grass, kit) are broken up. Skip anything that isn't a real box.
      if (solid < 0.97) { y += bar; continue; }
      // The white headline line sits above the first yellow bar, usually close but sometimes higher:
      // walk upwards while rows still contain white text, then cut above it with a margin.
      const whiteShare = (row) => {
        let n = 0;
        for (let x = Math.round(W * 0.03); x < W * 0.97; x++) {
          const i = (row * W + x) * 3;
          if (data[i] > 215 && data[i + 1] > 215 && data[i + 2] > 215) n++;
        }
        return n / W;
      };
      let textTop = y;
      for (let row = y - 1; row > H * 0.3 && y - row < bar * 5; row--) {
        if (whiteShare(row) > 0.03) textTop = row;
        else if (textTop - row > bar * 1.2) break;
      }
      return Math.max(0.3, Math.min(y - bar * 2.6, textTop - bar * 0.6) / H);
    }
  }
  return null;
}

async function main() {
  const plan = fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, "utf8")) : { featured: {} };
  const jobs = [];
  for (const f of fs.readdirSync(STORIES).filter((f) => f.endsWith(".md"))) {
    const text = fs.readFileSync(path.join(STORIES, f), "utf8");
    const image = text.match(/^image: "([^"]+)"/m)?.[1];
    const id = text.match(/^wpId: (\d+)/m)?.[1];
    if (!image) continue;
    const webp = path.resolve("src" + image);
    const original = plan.featured[id] && path.join(EXTRACTED, plan.featured[id]);
    jobs.push({ story: f, webp, source: original && fs.existsSync(original) ? original : webp });
  }

  const results = [];
  for (const job of jobs) {
    const cut = await findCut(job.source);
    results.push({ ...job, cut });
  }

  for (const r of [...results].sort((a, b) => (a.cut ?? 0) - (b.cut ?? 0))) console.log(`  ${r.cut === null ? "none" : (r.cut * 100).toFixed(0) + "%"}  ${r.story}`);
  const missing = results.filter((r) => r.cut === null);
  console.log(`${results.length} featured images, crop line found for ${results.length - missing.length}`);
  for (const m of missing) console.log(`  no headline panel found, left unchanged: ${m.story}`);

  if (mode === "bottoms") {
    // Close-up of the bottom edge of every crop, to check no headline text is left behind.
    const W = 480, STRIP = 70, tiles = [];
    for (const r of results.filter((r) => r.cut !== null)) {
      const full = await sharp(r.source).rotate().resize({ width: W }).toBuffer({ resolveWithObject: true });
      const bottom = Math.round(r.cut * full.info.height);
      tiles.push(await sharp(full.data).extract({ left: 0, top: bottom - STRIP, width: W, height: STRIP }).toBuffer());
    }
    const cols = 3;
    await sharp({ create: { width: cols * (W + 6), height: Math.ceil(tiles.length / cols) * (STRIP + 6), channels: 3, background: "#f00" } })
      .composite(tiles.map((input, i) => ({ input, left: (i % cols) * (W + 6), top: Math.floor(i / cols) * (STRIP + 6) })))
      .jpeg({ quality: 85 }).toFile(path.join(REPORT_DIR, `crop-bottoms-${year}.jpg`));
    console.log(`Bottoms: import-reports/crop-bottoms-${year}.jpg`);
    return;
  }

  if (mode === "preview") {
    // Contact sheet: each original with the crop line drawn in red, next to the cropped result.
    const W = 180, H = 225, PAD = 8, cols = 4;
    const tiles = [];
    for (const r of results) {
      const before = await sharp(r.source).rotate().resize(W, H, { fit: "fill" }).toBuffer();
      const line = r.cut === null ? [] : [{ input: Buffer.from(`<svg width="${W}" height="${H}"><rect y="${Math.round(r.cut * H)}" width="${W}" height="3" fill="red"/></svg>`), top: 0, left: 0 }];
      const marked = await sharp(before).composite(line).toBuffer();
      const after = r.cut === null
        ? await sharp({ create: { width: W, height: H, channels: 3, background: "#ddd" } }).png().toBuffer()
        : await sharp(r.source).rotate().resize(W, H, { fit: "fill" }).extract({ left: 0, top: 0, width: W, height: Math.round(r.cut * H) }).toBuffer();
      tiles.push(marked, after);
    }
    const pairW = W * 2 + PAD, rows = Math.ceil(results.length / cols);
    await sharp({ create: { width: cols * (pairW + PAD * 3), height: rows * (H + PAD), channels: 3, background: "#fff" } })
      .composite(tiles.map((input, i) => {
        const pair = Math.floor(i / 2);
        return { input, left: (pair % cols) * (pairW + PAD * 3) + (i % 2) * (W + PAD), top: Math.floor(pair / cols) * (H + PAD) };
      }))
      .jpeg({ quality: 82 })
      .toFile(path.join(REPORT_DIR, `crop-preview-${year}.jpg`));
    console.log(`Preview: import-reports/crop-preview-${year}.jpg`);
    return;
  }

  if (mode === "apply") {
    for (const r of results.filter((r) => r.cut !== null)) {
      const meta = await sharp(r.source).rotate().toBuffer({ resolveWithObject: true });
      const { width, height } = meta.info;
      await sharp(meta.data)
        .extract({ left: 0, top: 0, width, height: Math.round(r.cut * height) })
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(r.webp + ".tmp");
      fs.renameSync(r.webp + ".tmp", r.webp);
    }
    console.log(`Cropped ${results.length - missing.length} images in place.`);
  }
}

await main();
