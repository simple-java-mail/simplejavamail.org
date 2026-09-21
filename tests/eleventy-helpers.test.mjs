import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Handlebars from "handlebars";
import journalData from "../src/journal/journal.11tydata.mjs";
import {
  createMarkdownLibrary,
  enforceJournalTodoPolicy,
  findUnresolvedJournalTodo,
  formatDate,
  hasMarkdownHeading,
  headingsFromHtml,
  journalArticleUrl,
  journalNeighbor,
  navItemForUrl,
  orderJournalEntries,
  rssDate,
  validateSiteData,
} from "../src/_lib/eleventy-helpers.mjs";
import {
  createGoogleCodeCommentLibrary,
  createGoogleCodeProjectLibrary,
  decodeGoogleCodeEntities,
  googleCodeArchiveLink,
  googleCodePseudoIdentity,
  googleCodeTimestamp,
  loadGoogleCodeIssues,
  loadGoogleCodeProjects,
  loadGoogleCodeWikis,
  sanitizeGoogleCodeWikiHtml,
} from "../src/_lib/google-code-archive.mjs";
import {
  loadProjectNibblePosts,
  projectNibbleArchiveLink,
  sanitizeProjectNibbleHtml,
} from "../src/_lib/project-nibble-archive.mjs";
import {
  createSourceForgeMarkupLibrary,
  decodeSourceForgeEntities,
  loadSourceForgeSources,
  sourceForgeArchiveLink,
} from "../src/_lib/sourceforge-archive.mjs";

test("journal series allow an unknown total but validate a declared total", () => {
  const data = {
    title: "An article", description: "A description", category: "Library design", date: "2026-09-08",
    page: { inputPath: "src/journal/2026-09-08-an-article.md" },
  };
  const validate = (series) => journalData.eleventyDataSchema({ ...data, series });
  assert.doesNotThrow(() => validate({ title: "A series", part: 1 }));
  assert.doesNotThrow(() => validate({ title: "A series", part: 3, total: 3 }));
  assert.throws(() => validate({ title: "A series", part: 4, total: 3 }));
  assert.throws(() => validate({ title: "A series", part: 0 }));
  assert.throws(() => validate({ title: "A series", part: 1, total: 0 }));
});

test("case studies require a company, label, index description and positive display order", () => {
  const data = {
    title: "An article", description: "A description", category: "System design", date: "2026-09-11",
    page: { inputPath: "src/journal/2026-09-11-an-article.md" },
  };
  const caseStudy = { company: "Staple & Sons", label: "Self-managed SMTP", description: "A company profile", order: 1 };
  const validate = (value) => journalData.eleventyDataSchema({ ...data, caseStudy: value });
  assert.doesNotThrow(() => validate(undefined));
  assert.doesNotThrow(() => validate(caseStudy));
  assert.doesNotThrow(() => validate({ ...caseStudy, logo: "/assets/journal/companies/staple-and-sons.png" }));
  assert.throws(() => validate({ ...caseStudy, logo: " " }));
  assert.throws(() => validate({ ...caseStudy, logo: "https://example.com/logo.png" }));
  assert.throws(() => validate({ ...caseStudy, company: " " }));
  assert.throws(() => validate({ ...caseStudy, label: " " }));
  assert.throws(() => validate({ ...caseStudy, label: undefined }));
  assert.throws(() => validate({ ...caseStudy, description: "" }));
  assert.throws(() => validate({ ...caseStudy, order: 0 }));
  assert.throws(() => validate({ ...caseStudy, order: 1.5 }));
  assert.throws(() => validate(true));
});

test("journal banners are optional but require a supported type, header and body together", () => {
  const data = {
    title: "An article", description: "A description", category: "Library design", date: "2026-09-11",
    page: { inputPath: "src/journal/2026-09-11-an-article.md" },
  };
  const banner = { "banner-type": "note", "banner-header": "AI-Assisted", "banner-body": "Reviewed by the author." };
  const validate = (value) => journalData.eleventyDataSchema({ ...data, ...value });
  assert.doesNotThrow(() => validate({}));
  for (const type of ["note", "info", "tip"]) {
    assert.doesNotThrow(() => validate({ ...banner, "banner-type": type }));
  }
  for (const type of ["warning", "NOTE", "", null]) {
    assert.throws(() => validate({ ...banner, "banner-type": type }));
  }
  for (const field of Object.keys(banner)) {
    assert.throws(() => validate({ ...banner, [field]: undefined }), /Provide banner-type, banner-header and banner-body together/);
    assert.throws(() => validate({ ...banner, [field]: " " }));
  }
});

test("journal banner templates preserve custom wording, escape text and have no default disclosure", () => {
  const template = readFileSync(new URL("../src/_includes/components/journal-banner.hbs", import.meta.url), "utf8");
  const render = Handlebars.compile(template);
  assert.equal(render({}).trim(), "");
  for (const type of ["note", "info", "tip"]) {
    const html = render({ "banner-type": type, "banner-header": "Before you begin", "banner-body": "Use the staging server." });
    assert.match(html, new RegExp(`class="journal-banner journal-banner--${type}"`));
    assert.match(html, /aria-label="Before you begin"/);
    assert.match(html, /<strong class="journal-banner-header">Before you begin<\/strong>/);
    assert.match(html, /<p>Use the staging server\.<\/p>/);
    assert.doesNotMatch(html, /AI-assisted|Written without AI/i);
  }
  const html = render({ "banner-type": "info", "banner-header": "<Info> & \"details\"", "banner-body": "<script>alert(1)</script>" });
  assert.match(html, /&lt;Info&gt; &amp; &quot;details&quot;/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("journal navigation sits before and after the content inside the article", () => {
  const template = readFileSync(new URL("../src/_includes/layouts/journal-entry.hbs", import.meta.url), "utf8");
  const handlebars = Handlebars.create();
  for (const partial of ["head", "site-header", "components/journal-banner", "components/archived-source-dialog", "footer"]) {
    handlebars.registerPartial(partial, "");
  }
  handlebars.registerPartial("components/journal-entry-navigation", '<nav class="{{className}}" aria-label="{{label}}"></nav>');
  handlebars.registerHelper("journalHeadings", () => []);
  const html = handlebars.compile(template)({ content: "<p>Article text.</p>" });
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)?.[1];
  assert.ok(article, "The layout should render an article element");
  assert.match(article, /journal-entry-navigation--top[\s\S]*<p>Article text\.<\/p>[\s\S]*journal-entry-navigation--bottom/);
  assert.equal((html.match(/<nav\b/g) ?? []).length, 2);
  assert.equal((article.match(/<nav\b/g) ?? []).length, 2);
  assert.doesNotMatch(article, /class="[^"]*\bshell\b/);
});

test("Markdown heading policy recognizes headings rather than code", () => {
  const markdown = createMarkdownLibrary();
  assert.equal(hasMarkdownHeading(markdown, "# ATX title", 1), true);
  assert.equal(hasMarkdownHeading(markdown, "Setext title\n============", 1), true);
  assert.equal(hasMarkdownHeading(markdown, "```shell\n# a shell comment\n```", 1), false);
});

test("journal TODO policy recognizes HTML comments rather than examples", () => {
  const markdown = createMarkdownLibrary();
  assert.deepEqual(
    findUnresolvedJournalTodo(markdown, "Opening paragraph.\n\n<!-- TODO: verify the date -->\n\nContinue."),
    { line: 3 },
  );
  assert.deepEqual(
    findUnresolvedJournalTodo(markdown, "First line\nsecond line <!-- TODO(publication): add the source -->"),
    { line: 2 },
  );
  assert.equal(findUnresolvedJournalTodo(markdown, "<!-- A normal explanatory comment -->"), null);
  assert.equal(findUnresolvedJournalTodo(markdown, "`<!-- TODO: inline example -->`"), null);
  assert.equal(findUnresolvedJournalTodo(markdown, "```markdown\n<!-- TODO: fenced example -->\n```"), null);

  const unresolved = "Opening paragraph.\n\n<!-- TODO: verify the date -->";
  assert.doesNotThrow(() => enforceJournalTodoPolicy(markdown, unresolved, "draft-entry.md", true));
  assert.throws(
    () => enforceJournalTodoPolicy(markdown, unresolved, "published-entry.md", false),
    /Resolve TODO marker in published-entry\.md:3 before publishing/,
  );
});

test("journal headings receive descriptive permalinks at every supported depth", () => {
  const markdown = createMarkdownLibrary();
  const html = markdown.render("## Hello *world*\n\n#### Deep heading\n\n###### Last heading");
  assert.match(html, /<h2 id="hello-world"><a class="journal-heading-anchor" href="#hello-world" aria-label="Link to Hello world">#<\/a>/);
  assert.match(html, /<h4 id="deep-heading"><a class="journal-heading-anchor" href="#deep-heading" aria-label="Link to Deep heading">#<\/a>/);
  assert.match(html, /<h6 id="last-heading"><a class="journal-heading-anchor" href="#last-heading" aria-label="Link to Last heading">#<\/a>/);
  assert.doesNotMatch(html, /aria-hidden="true"/);
});

test("journal table of contents includes only top-level sections without removing subheading anchors", () => {
  const markdown = createMarkdownLibrary();
  const html = markdown.render([
    "# Article title",
    "## First *section*",
    "### Subsection",
    "#### Details",
    "##### Fine print",
    "###### Footnote",
    "## Next & last",
    "```markdown\n## Not a section\n```",
  ].join("\n\n"));

  assert.deepEqual(headingsFromHtml(html), [
    { depth: 2, id: "first-section", text: "First section" },
    { depth: 2, id: "next-last", text: "Next & last" },
  ]);
  for (const id of ["subsection", "details", "fine-print", "footnote"]) {
    assert.ok(html.includes(`id="${id}"`));
    assert.ok(html.includes(`href="#${id}"`));
  }
  assert.deepEqual(headingsFromHtml(markdown.render("### Subsection only")), []);
});

test("site data validation checks navigation and breadcrumb relationships", () => {
  const site = {
    url: "https://www.simplejavamail.org",
    journal: {
      author: "Maintainer",
      indexUrl: "/engineering-journal.html",
      urlPrefix: "/journal/",
      feedUrl: "/journal/feed.xml",
    },
  };
  const navigation = {
    docsGroups: [{ label: "Maintain", items: [{ title: "Migration notes", url: "/migration-notes.html" }] }],
  };
  const pages = [
    { url: "/engineering-journal.html", data: { layout: "layouts/marketing.hbs" } },
    { url: "/migration-notes.html", data: { layout: "layouts/base.hbs" } },
    { url: "/migration-notes-10.0.0.html", data: { layout: "layouts/base.hbs", breadcrumbParent: "/migration-notes.html" } },
  ];

  assert.doesNotThrow(() => validateSiteData(site, navigation, pages));
  assert.throws(
    () => validateSiteData(site, { docsGroups: [{ items: [{ title: "Missing", url: "/missing.html" }] }] }, pages),
    /documentation navigation references missing page \/missing\.html/,
  );
  assert.throws(
    () => validateSiteData(site, navigation, [...pages, { url: "/orphan.html", data: { layout: "layouts/base.hbs", breadcrumbParent: "/missing.html" } }]),
    /breadcrumb parent references missing page \/missing\.html/,
  );
});

test("Markdown Mermaid fences become progressively enhanced journal diagrams", () => {
  const markdown = createMarkdownLibrary();
  const rendered = markdown.render("```mermaid\nflowchart LR\n  A --> B\n  C[<script>]\n```\n");
  assert.match(rendered, /<figure class="journal-diagram" data-pagefind-ignore>/);
  assert.match(rendered, /<pre class="mermaid">/);
  assert.match(rendered, /C\[&lt;script&gt;\]/);
  assert.doesNotMatch(rendered, /language-mermaid/);
});

test("Mermaid flowcharts and sequence diagrams share a single figure with their captions", () => {
  const markdown = createMarkdownLibrary();
  const diagrams = [
    'flowchart LR\nA["<value>"] --> B',
    'sequenceDiagram\nworker->>store: Attempt <result>',
  ];
  for (const diagram of diagrams) {
    const rendered = markdown.render('```mermaid\n' + diagram + '\n```\n\n*Store `id` & inspect [the result](/docs.html).*\n\nNext paragraph.\n');
    assert.equal((rendered.match(/<figure\b/g) || []).length, 1);
    assert.match(rendered, /<figure class="journal-captioned journal-diagram" data-pagefind-ignore="">\s*<pre class="mermaid">/);
    assert.match(rendered, /&lt;(?:value|result)&gt;/);
    assert.match(rendered, /<\/pre>\s*<figcaption>Store <code>id<\/code> &amp; inspect <a href="\/docs\.html">the result<\/a>\.<\/figcaption>\s*<\/figure>\s*<p>Next paragraph\.<\/p>/);
    assert.doesNotMatch(rendered, /<em>|language-mermaid/);
  }
});

test("compact Mermaid sizing uses a comment inside a standard fence, with or without captions", () => {
  const markdown = createMarkdownLibrary();
  for (const caption of ["", "\n*The regional mail setup.*\n"]) {
    for (const newline of ["\n", "\r\n"]) {
      const source = ('```mermaid\n%% journal: compact\nflowchart TB\nA --> B\n```\n' + caption).replaceAll("\n", newline);
      assert.equal(markdown.parse(source, {}).find((token) => token.type === "fence").info, "mermaid");
      const rendered = markdown.render(source);
      assert.match(rendered, /<pre class="mermaid mermaid-compact">%% journal: compact\nflowchart TB/);
      assert.equal((rendered.match(/<figure\b/g) || []).length, 1);
      assert.equal(rendered.includes("<figcaption>"), Boolean(caption));
    }
  }
  assert.doesNotMatch(markdown.render('```mermaid\nflowchart TB\nA --> B\n```\n'), /mermaid-compact/);
  assert.doesNotMatch(markdown.render('```mermaid\n%% journal: compactish\nflowchart TB\nA --> B\n```\n'), /mermaid-compact/);
  assert.doesNotMatch(markdown.render('```java\n%% journal: compact\ncall();\n```\n'), /mermaid-compact/);
});

test("consecutive diagram, code and image captions remain separate figures", () => {
  const markdown = createMarkdownLibrary();
  const rendered = markdown.render('```mermaid\nflowchart LR\nA --> B\n```\n\n*Claim the job.*\n\n```java\ncall();\n```\n\n*Send the email.*\n\n![Result](/result.png)\n\n_Inspect the result._\n\n```mermaid\nsequenceDiagram\nA->>B: Next job\n```\n\nOrdinary prose.\n');
  assert.equal((rendered.match(/<figure\b/g) || []).length, 4);
  assert.equal((rendered.match(/<figcaption>/g) || []).length, 3);
  assert.equal((rendered.match(/class="journal-captioned journal-diagram"/g) || []).length, 1);
  assert.match(rendered, /<figure class="journal-diagram" data-pagefind-ignore><pre class="mermaid">sequenceDiagram/);
  assert.match(rendered, /<\/figure>\s*<p>Ordinary prose\.<\/p>/);
});

test("italic paragraphs caption fenced code without changing code, links or following prose", () => {
  const markdown = createMarkdownLibrary();
  const rendered = markdown.render('```java\ncall("<value>");\n```\n\n*Save `id` & check [the result](/docs.html).*\n\nNext paragraph.\n');
  assert.match(rendered, /<figure class="journal-captioned">\s*<pre><code class="language-java">call\(&quot;&lt;value&gt;&quot;\);/);
  assert.match(rendered, /<figcaption>Save <code>id<\/code> &amp; check <a href="\/docs\.html">the result<\/a>\.<\/figcaption>/);
  assert.match(rendered, /<\/figure>\s*<p>Next paragraph\.<\/p>/);
  assert.doesNotMatch(rendered, /<em>/);
});

test("image captions preserve separate alt text and raw image attributes", () => {
  const markdown = createMarkdownLibrary();
  const rendered = markdown.render('![Image description](/sample.png)\n\n*A visible caption.*\n\n<img src="/sample.png" alt="A > B" class="journal-paragraph-image image-align-right" style="width:200px;" />\n\n_Another caption._\n');
  assert.equal((rendered.match(/<figure class="journal-captioned">/g) || []).length, 2);
  assert.match(rendered, /<img src="\/sample\.png" alt="Image description">\s*<figcaption>A visible caption\.<\/figcaption>/);
  assert.match(rendered, /alt="A > B" class="journal-paragraph-image image-align-right" style="width:200px;"/);
  assert.match(rendered, /<figcaption>Another caption\.<\/figcaption>/);
  assert.doesNotMatch(rendered, /<p>\s*<img/);
});

test("caption recognition leaves ordinary prose, mixed emphasis and nested content alone", () => {
  const markdown = createMarkdownLibrary();
  const samples = [
    '```java\ncall();\n```\n\nAn ordinary paragraph.\n',
    '```java\ncall();\n```\n\n*One phrase* and *another*.\n',
    '```java\ncall();\n```\n\n*One* *another*\n',
    '```java\ncall();\n```\n\nAn intervening paragraph.\n\n*An aside.*\n',
    'A paragraph with ![an image](/sample.png).\n\n*An aside.*\n',
    '<img src="/one.png"><img src="/two.png">\n\n*An aside.*\n',
    '> ```java\n> call();\n> ```\n>\n> *Quoted prose.*\n',
    '- ![Image](/sample.png)\n\n  *List prose.*\n',
    '```mermaid\nflowchart LR\nA --> B\n```\n\nOrdinary diagram prose.\n',
    '> ```mermaid\n> flowchart LR\n> A --> B\n> ```\n>\n> *Quoted diagram prose.*\n',
  ];
  for (const source of samples) assert.doesNotMatch(markdown.render(source), /journal-captioned|figcaption/, source);
});

test("caption markup does not hide publication TODOs", () => {
  for (const language of ["java", "mermaid"]) {
    const source = '```' + language + '\nexample\n```\n\n*A caption <!-- TODO: verify the example -->.*\n';
    assert.throws(() => enforceJournalTodoPolicy(createMarkdownLibrary(), source, "example.md", false), /Resolve TODO marker/);
  }
});

test("documentation navigation supports always-visible child pages", () => {
  const groups = [{
    label: "Build and configure",
    items: [{
      title: "Configuration",
      url: "/configuration.html",
      children: [{ title: "Spring integration", url: "/spring.html" }],
    }],
  }];
  const site = {
    url: "https://www.simplejavamail.org",
    journal: {
      author: "Maintainer",
      indexUrl: "/engineering-journal.html",
      urlPrefix: "/journal/",
      feedUrl: "/journal/feed.xml",
    },
  };
  const pages = [
    { url: "/engineering-journal.html", data: { layout: "layouts/marketing.hbs" } },
    { url: "/configuration.html", data: { layout: "layouts/base.hbs" } },
    { url: "/spring.html", data: { layout: "layouts/base.hbs", breadcrumbParent: "/configuration.html" } },
  ];

  assert.equal(navItemForUrl(groups, "/spring.html")?.title, "Spring integration");
  assert.doesNotThrow(() => validateSiteData(site, { docsGroups: groups }, pages));
  assert.throws(
    () => validateSiteData(site, { docsGroups: groups }, pages.filter((page) => page.url !== "/spring.html")),
    /documentation navigation references missing page \/spring\.html/,
  );
});

test("journal URLs and feed dates retain the established public format", () => {
  assert.equal(journalArticleUrl({ journal: { urlPrefix: "/journal" } }, "an-entry"), "/journal/an-entry.html");
  assert.equal(formatDate("2026-08-26"), "August 2026");
  assert.equal(rssDate("2026-08-26"), "Wed, 26 Aug 2026 12:00:00 GMT");
});

test("journal series use their first part's date and retain part order", () => {
  const entry = (url, date, part) => ({
    url,
    date: new Date(`${date}T00:00:00Z`),
    data: {
      title: url,
      category: "Project history",
      date,
      ...(part ? { series: { title: "Twenty Years", part, total: 3 } } : {}),
    },
  });
  const entries = [
    entry("/origin.html", "2026-08-29"),
    entry("/part-1.html", "2026-09-01", 1),
    entry("/part-2.html", "2026-09-02", 2),
    entry("/part-3.html", "2026-09-03", 3),
    entry("/later.html", "2026-09-02"),
  ];

  assert.deepEqual(
    orderJournalEntries(entries).map(({ url }) => url),
    ["/origin.html", "/part-1.html", "/part-2.html", "/part-3.html", "/later.html"],
  );
  assert.deepEqual(
    orderJournalEntries(entries, true).map(({ url }) => url),
    ["/later.html", "/part-3.html", "/part-2.html", "/part-1.html", "/origin.html"],
  );
  assert.equal(journalNeighbor(entries, "/part-1.html", "newer").url, "/part-2.html");
  assert.equal(journalNeighbor(entries, "/part-3.html", "newer").url, "/later.html");
});

test("Google Code snapshots retain the archive identities and render comments safely", async () => {
  const issues = await loadGoogleCodeIssues();
  const vesijamaIssue = issues.find((issue) => issue.project === "vesijama" && issue.id === 1);
  const unavailableAttachment = issues.find((issue) => issue.project === "simple-java-mail" && issue.id === 4)?.comments[0].attachments[0];
  assert.equal(issues.length, 15);
  assert.equal(vesijamaIssue?.comments[1].identity, googleCodePseudoIdentity(-8351100562032279782));
  assert.equal(vesijamaIssue?.comments[1].posted.iso, googleCodeTimestamp(1244071477).iso);
  assert.equal(unavailableAttachment?.available, false);

  const markdown = createGoogleCodeCommentLibrary();
  assert.equal(decodeGoogleCodeEntities('&quot;quoted&quot;'), '"quoted"');
  const rendered = markdown.render(decodeGoogleCodeEntities('&lt;script&gt;alert(&quot;not safe&quot;)&lt;/script&gt;\n\nhttps://example.com'));
  assert.doesNotMatch(rendered, /<script>/);
  assert.match(rendered, /&lt;script&gt;/);
  assert.match(rendered, /href="https:\/\/example\.com"/);
});

test("Google Code project and wiki snapshots repair links without reviving unsafe markup", async () => {
  const projects = await loadGoogleCodeProjects();
  const wikis = await loadGoogleCodeWikis();
  assert.equal(projects.length, 2);
  assert.equal(wikis.length, 2);

  const projectMarkdown = createGoogleCodeProjectLibrary();
  const simpleJavaMail = projects.find((project) => project.project === "simple-java-mail");
  const renderedProject = projectMarkdown.render(simpleJavaMail?.description || "");
  assert.match(renderedProject, /href="\/sources\/google-code\/simple-java-mail\/wiki\/manual\.html"/);
  assert.match(renderedProject, /blob\/0cccba388d3420efab84c70e4cda86c36d82069d\/javadoc\/users\/index\.html/);

  const vesijamaManual = wikis.find((wiki) => wiki.project === "vesijama");
  assert.match(vesijamaManual?.contentHtml || "", /blob\/4d5bf205a1a5193d4ea1d655f98e875f0b026e7f\/NOTICE\.txt/);
  assert.doesNotMatch(vesijamaManual?.contentHtml || "", /href="https?:\/\/(?:code\.google\.com|[^"/]+\.googlecode\.com)/i);

  assert.equal(
    googleCodeArchiveLink("https://web.archive.org/web/20150531075139/http://code.google.com/p/vesijama/wiki/Manual"),
    "/sources/google-code/vesijama/wiki/manual.html",
  );
  assert.equal(
    googleCodeArchiveLink("http://code.google.com/p/simple-java-mail/source/browse/tags/vesijama%20v1.1/src/org/codemonkey/vesijama/Mailer.java"),
    "https://github.com/bbottema/simple-java-mail/blob/5a4d1bcd69bd587dc143eabaf68579ff5be45923/src/org/codemonkey/vesijama/Mailer.java",
  );

  const unsafeWiki = sanitizeGoogleCodeWikiHtml('<h1><a name="Safe">Safe</a></h1><script>alert(1)</script><a href="javascript:alert(2)">bad</a>');
  assert.match(unsafeWiki, /<h1 id="Safe">Safe<\/h1>/);
  assert.doesNotMatch(unsafeWiki, /script|javascript|alert/i);
});

test("Project Nibble snapshots preserve posts and exact comment citations safely", async () => {
  const posts = await loadProjectNibblePosts();
  const origin = posts.find((post) => post.slug === "vesijama-very-simple-java-mail");
  assert.equal(posts.length, 3);
  assert.equal(posts.reduce((total, post) => total + post.comments.length, 0), 41);
  assert.equal(origin?.comments.find((comment) => comment.id === 1221)?.author, "Davin");
  assert.equal(origin?.comments.find((comment) => comment.id === 1305)?.author, "canistel");
  assert.match(origin?.contentHtml || "", /email\.setTextHTML/);
  assert.doesNotMatch(origin?.contentHtml || "", /onclick=|<script/i);

  assert.equal(
    projectNibbleArchiveLink("https://web.archive.org/web/20150531075139/http://blog.projectnibble.org/2009/04/27/vesijama-very-simple-java-mail/comment-page-1/#comment-1305"),
    "/sources/project-nibble/vesijama-very-simple-java-mail.html#comment-1305",
  );
  assert.equal(
    projectNibbleArchiveLink("https://web.archive.org/web/20150531075139/http://code.google.com/p/simple-java-mail/issues/detail?id=7"),
    "/sources/google-code/simple-java-mail/issue-7.html",
  );
  assert.equal(
    projectNibbleArchiveLink("https://web.archive.org/web/20120722092115/http://search.maven.org/#artifactdetails%7Corg.codemonkey.simplejavamail%7Csimple-java-mail%7C1.8%7Cjar"),
    "https://repo1.maven.org/maven2/org/codemonkey/simplejavamail/simple-java-mail/1.9.1/",
  );
  const unsafe = sanitizeProjectNibbleHtml('<script>alert(1)</script><a href="javascript:alert(2)">bad</a><p>fine</p>');
  assert.doesNotMatch(unsafe, /script|javascript|alert/i);
  assert.match(unsafe, /<p>fine<\/p>/);
});

test("SourceForge snapshots preserve complete discussions and readable historic records", async () => {
  const sources = await loadSourceForgeSources();
  assert.equal(sources.length, 7);

  const discussions = sources.filter((source) => source.kind === "discussion");
  assert.equal(discussions.reduce((total, source) => total + source.posts.length, 0), 20);
  const yahoo = discussions.find((source) => source.slug === "dkim-javamail-yahoo-signatures");
  assert.equal(yahoo?.posts.find((post) => post.slug === "a7cd/57b5/60e8")?.anchor, "a7cd/57b5/60e8");
  const resolution = yahoo?.posts.find((post) => post.slug === "a7cd/57b5/60e8");
  assert.equal(resolution?.authorName, "Florian Sager");
  assert.match(resolution?.text || "", /v1\.3/i);

  const ticket = sources.find((source) => source.slug === "javamail-crypto-bug-3");
  assert.match(ticket?.payload.ticket.description || "", /addHeader instead of\s+setHeader/);
  const mail = sources.find((source) => source.slug === "javamail-crypto-message-457552");
  assert.match(mail?.payload.body || "", /application\/x-pkcs7-signature/);
  assert.doesNotMatch(mail?.payload.body || "", /=(?:20|A0|E9|C0)(?:\b|$)/);

  assert.equal(
    sourceForgeArchiveLink("https://sourceforge.net/p/dkim-javamail/discussion/893011/thread/c25e4d2b/#a7cd/57b5/60e8"),
    "/sources/sourceforge/dkim-javamail/discussion/error-sending-to-yahoo.html#a7cd/57b5/60e8",
  );
  assert.equal(
    sourceForgeArchiveLink("https://sourceforge.net/project/showfiles.php?group%5C_id=246725"),
    "https://sourceforge.net/projects/dkim-javamail/files/",
  );
  assert.equal(decodeSourceForgeEntities("one&nbsp;two"), "one\u00a0two");
  const markdown = createSourceForgeMarkupLibrary();
  assert.doesNotMatch(markdown.render('<script>alert("unsafe")</script>'), /<script>/);
});
