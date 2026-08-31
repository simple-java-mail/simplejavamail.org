import assert from "node:assert/strict";
import test from "node:test";
import { hardenExternalLinks, navItemForUrl, validateSiteData } from "../src/_lib/eleventy-helpers.mjs";

test("site data validation checks navigation and breadcrumb relationships", () => {
  const site = { url: "https://www.simplejavamail.org" };
  const navigation = {
    docsGroups: [{ label: "Maintain", items: [{ title: "Migration notes", url: "/migration-notes.html" }] }],
  };
  const pages = [
    { url: "/migration-notes.html", data: { layout: "layouts/base.hbs" } },
    { url: "/migration-notes-9.2.0.html", data: { layout: "layouts/base.hbs", breadcrumbParent: "/migration-notes.html" } },
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

test("navigation lookup finds nested documentation items", () => {
  const groups = [{ items: [{ title: "Migration notes", url: "/migration-notes.html" }] }];
  assert.deepEqual(navItemForUrl(groups, "/migration-notes.html"), groups[0].items[0]);
  assert.equal(navItemForUrl(groups, "/missing.html"), null);
});

test("external links receive safe new-tab attributes without changing local links", () => {
  const html = '<a href="https://example.com/docs">External</a><a href="https://www.simplejavamail.org/docs.html">Local</a>';
  const hardened = hardenExternalLinks(html, "https://www.simplejavamail.org");
  assert.match(hardened, /example\.com\/docs" target="_blank" rel="noopener noreferrer"/);
  assert.match(hardened, /simplejavamail\.org\/docs\.html">Local/);
});
