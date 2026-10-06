# Case-study authoring

Case studies are independent website articles, not Engineering Journal entries.
Write each company as an undated, lowercase kebab-case Markdown file here:

```text
relaydesk.md -> /case-studies/relaydesk.html
```

The directory supplies the shared article layout, Case studies backlink, canonical
URL, structured data and discussion identity. Each page must include `caseStudy`
metadata with `company`, `label`, `description` and a positive integer `order`.
That order controls the cards and previous/next navigation. `logo` is optional;
the optional `spotlight` object contains a local image, heading and description
for the wide index card and homepage feature.

Keep the existing title, description, category, author, date, series and banner
fields. Case studies, their cards, navigation, spotlights and sitemap entries
appear in both preview and production builds. Per-page draft controls belong
only to the Engineering Journal; case studies never join its collection or RSS feed.

The Markdown and image tools are shared with the Journal. See the
[authoring reference](../journal/README.md) for Mermaid, captions, lightboxes,
code sizes, expandable source examples and Typora setup. Assets remain in their
existing article folders; the `journal` part of their path is not a publishing
classification:

```yaml
typora-root-url: ..
typora-copy-images-to: ../assets/journal/articles/relaydesk
```

The shared stylesheet entry point is `src/styles/journal.less`. Its logical units
live under `src/_includes/styles/articles/`, with separate layout, prose, code,
diagram, navigation, image-viewer, archive-viewer and cyberpunk styles. Imports
preserve the existing cascade; change the relevant unit rather than adding
unrelated rules to the entry point.

Validation and publication rules are shared: use the front-matter title instead
of a body H1, keep the body nonempty, and resolve TODO comments before publishing.
Discussion uses the new canonical company URL. Since these pages were not
published before migration, no old URLs or discussion mappings are retained.
