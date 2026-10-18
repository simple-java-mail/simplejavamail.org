import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import Handlebars from "handlebars";
import { groupPatterns, indexPatternTechnologies, patternCategoryInfo } from "../src/_lib/patterns.mjs";
import strategicData from "../src/strategic-patterns/strategic-patterns.11tydata.mjs";
import { patternDemonstrations, patternExamples, demonstratedReferences } from "../src/_lib/pattern-demonstrations.mjs";
import { createMarkdownLibrary, headingsFromHtml } from "../src/_lib/eleventy-helpers.mjs";
import { createTemplateHelpers } from "../src/_lib/template-helpers.mjs";

function patternTemplates() {
  const handlebars = Handlebars.create();
  for (const [name, helper] of Object.entries(createTemplateHelpers())) handlebars.registerHelper(name, helper);
  for (const partial of ["breadcrumbs", "components/pattern-next"]) {
    handlebars.registerPartial(partial, readFileSync(new URL(`../src/_includes/${partial}.hbs`, import.meta.url), "utf8"));
  }
  return handlebars;
}

test("breadcrumbs follow collection ancestors for hub pages and direct article arrivals", () => {
  const handlebars = Handlebars.create();
  for (const [name, helper] of Object.entries(createTemplateHelpers())) handlebars.registerHelper(name, helper);
  const render = handlebars.compile(readFileSync(new URL("../src/_includes/breadcrumbs.hbs", import.meta.url), "utf8"));
  const nav = JSON.parse(readFileSync(new URL("../src/_data/nav.json", import.meta.url), "utf8"));
  for (const [url, parent, title, expected] of [
    ["/patterns.html", undefined, "Patterns", ["/", "/docs.html"]],
    ["/email-workload-field-guide.html", "/patterns.html", "Tactical Patterns", ["/", "/docs.html", "/patterns.html"]],
    ["/strategic-patterns.html", "/patterns.html", "Strategic Patterns", ["/", "/docs.html", "/patterns.html"]],
    ["/patterns/example.html", "/strategic-patterns.html", "Example", ["/", "/docs.html", "/patterns.html", "/strategic-patterns.html"]],
    ["/spring.html", "/configuration.html", "Spring integration", ["/", "/docs.html", "/configuration.html"]],
    ["/unknown.html", undefined, "Unknown", ["/", "/docs.html"]],
  ]) {
    const html = render({ nav, page: { url }, title, breadcrumbParent: parent });
    assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]), expected, url);
    assert.ok(html.includes(`<span aria-current="page">${title}</span>`));
  }
});

test("delivery-report examples inspect strong types without re-parsing source strings", () => {
  const source = readFileSync(new URL("../src/pages/delivery-reports.hbs", import.meta.url), "utf8");
  for (const contract of ["EnhancedStatusCode", "ReportedRecipient", "ReportedMailServer", "DeliveryDiagnostic"]) {
    assert.ok(source.includes(contract), contract);
  }
  assert.match(source, /status\.isPermanentFailure\(\)/);
  assert.match(source, /target\.getMailbox\(\)/);
  assert.match(source, /diagnostic\.getSmtpResponse\(\)\.getReturnCode\(\)/);
  assert.match(source, /getMailbox\(\).*?usually null/s);
  assert.doesNotMatch(source, /getOriginalRecipientType\(|getFinalRecipientType\(|getReportingServerType\(|getDiagnosticType\(/);
});

test("delivery-report guidance explains structured MIME and tolerant reading without inventing facts", () => {
  const source = readFileSync(new URL("../src/pages/delivery-reports.hbs", import.meta.url), "utf8");
  assert.match(source, /multipart\/report; report-type=delivery-status/);
  assert.match(source, /5\.01\.001/);
  assert.match(source, /completed header blocks remain available/);
  assert.match(source, /An interrupted block is not presented as complete/);
  assert.match(source, /Two competing parts/);
  assert.match(source, /an eager attachment read can still fail/);
  assert.match(source, /report\.getWarnings\(\)/);
});

test("one classification supplies category labels, ordering and navigation", () => {
  const tactical = { url: "/old-guide.html", data: { title: "Existing guide", patternCategory: "tactical" } };
  const strategic = { url: "/patterns/example.html", data: { title: "Application", patternCategory: "strategic" } };
  const groups = groupPatterns([strategic, tactical]);
  assert.deepEqual(groups.map((group) => group.label), ["Tactical Patterns", "Strategic Patterns"]);
  assert.equal(groups[0].entries[0], tactical);
  assert.equal(groups[1].entries[0], strategic);
  assert.equal(patternCategoryInfo("strategic").label, groups[1].label);
  assert.equal(groups[0].href, "/email-workload-field-guide.html");
  assert.equal(groups[1].href, "/strategic-patterns.html");
  assert.throws(() => groupPatterns([{ data: { patternCategory: "unclassified" } }]));
  assert.throws(() => patternCategoryInfo("unclassified"));
});

test("strategic pages have their own schema rather than tactical scenario groups", () => {
  assert.deepEqual(strategicData.tags, ["strategicPattern", "publicPage"]);
  assert.equal(strategicData.breadcrumbParent, "/strategic-patterns.html");
  assert.doesNotThrow(() => strategicData.eleventyDataSchema({ title: "Application", description: "A real local application",
    stack: "Spring", demoSlug: "example", patternCategory: "strategic",
    tacticalScenarios: [{ title: "A few emails a day", url: "/email-workload-field-guide.html#a-few-emails-a-day" }] }));
  assert.throws(() => strategicData.eleventyDataSchema({ title: "Application", description: "Missing stack", patternCategory: "strategic" }));
});

test("each strategic ending points to existing tactical scenarios, with runnable routes in the other direction", () => {
  const markdown = createMarkdownLibrary();
  const tacticalSource = readFileSync(new URL("../src/guides/email-workloads.md", import.meta.url), "utf8");
  const tacticalHtml = markdown.render(tacticalSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""));
  const directory = new URL("../src/strategic-patterns/", import.meta.url);
  for (const name of readdirSync(directory).filter((entry) => entry.endsWith(".md"))) {
    const source = readFileSync(new URL(name, directory), "utf8");
    const related = [...source.matchAll(/url: "\/email-workload-field-guide\.html#([a-z0-9-]+)"/g)];
    assert.ok(related.length > 0, `${name}: offer a specific tactical recipe`);
    for (const [, anchor] of related) assert.ok(tacticalHtml.includes(`id="${anchor}"`), `${name}: ${anchor}`);
  }
  for (const [scenario, application] of [
    ["A nightly invoice run", "restartable-batch"],
    ["Customers bring their own servers", "relaydesk"],
    ["The invoice was accepted, then bounced", "incoming-feedback"],
  ]) {
    const section = tacticalSource.split(`### ${scenario}`)[1].split(/\r?\n###? /)[0];
    assert.ok(section.includes(`](/patterns/${application}.html)`), `${scenario}: offer the matching application`);
  }
});

test("technology discovery points to the same problem-led pages, including variations", () => {
  const workflow = { url: "/patterns/mail-workflow.html", data: { stack: "Temporal · Camunda variation" } };
  const index = indexPatternTechnologies([workflow]);
  assert.deepEqual(index.map((entry) => entry.label), ["Camunda", "Temporal"]);
  assert.equal(index[0].patterns[0], workflow);
});

test("the strategic hub lists application patterns directly, without a category chooser", () => {
  const handlebars = Handlebars.create();
  handlebars.registerHelper("eq", (left, right) => left === right);
  // Eleventy registers a URL helper: links must explicitly reference this.url rather than accidentally invoke that helper.
  handlebars.registerHelper("url", () => { throw new Error("Use the entry's URL, not the URL helper"); });
  const source = readFileSync(new URL("../src/pages/strategic-patterns.hbs", import.meta.url), "utf8");
  assert.match(source, /permalink: "\/strategic-patterns\.html"/);
  const html = handlebars.compile(source)({ collections: { patternGroups: groupPatterns([
    { url: "/email-workload-field-guide.html", data: { title: "Existing workload guide", patternCategory: "tactical" } },
    { url: "/patterns/example.html", data: { title: "Application pattern", patternCategory: "strategic", demoSlug: "example" } },
  ]) } });
  assert.match(html, /<a class="pattern-card-link" href="\/patterns\/example\.html">Application pattern<\/a>/);
  assert.match(html, /<a class="button button-primary pattern-card-start" href="\/patterns\/example\.html#start-here"/);
  assert.doesNotMatch(html, /onclick=|role="button"/);
  const styles = readFileSync(new URL("../src/styles/patterns.less", import.meta.url), "utf8");
  assert.match(styles, /\.pattern-card-link::after\s*\{[^}]*inset:\s*0/);
  assert.match(styles, /\.pattern-card-start\s*\{[^}]*z-index:\s*2/);
  assert.doesNotMatch(html, /Existing workload guide|Tactical Patterns|pattern-groups|href="#(?:tactical|strategic)"/);
});

test("Patterns offers two equal collection routes without duplicating the strategic directory", () => {
  const source = readFileSync(new URL("../src/pages/patterns.hbs", import.meta.url), "utf8");
  assert.match(source, /layout: "layouts\/base.hbs"/);
  assert.match(source, /permalink: "\/patterns.html"/);
  const handlebars = patternTemplates();
  const html = handlebars.compile(source)({ collections: { patternGroups: groupPatterns([]) } });
  assert.match(html, /href="\/email-workload-field-guide.html"/);
  assert.match(html, /href="\/strategic-patterns.html"/);
  assert.equal((html.match(/class="pattern-card"/g) || []).length, 2);
  assert.doesNotMatch(html, /href="\/patterns\/|pattern-badge/);
});

test("ten problem-led chapters link canonical downloads and keep Journal separate", () => {
  const directory = new URL("../src/strategic-patterns/", import.meta.url);
  const chapters = readdirSync(directory).filter((name) => name.endsWith(".md"));
  assert.equal(chapters.length, 10);
  for (const name of chapters) {
    const source = readFileSync(new URL(name, directory), "utf8");
    assert.match(source, /demoSlug: "[a-z-]+"/);
    assert.match(source, /strategic-patterns.zip/);
    assert.match(source, /docker compose/);
    assert.match(source, /## Start here/);
    assert.match(source, /## Follow one job/);
    assert.ok(source.indexOf("## Start here") < source.indexOf("## The problem"), name);
    const start = source.match(/## Start here\r?\n([\s\S]*?)(?=\r?\n## |$)/)[1];
    assert.match(start, /\[complete Simple Java Mail sources\]\(https:\/\/github\.com\/bbottema\/simple-java-mail\/archive\/refs\/heads\/codex\/10\.0\.0.zip\)/);
    assert.match(start, /directory containing `pom.xml` and `tools\/`/);
    assert.match(start, /4 GB of Docker memory/);
    const slug = name.replace(/\.md$/, "");
    assert.match(start, new RegExp(`docker compose -f tools/integration-patterns/${slug}/compose\\.yaml up --build -d --wait`));
    assert.match(start, new RegExp(`docker compose -f tools/integration-patterns/${slug}/compose\\.yaml run --rm scenario`));
    assert.match(start, /http:\/\/localhost:8787\/jobs/);
    assert.match(start, /Expect|should|successful job/i);
    assert.match(source, /synthetic/i);
    assert.doesNotMatch(source, /^draft:|^tags:.*journal|\bnew in\b|\bSJM 10\b/mi);
  }
});

// The website can be checked out by itself. Validate Java/README links when its matching SJM workbench is available too.
const hasWorkbenchCheckout = existsSync(new URL("../../tools/integration-patterns/README.md", import.meta.url));

test("every teaching entry point names source that exists and a real starting method", { skip: !hasWorkbenchCheckout }, () => {
  const starts = [
    ["transaction-outbox", "common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java", "submit"],
    ["event-communications", "common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java", "submit"],
    ["mail-workflow", "mail-workflow/src/main/java/org/simplejavamail/examples/patterns/TemporalMailWorkflow.java", "run"],
    ["restartable-batch", "restartable-batch/src/main/java/org/simplejavamail/examples/patterns/NightlyMailJob.java", "run"],
    ["protected-partners", "protected-partners/src/main/java/org/simplejavamail/examples/patterns/PartnerDocuments.java", "archiveVerifiedCopy"],
    ["incoming-feedback", "common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java", "report"],
    ["relaydesk", "relaydesk/src/main/java/RelayDeskApplication.java", "enqueue"],
    ["polar-meridian", "polar-meridian/src/main/java/PolarMeridianApplication.java", "PolarMeridianApplication"],
    ["custom-handoff", "custom-handoff/src/main/java/org/simplejavamail/examples/handoff/HandoffApplication.java", "submit"],
    ["aws-correspondence", "aws-correspondence/src/main/java/org/simplejavamail/examples/aws/CorrespondenceWorker.java", "deliver"],
  ];
  for (const [slug, file, method] of starts) {
    const article = readFileSync(new URL(`../src/strategic-patterns/${slug}.md`, import.meta.url), "utf8");
    const route = article.match(/## Follow one job\r?\n([\s\S]*?)(?=\r?\n## |$)/)[1];
    assert.ok(route.includes(file), `${slug}: starting source link`);
    const source = readFileSync(new URL(`../../tools/integration-patterns/${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(`${method}(`), `${slug}: ${method} must still exist`);
    const readme = readFileSync(new URL(`../../tools/integration-patterns/${slug}/README.md`, import.meta.url), "utf8");
    assert.match(readme, /## Start here/);
    assert.match(readme, /## Follow one job/);
    assert.match(readme, /## Try /);
    for (const [, target] of readme.matchAll(/\]\(([^)]+\.java)\)/g)) {
      assert.ok(existsSync(new URL(target, new URL(`../../tools/integration-patterns/${slug}/README.md`, import.meta.url))), `${slug}: ${target}`);
    }
  }
});

test("deep arrivals retain article identity, section navigation and both routes up", () => {
  const handlebars = patternTemplates();
  handlebars.registerHelper("demonstratedReferences", () => [{ title: "A reference", reference: "/features.html" }]);
  const source = readFileSync(new URL("../src/_includes/layouts/strategic-pattern.hbs", import.meta.url), "utf8");
  const markdown = createMarkdownLibrary();
  const content = markdown.render("## Start here\n\nA paragraph.\n\n## Follow one job\n\n## Retry & recovery\n\n### A small detail");
  const html = handlebars.compile(source)({ title: "A committed order needs an email", patternCategory: "strategic", content,
    tacticalScenarios: [{ title: "A few emails a day", url: "/email-workload-field-guide.html#a-few-emails-a-day" }] });
  const rail = html.match(/<aside\b[\s\S]*?<\/aside>/)?.[0];
  assert.ok(rail, "Navigation must sit beside the article rather than in the hero");
  assert.match(rail, /class="[^"]*journal-entry-toc[^"]*"/);
  assert.match(rail, /href="#start-here">Start here/);
  assert.match(rail, /href="#follow-one-job">Follow one job/);
  assert.match(rail, /href="#retry-recovery">Retry &amp; recovery/);
  assert.doesNotMatch(rail, /A small detail/);
  assert.match(rail, /href="#pattern-reference-title"/);
  assert.match(rail, /href="\/strategic-patterns\.html">[^<]*Find another strategic pattern<\/a>/);
  assert.match(rail, /href="#pattern-title">A committed order needs an email<\/a>/);
  assert.match(rail, /href="\/patterns.html">All patterns<\/a>/);
  const ending = html.match(/<section class="pattern-next"[\s\S]*?<\/section>/)?.[0];
  assert.ok(ending);
  assert.match(ending, /href="\/email-workload-field-guide.html#a-few-emails-a-day"/);
  assert.match(ending, /href="\/strategic-patterns.html"/);
  assert.match(ending, /href="\/patterns.html"/);
  assert.doesNotMatch(html, /pattern-badge/);
  assert.ok(html.indexOf(rail) < html.indexOf('<article'));
  assert.doesNotMatch(html, /pattern-reading-route/);
});

test("the strategic reading rail contains every rendered chapter heading without duplicating sources", () => {
  const handlebars = patternTemplates();
  handlebars.registerHelper("demonstratedReferences", () => []);
  const render = handlebars.compile(readFileSync(new URL("../src/_includes/layouts/strategic-pattern.hbs", import.meta.url), "utf8"));
  const markdown = createMarkdownLibrary();
  const directory = new URL("../src/strategic-patterns/", import.meta.url);
  for (const name of readdirSync(directory).filter((entry) => entry.endsWith(".md"))) {
    const source = readFileSync(new URL(name, directory), "utf8");
    const content = markdown.render(source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""));
    const rail = render({ patternCategory: "strategic", content }).match(/<aside\b[\s\S]*?<\/aside>/)?.[0];
    assert.ok(rail, name);
    for (const heading of headingsFromHtml(content)) assert.ok(rail.includes(`href="#${heading.id}"`), `${name}: ${heading.id}`);
  }
});

test("curated feature links point to real reference and demonstration sections", () => {
  const markdown = createMarkdownLibrary();
  assert.throws(() => patternExamples("an-unregistered-topic"));
  assert.equal(new Set(patternDemonstrations.map((entry) => entry.id)).size, patternDemonstrations.length);
  for (const topic of patternDemonstrations) {
    const [reference, anchor] = topic.reference.split("#");
    const source = readFileSync(new URL(`../src/pages/${reference.slice(1).replace(/\.html$/, ".hbs")}`, import.meta.url), "utf8");
    if (anchor) assert.ok(source.includes(`id="${anchor}"`), topic.reference);
    for (const demo of patternExamples(topic.id)) {
      const article = readFileSync(new URL(`../src/strategic-patterns/${demo.pattern}.md`, import.meta.url), "utf8");
      const html = markdown.render(article.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""));
      assert.ok(html.includes(`id="${demo.section}"`), demo.href);
      assert.ok(demonstratedReferences(demo.pattern).some((reference) => reference.id === topic.id));
      assert.ok(demo.scenario.length > 0);
    }
  }
});

test("demonstration links are ordinary accessible links and do not depend on color or hovering", () => {
  const handlebars = Handlebars.create();
  handlebars.registerHelper("patternExamples", patternExamples);
  const partial = readFileSync(new URL("../src/_includes/components/pattern-examples.hbs", import.meta.url), "utf8");
  const html = handlebars.compile(partial)({ topic: "custom-mailer" });
  assert.match(html, /aria-label="Runnable examples"/);
  assert.match(html, />See it working</);
  assert.match(html, /href="\/patterns\/custom-handoff.html#non-smtp-handoff"/);
  assert.doesNotMatch(html, /onclick=|tabindex="-1"|title=/);
});

test("strategic diagrams load the established renderer only when requested", () => {
  const handlebars = patternTemplates();
  handlebars.registerHelper("demonstratedReferences", () => []);
  const source = readFileSync(new URL("../src/_includes/layouts/strategic-pattern.hbs", import.meta.url), "utf8");
  const render = handlebars.compile(source);
  assert.match(render({ patternCategory: "strategic", mermaid: true }), /src="\/scripts\/mermaid.js"/);
  assert.doesNotMatch(render({ patternCategory: "strategic", mermaid: false }), /src="\/scripts\/mermaid.js"/);
});
