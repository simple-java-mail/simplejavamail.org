import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Handlebars from "handlebars";
import journalData from "../src/journal/journal.11tydata.mjs";
import caseStudyData from "../src/case-studies/case-studies.11tydata.mjs";
import { articleNeighbor, articleUrl, orderCaseStudies } from "../src/_lib/article-context.mjs";
import { enforceArticlePolicy, enforceJournalPolicy } from "../src/_lib/article-policy.mjs";
import { createMarkdownLibrary } from "../src/_lib/eleventy-helpers.mjs";
import { journalCommentConfig, validateCommentsUrl } from "../src/_lib/journal-comments.mjs";

const site = { url: "https://www.simplejavamail.org", name: "Simple Java Mail",
  journal: { author: "Benny Bottema", urlPrefix: "/journal/", indexUrl: "/engineering-journal.html" } };
const data = {
  site, title: "A case study", description: "A worked example", category: "System design", date: "2026-09-12",
  page: { fileSlug: "relaydesk", inputPath: "src/case-studies/relaydesk.md" },
  articleSection: caseStudyData.articleSection,
  journalComments: { host: "https://comments.simplejavamail.org", siteId: "simplejavamail" },
  caseStudy: { company: "RelayDesk", label: "Multi-tenant communications", description: "A repair gig", order: 3 },
};
const entries = ["staple-and-sons", "polar-meridian", "relaydesk"].map((slug, index) => ({
  url: `/case-studies/${slug}.html`, data: { title: slug, category: "System design", caseStudy: { order: index + 1 } },
}));

test("case studies are independently tagged and share the article renderer with the Journal", () => {
  assert.deepEqual(caseStudyData.tags, ["caseStudy", "publicPage"]);
  assert.deepEqual(journalData.tags, ["journal", "publicPage"]);
  assert.equal(caseStudyData.layout, journalData.layout);
  assert.equal(caseStudyData.layout, "layouts/article.hbs");
  assert.equal(caseStudyData.breadcrumbParent, "/case-studies.html");
  assert.equal(caseStudyData.articleSection.tocLabel, "In this case study");
  assert.equal(journalData.articleSection.tocLabel, "In this entry");
  assert.doesNotThrow(() => caseStudyData.eleventyDataSchema(data));
  assert.throws(() => caseStudyData.eleventyDataSchema({ ...data, caseStudy: undefined }), /require caseStudy/);
  assert.throws(() => caseStudyData.eleventyDataSchema({ ...data, date: "2026-02-30" }));
});

test("case-study permalink, structured data and discussion share the company URL", () => {
  const expected = "/case-studies/relaydesk.html";
  assert.equal(articleUrl(data), expected);
  assert.equal(caseStudyData.eleventyComputed.permalink(data), expected);
  assert.equal(journalCommentConfig(data).url, site.url + expected);
  const schema = caseStudyData.eleventyComputed.schema(data);
  assert.equal(schema.mainEntityOfPage, site.url + expected);
  assert.equal(schema.isPartOf, site.url + "/case-studies.html");
  const journal = { ...data, page: { fileSlug: "my-experience" }, articleSection: journalData.articleSection };
  assert.equal(journalData.eleventyComputed.permalink(journal), "/journal/my-experience.html");
  assert.equal(journalData.eleventyComputed.schema(journal).isPartOf, site.url + "/engineering-journal.html");
});

test("discussion overrides accept canonical case studies without weakening origin or URL restrictions", () => {
  assert.doesNotThrow(() => validateCommentsUrl(site.url + "/case-studies/relaydesk.html", site));
  for (const url of ["https://evil.example/case-studies/relaydesk.html", site.url + "/case-studies.html",
    site.url + "/case-studies/relaydesk.html?preview=1", site.url + "/case-studies/relaydesk.html#intro",
    "https://user@www.simplejavamail.org/case-studies/relaydesk.html"]) {
    assert.throws(() => validateCommentsUrl(url, site));
  }
});

test("case-study navigation follows display order rather than publication dates", () => {
  const shuffled = [entries[2], entries[0], entries[1]];
  assert.deepEqual(orderCaseStudies(shuffled), entries);
  assert.equal(articleNeighbor(shuffled, entries[1].url, "older", "caseStudy").url, entries[0].url);
  assert.equal(articleNeighbor(shuffled, entries[1].url, "newer", "caseStudy").url, entries[2].url);
  assert.equal(articleNeighbor(entries, entries[0].url, "older", "caseStudy"), null);
  assert.equal(articleNeighbor(entries, entries[2].url, "newer", "caseStudy"), null);
  assert.equal(articleNeighbor(entries.slice(0, 2), entries[1].url, "newer", "caseStudy"), null);
  assert.equal(articleNeighbor(entries, "/missing.html", "older", "caseStudy"), null);
});

test("case-study navigation falls back to its own index and stops at the last company", () => {
  const handlebars = Handlebars.create();
  handlebars.registerHelper("articleNeighbor", articleNeighbor);
  const render = handlebars.compile(readFileSync(new URL("../src/_includes/components/article-navigation.hbs", import.meta.url), "utf8"));
  const first = render({ articleSection: data.articleSection, navigationEntries: entries, page: { url: entries[0].url } });
  assert.match(first, /href="\/case-studies.html"/);
  assert.match(first, /href="\/case-studies\/polar-meridian.html"/);
  assert.doesNotMatch(first, /Engineering Journal|\/journal\//);
  const last = render({ articleSection: data.articleSection, navigationEntries: entries, page: { url: entries[2].url } });
  assert.match(last, /polar-meridian.html/);
  assert.doesNotMatch(last, /journal-entry-next/);
});

test("only Journal publication policy excludes drafts; shared validation remains intact", () => {
  const markdown = createMarkdownLibrary();
  assert.equal(enforceJournalPolicy(markdown, "A draft <!-- TODO: verify -->", "journal-entry.md", true, "build"), false);
  assert.equal(enforceJournalPolicy(markdown, "A draft <!-- TODO: verify -->", "journal-entry.md", true, "serve"), undefined);
  assert.equal(enforceJournalPolicy(markdown, "A finished entry", "journal-entry.md", false, "build"), undefined);
  assert.throws(() => enforceJournalPolicy(markdown, "A page <!-- TODO: verify -->", "journal-entry.md", false, "build"), /Resolve TODO/);
  assert.equal(enforceArticlePolicy(markdown, "A case study", "relaydesk.md"), undefined);
  assert.throws(() => enforceArticlePolicy(markdown, "A page <!-- TODO: verify -->", "relaydesk.md"), /Resolve TODO/);
  assert.throws(() => enforceArticlePolicy(markdown, "# Extra title", "relaydesk.md"), /front matter title/);
  assert.throws(() => enforceArticlePolicy(markdown, "  ", "relaydesk.md"), /body is empty/);
  assert.throws(() => enforceArticlePolicy(markdown, "A page", "Bad Name.md"), /kebab-case/);
});

test("draft schema and noindex metadata belong only to Journal entries", () => {
  assert.equal(journalData.eleventyComputed.journalDraft({ ...data, draft: true }), true);
  assert.equal(journalData.eleventyComputed.journalDraft({ ...data, draft: false }), false);
  assert.equal(caseStudyData.eleventyComputed.journalDraft, undefined);
  assert.throws(() => journalData.eleventyDataSchema({ ...data, draft: "yes" }));
  const handlebars = Handlebars.create();
  handlebars.registerHelper("eq", (left, right) => left === right);
  const head = handlebars.compile(readFileSync(new URL("../src/_includes/head.hbs", import.meta.url), "utf8"));
  assert.doesNotMatch(head({ ...data, draft: true }), /name="robots" content="noindex, nofollow"/);
  assert.match(head({ ...data, journalDraft: true }), /name="robots" content="noindex, nofollow"/);
  for (const company of entries) {
    const source = readFileSync(new URL(`../src${company.url.replace(/\.html$/, ".md")}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /^draft(?:-note)?:/m);
  }
});
