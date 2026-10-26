import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Handlebars from "handlebars";
import site from "../src/_data/site.json" with { type: "json" };

const handlebars = Handlebars.create();
handlebars.registerHelper("eq", (left, right) => left === right);
handlebars.registerHelper("json", (value) => JSON.stringify(value));
const head = handlebars.compile(readFileSync(new URL("../src/_includes/head.hbs", import.meta.url), "utf8"));

test("canonical metadata survives across the expanded public page types", () => {
  for (const url of ["/", "/docs.html", "/journal/example.html", "/case-studies/example.html", "/guides/example.html", "/patterns/example.html"]) {
    const html = head({ site, page: { url }, title: "Example", description: "Example", ogType: "article" });
    assert.ok(html.includes(`<link rel="canonical" href="${site.url}${url}">`));
    assert.doesNotMatch(html, /name="robots" content="noindex/);
    assert.match(html, /theme-init\.js/);
    assert.match(html, /rel="alternate" type="application\/rss\+xml"/);
  }
});

test("the internal 404 and Journal draft metadata retain their distinct indexing rules", () => {
  const missing = head({ site, page: { url: "/404.html" }, internal: true });
  assert.doesNotMatch(missing, /rel="canonical"/);
  const template = readFileSync(new URL("../src/pages/404.hbs", import.meta.url), "utf8");
  assert.match(template, /name="robots" content="noindex"/);
  assert.match(template, /eleventyExcludeFromCollections: true/);
  assert.match(template, /data-pagefind-ignore="all"/);
  const draft = head({ site, page: { url: "/journal/example.html" }, journalDraft: true });
  assert.match(draft, /name="robots" content="noindex, nofollow"/);
  assert.match(draft, /rel="canonical"/);
});
