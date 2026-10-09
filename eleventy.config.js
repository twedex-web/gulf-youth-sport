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

  // Newest first. Publishing an article in the CMS puts it at the top of the homepage.
  eleventyConfig.addCollection("stories", (api) =>
    api.getFilteredByGlob("src/stories/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addFilter("readableDate", (date) => dateFormat.format(date));
  eleventyConfig.addFilter("isoDate", (date) => date.toISOString());
  eleventyConfig.addFilter("tileColour", (index) => TILE_COLOURS[index % TILE_COLOURS.length]);
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
