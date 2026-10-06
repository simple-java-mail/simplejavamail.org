import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Handlebars from "handlebars";
import guideData from "../src/guides/guides.11tydata.mjs";
import { enforceArticlePolicy } from "../src/_lib/article-policy.mjs";
import { createMarkdownLibrary } from "../src/_lib/eleventy-helpers.mjs";
import { fieldGuideSections } from "../src/_lib/field-guide-sections.mjs";

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
  assert.equal(scenarios.length, 20);
  assert.equal((html.match(/class="field-guide-goal"/g) || []).length, scenarios.length);
  assert.doesNotMatch(html, /field-guide-check|Try it:/);
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
  const render = Handlebars.compile(layout.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""));
  const result = render({ title: "Guide", description: "Patterns", ...directory, content: html });
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
});

test("visible Java snippets are present verbatim in the downloadable examples", () => {
  const java = readFileSync(new URL("../src/assets/guides/email-workloads/FieldGuideExamples.java", import.meta.url), "utf8");
  const compact = (value) => value.replace(/\s+/g, " ").trim();
  const blocks = [...body.matchAll(/```java\r?\n([\s\S]*?)\r?\n```/g)];
  assert.equal(blocks.length, 12);
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
    assert.match(section, /\]\(\/(?:features|sending-and-execution|analyzing-send-results|debugging|configuration|security|modules)\.html#/);
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

test("field-guide entry points follow their generated collection without draft labels", () => {
  for (const page of ["docs", "use-cases"]) {
    const template = readFileSync(new URL(`../src/pages/${page}.hbs`, import.meta.url), "utf8");
    assert.match(template, /#each collections\.fieldGuides/);
    assert.doesNotMatch(template, /href="\/email-workload-field-guide\.html"/);
    assert.doesNotMatch(template, /data\.draft|working draft/i);
  }
});

test("documentation menus place visible guides after Use cases and Why before Use cases", () => {
  const handlebars = Handlebars.create();
  handlebars.registerHelper("eq", (left, right) => left === right);
  handlebars.registerHelper("activeClass", (url, current) => url === current ? "is-active" : "");
  handlebars.registerHelper("docsActiveClass", (url, current, parent) => url === current || url === parent ? "is-active" : "");
  handlebars.registerPartial("components/field-guide-menu-items", readFileSync(
    new URL("../src/_includes/components/field-guide-menu-items.hbs", import.meta.url), "utf8"));
  const nav = JSON.parse(readFileSync(new URL("../src/_data/nav.json", import.meta.url), "utf8"));
  const guide = { url: "/email-workload-field-guide.html", data: {
    title: "When One Email Becomes a Million", navigationTitle: "Email workload field guide"
  } };
  assert.match(source, /navigationTitle: "Email workload field guide"/);
  for (const name of ["docs-sidebar", "site-header"]) {
    const render = handlebars.compile(readFileSync(new URL(`../src/_includes/${name}.hbs`, import.meta.url), "utf8"));
    const context = { nav, page: { url: guide.url }, collections: { fieldGuides: [guide] } };
    const preview = render(context);
    const menu = name === "docs-sidebar" ? preview : preview.match(/<ul id="primary-docs-submenu"[\s\S]*?<\/ul>/)[0];
    assert.ok(menu.indexOf('href="/use-cases.html"') < menu.indexOf(`href="${guide.url}"`));
    assert.match(menu, /class="is-active">Email workload field guide<\/a>/);
    if (name === "docs-sidebar") {
      assert.ok(menu.indexOf('href="/why-simple-java-mail.html"') < menu.indexOf('href="/use-cases.html"'));
    }
    const withoutGuides = render({ ...context, collections: { fieldGuides: [] } });
    assert.ok(!withoutGuides.includes(guide.url));
    const fallback = render({ ...context, collections: { fieldGuides: [{ ...guide, data: { title: "Another guide" } }] } });
    assert.match(fallback, />Another guide<\/a>/);
  }
});
