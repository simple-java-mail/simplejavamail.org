import assert from "node:assert/strict";
import test from "node:test";
import {
  createMarkdownLibrary,
  enforceJournalTodoPolicy,
  findUnresolvedJournalTodo,
  hasMarkdownHeading,
  journalArticleUrl,
  rssDate,
  validateSiteData,
} from "../src/_lib/eleventy-helpers.mjs";

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

test("journal URLs and feed dates retain the established public format", () => {
  assert.equal(journalArticleUrl({ journal: { urlPrefix: "/journal" } }, "an-entry"), "/journal/an-entry.html");
  assert.equal(rssDate("2026-08-26"), "Wed, 26 Aug 2026 12:00:00 GMT");
});
