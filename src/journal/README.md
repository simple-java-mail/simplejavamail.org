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

The complete date is retained for feed metadata and chronological ordering. Journal pages show readers only the month and year.

Optional fields:

- `author`, which defaults to the journal author in `src/_data/site.json`
- `updated`, formatted as `YYYY-MM-DD`
- `draft`, which defaults to `false`
- `ai-banner`, an article-specific explanation of how AI contributed to the writing
- `mermaid`, set to `true` when the article contains Mermaid diagrams
- `series`, with a shared `title` plus numeric `part` and `total` values

When `ai-banner` contains text, the article displays it in an AI-assisted writing disclosure. Leave the field out when AI was used only to fix typos; those articles receive the standard no-AI writing disclosure automatically.

For a diagram that Typora and the website can both render, set `mermaid: true` and use a fenced `mermaid` block. The website loads its local Mermaid renderer only for articles carrying that flag.

Series metadata adds an editorial line above the article title and its Journal-index entry without changing the article's permanent URL:

```yaml
series:
  title: "Twenty Years of Simple Java Mail"
  part: 1
  total: 3
```

A series occupies the chronological position of Part 1 and remains together. Use Part 1's publication date for every article in the set; the individual `part` values follow the Journal's oldest-to-newest reading order. The RSS feed remains newest first for feed readers.

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

## Citing archived sources

### Google Code

Google Code's readable archive pages redirect moved projects instead of showing their old issues. Keep a copy of the issue's machine-readable archive in `src/_data/google-code-issues/`, named `<project>-<issue>.json`, and link to the locally rendered source:

```markdown
[the relevant text](/sources/google-code/vesijama/issue-1.html#comment-1)
```

Comment `0` is the original report. The remaining numbers match Google Code's comment numbers. The normal link opens a standalone recovered issue page; on a Journal page, JavaScript progressively enhances the same link into the contained issue viewer. The archived JSON source follows this pattern:

```text
https://storage.googleapis.com/google-code-archive/v2/code.google.com/<project>/issues/issue-<issue>.json
```

Keep snapshots unchanged. Their contents are treated as untrusted and rendered with raw HTML disabled.

Recovered project records and `Manual` wiki pages live in `src/_data/google-code-projects/` and `src/_data/google-code-wikis/`. Use their local project and wiki routes when an archived post links further into Google Code:

```markdown
[Vesijama](/sources/google-code/vesijama/project.html)
[the old manual](/sources/google-code/vesijama/wiki/manual.html)
```

Known links inside those snapshots are rewritten to another recovered source, a pinned GitHub revision, or the static Google Code download store. Unsupported dead Google Code links remain readable text rather than becoming misleading links.

### Project Nibble posts

Recovered posts from Benny's old blog live in `src/_data/project-nibble-posts/`. Link to the locally rendered post and add the original WordPress comment ID when citing a response:

```markdown
[the naming complaint](/sources/project-nibble/vesijama-very-simple-java-mail.html#comment-1305)
```

The local source contains the complete archived post and surviving discussion, with the Wayback capture linked in its footer. Journal links open it in the same recovered-source viewer used for Google Code; the URL remains a standalone fallback without JavaScript. Snapshot HTML is allow-listed before rendering, and these pages are excluded from search and the sitemap.

### SourceForge

Historical SourceForge project records, discussions, tickets, and mailing-list messages live in `src/_data/sourceforge-sources/`. Each wrapper records its original URL, capture source, and local permalink. Link to the local route, including the original post, ticket, or message identifier when the claim points to a particular part of the record:

```markdown
[the published fix](/sources/sourceforge/dkim-javamail/discussion/error-sending-to-yahoo.html#a7cd/57b5/60e8)
[the old header bug](/sources/sourceforge/javamail-crypto/bugs/3.html#ticket-3)
```

The standalone pages reproduce the compact SourceForge project UI and open in the same progressive-enhancement viewer from Journal entries. Discussion and ticket text is rendered as Markdown with raw HTML disabled; recovered mail is rendered as escaped preformatted text.

## Preview and publish

`npm run dev` includes draft entries in the local journal index and adds `noindex` metadata to their pages. `npm run build` excludes drafts from HTML, the journal index, the RSS feed, and the sitemap.

To publish an entry, remove `draft` or set it to `false`, then run:

```text
npm run check
npm run build
npm run verifyLinks:internal
```

The build writes static HTML only. No Markdown rendering or application server is needed in production.
