# Engineering Journal authoring

Write each journal entry as a Markdown file in this directory. The filename becomes the permanent URL:

```text
src/journal/what-belongs-in-simple-java-mail.md
-> /journal/what-belongs-in-simple-java-mail.html
```

Use lowercase kebab-case filenames. Renaming a published file changes its URL, so treat the filename as permanent after publication.

## Front matter

Every article starts with YAML front matter:

```yaml
---
title: "What belongs in Simple Java Mail?"
description: "How a mature library decides when to expand, when to stabilize, and where application responsibility begins."
published: "2026-08-26"
category: "Maintainer practice"
appliesTo:
  - "Simple Java Mail 10.x"
draft: true
---
```

Required fields:

- `title`
- `description`
- `published`, formatted as `YYYY-MM-DD`
- `category`

Optional fields:

- `author`, which defaults to the journal author in `manifest/site.json`
- `updated`, formatted as `YYYY-MM-DD`
- `appliesTo`, as one value or a YAML list
- `draft`, which defaults to `false`

The page template provides the article title, so begin the Markdown body with prose or an `##` heading. An `#` heading fails the build. Second- and third-level headings are added to the article navigation automatically.

Fenced code blocks, tables, blockquotes, lists, links, and raw HTML are supported. Raw HTML is trusted and is not sanitized, so only use content maintained in this repository. Put journal images in `src/assets/journal/` and reference them with an absolute site path such as `/assets/journal/example.png`.

## Preview and publish

`npm run dev` includes draft entries in the local journal index and adds `noindex` metadata to their pages. `npm run build` excludes drafts from HTML, the journal index, the RSS feed, and the sitemap.

To publish an entry, remove `draft` or set it to `false`, then run:

```text
npm run check
npm run build
npm run verifyLinks:internal
```

The build writes static HTML only. No Markdown rendering or application server is needed in production.
