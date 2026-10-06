import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const [previewDirectory, productionDirectory] = process.argv.slice(2);
if (!previewDirectory || !productionDirectory) {
  throw new Error("Usage: node scripts/verify-field-guide-build.mjs PREVIEW_DIRECTORY PRODUCTION_DIRECTORY");
}
const route = "email-workload-field-guide.html";
const { guideGroups } = JSON.parse(readFileSync("src/guides/email-workloads.11tydata.json", "utf8"));
const scenarioCount = guideGroups.reduce((sum, group) => sum + group.scenarios.length, 0);
for (const directory of [previewDirectory, productionDirectory]) {
  const read = (file) => readFileSync(path.join(directory, file), "utf8");
  assert.ok(existsSync(path.join(directory, route)));
  for (const entry of ["docs.html", "use-cases.html", "features.html", "configuration.html"]) {
    assert.ok(read(entry).includes(`href="/${route}"`), entry);
  }
  const sidebar = read("features.html").match(/<nav class="docs-nav"[\s\S]*?<\/nav>/)[0];
  assert.ok(sidebar.indexOf('href="/why-simple-java-mail.html"') < sidebar.indexOf('href="/use-cases.html"'));
  assert.ok(sidebar.indexOf('href="/use-cases.html"') < sidebar.indexOf(`href="/${route}"`));
  assert.match(sidebar, />Email workload field guide<\/a>/);
  assert.ok(read("sitemap.xml").includes(`/${route}`));
  for (const entry of ["engineering-journal.html", "journal/feed.xml"]) {
    const content = read(entry).replace(/<header class="site-header"[\s\S]*?<\/header>/, "");
    assert.ok(!content.includes(route), entry);
  }
  {
    const html = read(route);
    assert.match(html, /rel="canonical" href="https:\/\/www.simplejavamail.org\/email-workload-field-guide.html"/);
    assert.doesNotMatch(html, /name="robots" content="noindex, nofollow"|Working draft/i);
    assert.equal((html.match(/class="field-guide-goal"/g) || []).length, scenarioCount);
    assert.doesNotMatch(html, /field-guide-check|Try it:/);
    assert.equal((html.match(/class="field-guide-section-toc"/g) || []).length, guideGroups.length);
    for (const group of guideGroups) {
      for (const scenario of group.scenarios) assert.ok(html.includes(`href="#${scenario.id}"`));
    }
    assert.doesNotMatch(html, /data-comments-url|journal-entry-navigation/);
    assert.match(html, /href="\/assets\/field-guide.css"/);
  }
  assert.equal(read("assets/guides/email-workloads/FieldGuideExamples.java"),
    readFileSync("src/assets/guides/email-workloads/FieldGuideExamples.java", "utf8"));
}
console.log(`Field-guide build checks passed: entry points and sitemap in both builds, canonical URL, ${scenarioCount} targets, local scenario indexes, independent Journal/feed and unchanged download.`);
