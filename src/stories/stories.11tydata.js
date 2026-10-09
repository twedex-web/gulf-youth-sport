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
    // Fall back sensibly when the SEO fields are left blank in the CMS.
    seoTitle: (data) => data.seoTitle || `${data.title} | Gulf Youth Sport`,
    metaDescription: (data) => data.metaDescription || data.standfirst,
  },
};
