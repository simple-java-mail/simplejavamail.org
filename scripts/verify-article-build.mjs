import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const [previewDirectory, productionDirectory] = process.argv.slice(2);
if (!previewDirectory || !productionDirectory) {
  throw new Error("Usage: node scripts/verify-article-build.mjs PREVIEW_DIRECTORY PRODUCTION_DIRECTORY");
}

const oldSlugs = ["your-mail-server-works-for-a-troll-farm-now", "mail-at-polar-meridian-systems",
  "everybody-brought-their-own-mail-server", "when-one-email-becomes-a-million"];
const companies = ["staple-and-sons", "polar-meridian", "relaydesk"];

for (const [directory, preview] of [[previewDirectory, true], [productionDirectory, false]]) {
  const read = (route) => readFileSync(path.join(directory, route), "utf8");
  for (const slug of oldSlugs) {
    assert.equal(existsSync(path.join(directory, "journal", `${slug}.html`)), false, slug);
  }
  const journal = read("engineering-journal.html");
  const feed = read("journal/feed.xml");
  assert.doesNotMatch(journal, /href="\/case-studies\/[^"#]+\.html/);
  assert.doesNotMatch(feed, /\/case-studies\/|when-one-email-becomes-a-million/);
  const index = read("case-studies.html");
  const home = read("index.html");
  const sitemap = read("sitemap.xml");
  assert.equal(index.includes('href="/case-studies/relaydesk.html"'), preview);
  assert.equal(home.includes('href="/case-studies/relaydesk.html"'), preview);
  assert.equal(home.includes("case-study-spotlight"), preview);
  assert.equal(sitemap.includes("/case-studies/relaydesk.html"), false);
  assert.equal(existsSync(path.join(directory, "case-studies/relaydesk.html")), preview);
  for (const slug of companies.filter((slug) => preview || slug !== "relaydesk")) {
    const html = read(`case-studies/${slug}.html`);
    assert.ok(html.includes(`rel="canonical" href="https://www.simplejavamail.org/case-studies/${slug}.html"`));
    assert.ok(html.includes(`data-comments-url="https://www.simplejavamail.org/case-studies/${slug}.html"`));
    assert.ok(html.includes('"isPartOf":"https://www.simplejavamail.org/case-studies.html"'));
    assert.match(html, /class="journal-back-link" href="\/case-studies.html"/);
    assert.match(html, /aria-label="In this case study"/);
    assert.match(html, /journal-entry-navigation--top[\s\S]*journal-entry-navigation--bottom/);
  }
  const staple = read("case-studies/staple-and-sons.html");
  const polar = read("case-studies/polar-meridian.html");
  const navigation = (html) => html.match(/<nav class="journal-entry-navigation[^>]*>[\s\S]*?<\/nav>/g) || [];
  assert.equal(navigation(staple).length, 2);
  assert.equal(navigation(polar).length, 2);
  for (const nav of navigation(staple)) {
    assert.ok(nav.includes('href="/case-studies.html"'));
    assert.ok(nav.includes('href="/case-studies/polar-meridian.html"'));
  }
  for (const nav of navigation(polar)) {
    assert.ok(nav.includes('href="/case-studies/staple-and-sons.html"'));
    assert.equal(nav.includes('href="/case-studies/relaydesk.html"'), preview);
  }
  if (preview) {
    const relay = read("case-studies/relaydesk.html");
    assert.match(relay, /journal-theme-cyberpunk/);
    assert.match(relay, /name="robots" content="noindex, nofollow"/);
    assert.match(index, /Multi-tenant communications/);
    assert.match(relay, /RUN COMPLETE/);
    for (const nav of navigation(relay)) {
      assert.ok(nav.includes('href="/case-studies/polar-meridian.html"'));
      assert.doesNotMatch(nav, /journal-entry-next/);
    }
  }
  assert.match(polar, /journal-code-disclosure/);
  assert.match(polar, /PolarMeridianDispatcher.java/);
  console.log(`${preview ? "Preview" : "Production"}: article routes, collections, metadata, navigation and draft visibility verified.`);
}
