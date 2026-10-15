// Turns whatever is typed into the CMS slug field into a safe URL segment.
function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Story URLs follow the old WordPress pattern, /YYYY/MM/DD/slug/, using the date in Gulf time.
const urlDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dubai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default {
  layout: "layouts/article.njk",
  eleventyComputed: {
    permalink: (data) => {
      const [year, month, day] = urlDate.format(data.page.date).split("-");
      return `/${year}/${month}/${day}/${slugify(data.slug || data.page.fileSlug)}/`;
    },
    // Fall back sensibly when the SEO fields are left blank in the CMS.
    seoTitle: (data) => data.seoTitle || `${data.title} | Gulf Youth Sport`,
    metaDescription: (data) => data.metaDescription || data.standfirst || data.excerpt,
  },
};
