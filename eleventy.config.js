import { isScheduled } from "./lib/scheduled.js";

const TILE_COLOURS = ["red", "yellow", "green", "maroon", "orange", "blue"];

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Dubai",
});

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/favicon.png");
  // Decap CMS admin: copied as-is, never processed as templates.
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.ignores.add("src/admin/**");

  // Newest first. Publishing an article in the CMS puts it at the top of the homepage.
  // Scheduled (future-dated) stories are left out until a build runs after their publish time.
  eleventyConfig.addCollection("stories", (api) =>
    api
      .getFilteredByGlob("src/stories/**/*.md")
      .filter((story) => !isScheduled(story.date))
      .sort((a, b) => b.date - a.date)
  );

  // Images in article text load as the reader scrolls (the lead image is marked fetchpriority="high").
  eleventyConfig.addTransform("lazy-images", function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    return content.replace(/<img\b(?![^>]*\b(?:loading|fetchpriority)=)/g, '<img loading="lazy" decoding="async"');
  });

  eleventyConfig.addFilter("readableDate", (date) => dateFormat.format(date));
  eleventyConfig.addFilter("isoDate", (date) => date.toISOString());
  eleventyConfig.addFilter("tileColour", (index) => TILE_COLOURS[index % TILE_COLOURS.length]);
  // Partners all come from src/_data/partners.json (editable in the CMS).
  eleventyConfig.addFilter("partnerTier", (partners, tier) => (partners || []).filter((p) => p.tier === tier));
  eleventyConfig.addFilter("partnerUrl", (p) =>
    p.website || (p.instagram ? `https://www.instagram.com/${String(p.instagram).replace(/^@/, "")}/` : "")
  );
  eleventyConfig.addFilter("partnerInstagram", (p) =>
    p.instagram ? `https://www.instagram.com/${String(p.instagram).replace(/^@/, "")}/` : ""
  );
  eleventyConfig.addFilter("partnerHandle", (p) => (p.instagram ? `@${String(p.instagram).replace(/^@/, "")}` : ""));
  eleventyConfig.addFilter("otherStories", (stories, url, count) =>
    stories.filter((story) => story.url !== url).slice(0, count)
  );

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    // Article bodies come from the CMS: never run them through a template engine.
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
}
