# Engineering Journal authoring

Write each journal entry as a Markdown file in this directory. The filename becomes the permanent URL:

```text
src/journal/what-belongs-in-simple-java-mail.md
-> /journal/what-belongs-in-simple-java-mail.html
```

Use lowercase kebab-case filenames. Renaming a published file changes its URL, so treat the filename as permanent after publication.

## Writing in Typora

Open this directory as a folder in Typora, then duplicate `article-template.md` for each new entry. Rename the copy to the lowercase kebab-case URL you want before writing, fill in the front matter, and leave `draft: true` until the entry is ready to publish.

The template carries two Typora-only settings:

```yaml
typora-root-url: ..
typora-copy-images-to: ../assets/journal
```

`typora-root-url` lets Typora preview site-root image paths such as `/assets/journal/example.png`. `typora-copy-images-to` sends images pasted or dragged into the document to `src/assets/journal/` instead of leaving them beside the article. These settings are authoring metadata only and are not rendered into the website.

Once in Typora, open **Preferences → Editor → Image Insert**, enable **Allow copy images to given folder** and **Use relative path if possible**, and leave **Ensure `./` prefix** disabled. This is a one-time application preference; the target folder itself comes from each article's front matter. Typora documents this workflow in [Images in Typora](https://support.typora.io/Images/).

Saving in Typora only changes the local Markdown file. Use Git when you actually want to record a revision.

For unresolved notes inside an article, use an HTML comment with the `TODO:` prefix:

```markdown
<!-- TODO: verify when this happened and add the source -->
```

These markers are allowed while `draft: true`. Removing `draft` or setting it to `false` makes any remaining TODO marker a build error that identifies the article and line number. TODO syntax shown inside inline or fenced code remains available for examples and does not block publication.

## Front matter

Every article starts with YAML front matter:

```yaml
---
title: "What belongs in Simple Java Mail?"
description: "How a mature library decides when to expand, when to stabilize, and where application responsibility begins."
date: "2026-08-26"
category: "Maintainer practice"
draft: true
typora-root-url: ..
typora-copy-images-to: ../assets/journal
---
```

Required fields:

- `title`
- `description`
- `date`, formatted as `YYYY-MM-DD`
- `category`

Optional fields:

- `author`, which defaults to the journal author in `src/_data/site.json`
- `updated`, formatted as `YYYY-MM-DD`
- `draft`, which defaults to `false`

### Categories

Use one of these exact values:

- `Project history` — origins, milestones, old decisions, abandoned directions, and later pivots
- `Maintainer practice` — project direction, working methods, library ethics, and stewardship
- `Library design` — API choices, module boundaries, compatibility, and when the library should expand or stabilize
- `System design` — end-to-end designs that combine multiple mail and infrastructure concerns
- `Security` — threat models and whole-system security, including authentication, transport, content, and operational controls

The category describes the entry's main lens, not its tone. For a personal account of how Simple Java Mail began in 2006 and why it became a library, use `Project history`.

The page template provides the article title, so begin the Markdown body with prose or an `##` heading. Any Markdown construct that produces an `h1` fails the build. Headings from `h2` through `h6` receive permalinks; second- and third-level headings are also added to the article navigation automatically.

Fenced code blocks, tables, blockquotes, lists, links, and raw HTML are supported. Raw HTML is trusted and is not sanitized, so only use content maintained in this repository. Put journal images in `src/assets/journal/`. Absolute site paths such as `/assets/journal/example.png` and document-relative paths such as `../assets/journal/example.png` both resolve to the same published asset.

## Preview and publish

`npm run dev` includes draft entries in the local journal index and adds `noindex` metadata to their pages. `npm run build` excludes drafts from HTML, the journal index, the RSS feed, and the sitemap.

To publish an entry, remove `draft` or set it to `false`, then run:

```text
npm run check
npm run build
npm run verifyLinks:internal
```

The build writes static HTML only. No Markdown rendering or application server is needed in production.
