# Engineering Journal authoring

Write each journal entry as a Markdown file in this directory, prefixed with a sorting date in `YYYY-MM-DD` format. This keeps the files in reading order when Typora or a file browser sorts them alphabetically:

```text
src/journal/2026-08-26-what-belongs-in-simple-java-mail.md
-> /journal/what-belongs-in-simple-java-mail.html
```

Use lowercase kebab-case after the date. Eleventy automatically removes the date prefix from `page.fileSlug`, so the date does not appear in the permanent URL. Changing only that prefix is safe; changing the words after it changes the URL.

The filename date is for sorting files. The `date` in front matter remains the publication date used by the website and feed.

## Editorial baseline

Apply the [article editorial workflow](../../content-plan/article-editorial-workflow.md) to improve an outline or draft through a structured first pass. It covers the article's point, information order, examples, evidence, voice and rendered presentation, including the micro-narrative told by headings, visuals, code and captions when readers skim. The workflow is reusable across article types and does not prescribe a fixed story structure.

## Writing in Typora

Open this directory as a folder in Typora, then create a new `YYYY-MM-DD-your-article-title.md` file for each entry. Copy and fill in the front matter example below, and leave `draft: true` until the entry is ready to publish.

Keep these two Typora-only settings in each entry:

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

- `subtitle`, shown directly below the title; supports inline Markdown such as `~~strikethrough~~`
- `author`, which defaults to the journal author in `src/_data/site.json`
- `updated`, formatted as `YYYY-MM-DD`
- `draft`, which defaults to `false`
- `banner-type`, `banner-header` and `banner-body`, together defining an article banner
- `mermaid`, set to `true` when the article contains Mermaid diagrams
- `series`, with a shared `title` and numeric `part`; add `total` when the final number of parts is known
- `caseStudy`, with a `company`, short `label`, `description` and numeric `order` for the Case studies index

The banner fields are optional as a group. Leave all three out for no banner; there is no automatic authorship disclosure. Choose `note` for amber, `info` for blue or `tip` for green:

```yaml
banner-type: note
banner-header: "AI-Assisted"
banner-body: >-
  This article began as an AI-assisted draft, then was reviewed and edited by me.
```

The header is uppercased by CSS, so its original wording stays intact in the Markdown file. Header and body are plain text, not HTML or Markdown. Banners can contain any article-specific notice, not just information about AI use.

For a diagram that Typora and the website can both render, set `mermaid: true` and use a fenced `mermaid` block. The website loads its local Mermaid renderer only for articles carrying that flag.

For a tall diagram, keep the fence's language as just `mermaid` so Typora recognizes it, and add `%% journal: compact` on a line inside the block:

```mermaid
%% journal: compact
flowchart TB
    A --> B
```

Typora treats that line as an ordinary Mermaid comment. The website caps the diagram's height at 900px on desktop, or 600px at viewport widths of 980px and below, and scales it proportionally to fit narrower screens. Captions work the same way as for other diagrams.

Keep the shared flowchart spacing unless a diagram needs a specific adjustment. Use the compact comment to reduce its displayed size rather than squeezing its `rankSpacing`. A longer arrow such as `--->` can reserve extra room for a label where a connection enters a group.

Series metadata adds an editorial line above the article title and its Journal-index entry without changing the article's permanent URL:

```yaml
series:
  title: "Twenty Years of Simple Java Mail"
  part: 1
  total: 3
```

A series occupies the chronological position of Part 1 and remains together. Use Part 1's publication date for every article in the set; the individual `part` values follow the Journal's oldest-to-newest reading order. The RSS feed remains newest first for feed readers.

For alphabetical file sorting, give the parts consecutive filename dates while keeping their shared publication date in front matter. For example, all three of these entries have `date: "2026-09-01"`:

```text
2026-09-01-twenty-years-of-simple-java-mail.md
2026-09-02-the-libraries-behind-simple-java-mail.md
2026-09-03-the-library-i-keep-coming-back-to.md
```

### Case studies

Case studies are Journal articles with an additional entry on `/case-studies.html`. Add this metadata to include one:

```yaml
caseStudy:
  company: "Staple & Sons"
  label: "Self-managed SMTP"
  description: "A small company secures its self-managed mail setup after a troll farm abuses it."
  order: 1
```

`label` is the short badge identifying the kind of setup, such as "Self-managed SMTP" or "Enterprise integration". `order` controls only the Case studies index, not the Journal's reading order. The company profile is separate from the article's title and description; the index links to the existing Journal URL. Draft case studies appear in local preview and are excluded from the production index, just like other Journal drafts.

### Categories

Use one of these exact values:

- `Project history` — origins, milestones, old decisions, abandoned directions, and later pivots
- `Maintainer practice` — project direction, working methods, library ethics, and stewardship
- `Library design` — API choices, module boundaries, compatibility, and when the library should expand or stabilize
- `System design` — end-to-end designs that combine multiple mail and infrastructure concerns
- `Security` — threat models and whole-system security, including authentication, transport, content, and operational controls

The category describes the entry's main lens, not its tone. For a personal account of how Simple Java Mail began in 2006 and why it became a library, use `Project history`.

The page template provides the article title, so begin the Markdown body with prose or an `##` heading. Any Markdown construct that produces an `h1` fails the build. Headings from `h2` through `h6` receive permalinks; only top-level article sections (`##` / `h2`) appear in the table of contents.

Fenced code blocks, tables, blockquotes, lists, links, and raw HTML are supported. Raw HTML is trusted and is not sanitized, so only use content maintained in this repository. Put journal images in `src/assets/journal/`. Absolute site paths such as `/assets/journal/example.png` and document-relative paths such as `../assets/journal/example.png` both resolve to the same published asset.

For an image without a border or padding and with normal paragraph spacing, add `class="journal-paragraph-image"` to its `<img>` tag. Images remain centered by default. Add `image-align-left` or `image-align-right` to align any journal image, independently of its other styling. Combine them with, for example, `class="journal-paragraph-image image-align-right"`.

### Image, code and diagram captions

Put an italic-only paragraph immediately after a standalone image or fenced code block, including a Mermaid diagram, separated by a blank line. Typora displays ordinary italic text; the website groups the pair into a `<figure>` with a styled `<figcaption>`. Alt text remains separate from the visible caption.

```markdown
![Example quotation email](/assets/journal/example-email.png)

*The quotation is just an excuse to deliver the personal note.*
```

This works with Markdown images and standalone `<img>` tags, including their size and alignment classes. Use the same italic line after a code fence or Mermaid diagram; flowcharts and sequence diagrams both support it. Captions can contain links and inline code. Ordinary paragraphs, inline images, lists and blockquotes are unchanged, as are diagrams without a caption.

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
