import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Handlebars from "handlebars";
import guideData from "../src/guides/guides.11tydata.mjs";
import { enforceArticlePolicy } from "../src/_lib/article-policy.mjs";
import { createMarkdownLibrary } from "../src/_lib/eleventy-helpers.mjs";
import { fieldGuideSections } from "../src/_lib/field-guide-sections.mjs";
import { patternCategoryInfo } from "../src/_lib/patterns.mjs";
import { createTemplateHelpers } from "../src/_lib/template-helpers.mjs";

const source = readFileSync(new URL("../src/guides/email-workloads.md", import.meta.url), "utf8");
const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
const directory = JSON.parse(readFileSync(new URL("../src/guides/email-workloads.11tydata.json", import.meta.url), "utf8"));
const groups = directory.guideGroups;
const markdown = createMarkdownLibrary();
const html = markdown.render(body);

test("field guides are independent references without per-page draft publication controls", () => {
  assert.deepEqual(guideData.tags, ["fieldGuide", "publicPage"]);
  assert.equal(guideData.layout, "layouts/field-guide.hbs");
  assert.match(source, /permalink: "\/email-workload-field-guide.html"/);
  assert.doesNotMatch(source, /^draft(?:-note)?:/m);
  assert.equal(enforceArticlePolicy(markdown, body, "email-workloads.md"), undefined);
  assert.doesNotMatch(body, /\/journal\/when-one-email/);
});

test("every directory group and scenario resolves to its own matching heading", () => {
  const headingIds = [...html.matchAll(/<h([23]) id="([^"]+)"/g)].map((match) => [Number(match[1]), match[2]]);
  const expected = groups.flatMap((group) => [[2, group.id], ...group.scenarios.map((scenario) => [3, scenario.id])]);
  assert.deepEqual(headingIds, expected);
  const scenarios = groups.flatMap((group) => group.scenarios);
  assert.equal(scenarios.length, 26);
  assert.equal((html.match(/class="field-guide-goal"/g) || []).length, scenarios.length);
  assert.doesNotMatch(html, /field-guide-check|Try it:/);
});

test("Tactical Patterns uses the docs frame with one title and both navigation rails", () => {
  const layout = readFileSync(new URL("../src/_includes/layouts/field-guide.hbs", import.meta.url), "utf8");
  assert.match(layout, /layout: "layouts\/base.hbs"/);
  assert.match(layout, /customDocsContent: true/);
  const handlebars = Handlebars.create();
  for (const name of ["head", "site-header", "footer", "breadcrumbs"]) handlebars.registerPartial(name, "");
  handlebars.registerPartial("docs-sidebar", '<aside class="docs-sidebar">Documentation navigation</aside>');
  handlebars.registerHelper("fieldGuideSections", fieldGuideSections);
  const content = handlebars.compile(layout.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""))({
    title: "Tactical Patterns", description: "Patterns", ...directory, content: html,
  });
  const base = readFileSync(new URL("../src/_includes/layouts/base.hbs", import.meta.url), "utf8");
  const result = handlebars.compile(base)({ title: "Tactical Patterns", customDocsContent: true, content });
  assert.match(result, /class="docs-page"/);
  assert.match(result, /class="docs-sidebar"/);
  assert.match(result, /class="journal-entry-toc"/);
  assert.match(result, /class="journal-prose field-guide-content"/);
  assert.equal((result.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(result, /legacy-doc-content/);
});

test("directory validation rejects ambiguous anchors and missing scenario targets", () => {
  const valid = { title: "Guide", description: "Workload patterns", ...directory };
  assert.doesNotThrow(() => guideData.eleventyDataSchema(valid));
  const duplicate = structuredClone(valid);
  duplicate.guideGroups[0].scenarios[0].id = duplicate.guideGroups[0].id;
  assert.throws(() => guideData.eleventyDataSchema(duplicate), /anchors must be unique/);
  const missing = structuredClone(valid);
  delete missing.guideGroups[0].scenarios[0].target;
  assert.throws(() => guideData.eleventyDataSchema(missing));
});

test("the lookup lists scenarios while the reading rail keeps top-level anchors only", () => {
  const layout = readFileSync(new URL("../src/_includes/layouts/field-guide.hbs", import.meta.url), "utf8");
  Handlebars.registerHelper("fieldGuideSections", fieldGuideSections);
  Handlebars.registerHelper("patternCategoryInfo", patternCategoryInfo);
  for (const [name, helper] of Object.entries(createTemplateHelpers())) Handlebars.registerHelper(name, helper);
  Handlebars.registerPartial("breadcrumbs", readFileSync(new URL("../src/_includes/breadcrumbs.hbs", import.meta.url), "utf8"));
  const render = Handlebars.compile(layout.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""));
  const result = render({ title: "Guide", description: "Patterns", patternCategory: "tactical", ...directory, content: html });
  const lookup = result.split('<div class="shell field-guide-grid">')[0];
  const rail = result.match(/<aside[\s\S]*?<\/aside>/)[0];
  for (const group of groups) {
    assert.ok(rail.includes(`href="#${group.id}"`));
    for (const scenario of group.scenarios) {
      assert.ok(lookup.includes(`href="#${scenario.id}"`));
      assert.ok(!rail.includes(`href="#${scenario.id}"`));
    }
  }
  assert.doesNotMatch(result, /Working draft/);
  assert.doesNotMatch(result, /pattern-badge|← Use cases/);
  assert.equal(guideData.breadcrumbParent, "/patterns.html");
  assert.match(rail, /href="\/patterns.html">All patterns<\/a>/);
});

test("visible Java snippets are present verbatim in the downloadable examples", () => {
  const java = readFileSync(new URL("../src/assets/guides/email-workloads/FieldGuideExamples.java", import.meta.url), "utf8");
  const compact = (value) => value.replace(/\s+/g, " ").trim();
  const blocks = [...body.matchAll(/```java\r?\n([\s\S]*?)\r?\n```/g)];
  assert.equal(blocks.length, 15);
  for (const [, snippet] of blocks) assert.ok(compact(java).includes(compact(snippet)), snippet);
  const allBlocks = [...body.matchAll(/```(?:java|text)\r?\n[\s\S]*?\r?\n```/g)];
  assert.equal((html.match(/class="journal-captioned"/g) || []).length, allBlocks.length);
});

test("local indexes derive all scenario links from the directory without changing the rail", () => {
  const result = fieldGuideSections(html, groups);
  const indexes = [...result.matchAll(/<nav class="field-guide-section-toc"[\s\S]*?<\/nav>/g)];
  assert.equal(indexes.length, groups.length);
  for (const [index, group] of groups.entries()) {
    assert.ok(result.includes(`</h2>\n${indexes[index][0]}`));
    for (const scenario of group.scenarios) {
      assert.ok(indexes[index][0].includes(`href="#${scenario.id}"`));
    }
    assert.equal((indexes[index][0].match(/<li>/g) || []).length, group.scenarios.length);
  }
  const escaped = fieldGuideSections('<h2 id="group">Group</h2><h3 id="scenario">Scenario</h3>', [
    { id: "group", title: 'A "quote"', scenarios: [{ id: "scenario", title: "A < B" }] }
  ]);
  assert.match(escaped, /Scenarios: A &quot;quote&quot;/);
  assert.match(escaped, /A &lt; B/);
  assert.throws(() => fieldGuideSections("", groups), /exactly one H2/);
  assert.throws(() => fieldGuideSections('<h2 id="group">Group</h2>', [
    { id: "group", title: "Group", scenarios: [{ id: "missing", title: "Missing" }] }
  ]), /missing its H3/);
});

test("scenarios provide deep reference links including the optional batch module", () => {
  assert.match(body, /optional \[batch module\]\(\/modules.html#batch-module\)/);
  for (const section of body.split(/^### /m).slice(1)) {
    assert.match(section, /\]\(\/(?:features|sending-and-execution|analyzing-send-results|debugging|configuration|security|modules|smtp-connection-failover)\.html#/);
  }
});

test("capability mentions link directly to their relevant deeper explanations", () => {
  for (const [text, destination] of [
    ["probe", "/debugging.html#section-smtp-capabilities"],
    ["sequential batch over one connection", "/sending-and-execution.html#section-not-reusing-connections"],
    ["whole-operation deadline", "/sending-and-execution.html#section-send-deadlines"],
    ["Build replacement Mailers from the new configuration", "/configuration.html#section-config-snapshot"],
    ["`SMTPUTF8`", "/features.html#section-international-mail"],
    ["`8BITMIME`", "/features.html#section-international-mail"],
    ["OpenPGP", "/security.html#section-sending-openpgp"],
    ["envelope-sender address", "/features.html#section-bouncing-emails"],
    ["completion observer", "/analyzing-send-results.html#section-observer-results"],
  ]) {
    assert.ok(body.includes(`[${text}](${destination})`), text);
  }
  assert.match(body, /RelayDesk's recipient-specific example\]\(\/case-studies\/relaydesk\.html#retry-the-warehouse-s-copy-not-the-buyer-s\)/);
});

test("Use cases offers a route to the shared Patterns home", () => {
  const template = readFileSync(new URL("../src/pages/use-cases.hbs", import.meta.url), "utf8");
  assert.match(template, /href="\/patterns\.html"/);
  assert.doesNotMatch(template, /data\.draft|working draft/i);
});

test("the Docs dropdown offers one combined Patterns link without badge headings", () => {
  const handlebars = Handlebars.create();
  handlebars.registerHelper("eq", (left, right) => left === right);
  handlebars.registerHelper("activeClass", (url, current) => url === current ? "is-active" : "");
  const nav = JSON.parse(readFileSync(new URL("../src/_data/nav.json", import.meta.url), "utf8"));
  const template = readFileSync(new URL("../src/_includes/site-header.hbs", import.meta.url), "utf8");
  assert.doesNotMatch(template, /field-guide-menu-items|pattern-badge/);
  const preview = handlebars.compile(template)({ nav, page: { url: "/docs.html" } });
  const menu = preview.match(/<ul id="primary-docs-submenu"[\s\S]*?<\/ul>/)[0];
  assert.match(menu, /href="\/patterns\.html"[^>]*>Tactical\/strategic patterns<\/a>/);
  assert.equal((menu.match(/href="\/patterns\.html"/g) || []).length, 1);
  assert.doesNotMatch(menu, /email-workload-field-guide|strategic-patterns/);
  assert.match(menu, /href="\/use-cases\.html"/);
  assert.match(menu, /href="\/modules\.html"/);
});

test("the docs sidebar gives Patterns a home and retains direct access to both collections", () => {
  const handlebars = Handlebars.create();
  handlebars.registerHelper("eq", (left, right) => left === right);
  handlebars.registerHelper("docsActiveClass", createTemplateHelpers().docsActiveClass);
  const nav = JSON.parse(readFileSync(new URL("../src/_data/nav.json", import.meta.url), "utf8"));
  const render = handlebars.compile(readFileSync(new URL("../src/_includes/docs-sidebar.hbs", import.meta.url), "utf8"));
  for (const [url, parent, activeLabel] of [
    ["/email-workload-field-guide.html", "/patterns.html", "Tactical Patterns"],
    ["/strategic-patterns.html", "/patterns.html", "Strategic Patterns"],
    ["/patterns/transaction-outbox.html", "/strategic-patterns.html", null],
    ["/sending-and-execution.html", "/configuration.html", "Sending and execution"],
  ]) {
    const menu = render({ nav, page: { url }, breadcrumbParent: parent });
    assert.equal((menu.match(/>Tactical Patterns<\/a>/g) || []).length, 1);
    assert.equal((menu.match(/>Strategic Patterns<\/a>/g) || []).length, 1);
    const activeLabels = [...menu.matchAll(/class="is-active">([^<]+)<\/a>/g)].map((match) => match[1]);
    assert.deepEqual(activeLabels, activeLabel ? [activeLabel] : []);
    assert.match(menu, /<a href="\/patterns.html"[^>]*>Patterns<\/a>\s*<ul class="docs-nav-children">\s*<li><a href="\/email-workload-field-guide\.html"[^>]*>Tactical Patterns<\/a><\/li>\s*<li><a href="\/strategic-patterns\.html"[^>]*>Strategic Patterns<\/a><\/li>\s*<\/ul>/);
    assert.doesNotMatch(menu, /pattern-badge|pattern-navigation/);
    assert.ok(menu.indexOf('href="/use-cases.html"') < menu.indexOf('href="/email-workload-field-guide.html"'));
    assert.ok(menu.indexOf('href="/why-simple-java-mail.html"') < menu.indexOf('href="/use-cases.html"'));
  }
});
