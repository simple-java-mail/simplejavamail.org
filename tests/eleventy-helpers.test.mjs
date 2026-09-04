import assert from "node:assert/strict";
import test from "node:test";
import {
  createMarkdownLibrary,
  enforceJournalTodoPolicy,
  findUnresolvedJournalTodo,
  formatDate,
  hasMarkdownHeading,
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
