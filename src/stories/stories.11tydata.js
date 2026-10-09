// Turns whatever is typed into the CMS slug field into a safe URL segment.
function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default {
  layout: "layouts/article.njk",
  eleventyComputed: {
    permalink: (data) => `/stories/${slugify(data.slug || data.page.fileSlug)}/`,
  },
};
