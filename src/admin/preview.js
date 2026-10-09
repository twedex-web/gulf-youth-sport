// Makes the CMS preview pane look like the real article page.
/* global CMS, h, createClass */

CMS.registerPreviewStyle("https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800&family=Barlow:wght@400;500;600;700&display=swap");
CMS.registerPreviewStyle("/assets/site.css");

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai",
});

const StoryPreview = createClass({
  render: function () {
    const entry = this.props.entry;
    const get = (name) => entry.getIn(["data", name]);
    const image = get("image") ? this.props.getAsset(get("image")) : null;
    const date = get("date") ? new Date(get("date")) : null;

    return h("div", {},
      h("div", { className: "stripe", "aria-hidden": "true" },
        h("span"), h("span"), h("span"), h("span"), h("span"), h("span")),
      h("article", { className: "article" },
        h("header", { className: "wrap article-head" },
          get("kicker") ? h("p", { className: "kicker kicker--plain" }, get("kicker")) : null,
          h("h1", { className: "article-title" }, get("title") || "Headline"),
          get("standfirst") ? h("p", { className: "standfirst" }, get("standfirst")) : null,
          date && !isNaN(date) ? h("p", { className: "meta" }, dateFormat.format(date)) : null
        ),
        image ? h("figure", { className: "wrap article-figure" },
          h("img", { src: image.toString(), alt: get("imageAlt") || "" })) : null,
        h("div", { className: "wrap article-body" },
          h("div", { className: "prose" }, this.props.widgetFor("body"))
        )
      )
    );
  },
});

CMS.registerPreviewTemplate("stories", StoryPreview);
