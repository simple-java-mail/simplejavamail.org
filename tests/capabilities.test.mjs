import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import Handlebars from 'handlebars';
import ts from 'typescript';
import catalogue from '../src/_data/capabilities.json' with { type: 'json' };
import nav from '../src/_data/nav.json' with { type: 'json' };
import legacy from '../src/_data/legacyFeatures.json' with { type: 'json' };
import baseline from './fixtures/legacy-features-anchors.json' with { type: 'json' };
import compatibility from '../src/_data/compatibility.mjs';
import { featuresCompatibility } from '../src/_lib/documentation-compatibility.mjs';
const featureCompatibility = featuresCompatibility(legacy);
import { capabilityGroups, documentationGroups, guideContext, validateCapabilities } from '../src/_lib/capabilities.mjs';
import { patternDemonstrations } from '../src/_lib/pattern-demonstrations.mjs';
import { createTemplateHelpers } from '../src/_lib/template-helpers.mjs';
import { linkableGuideHeadings } from '../src/_lib/eleventy-helpers.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('legacy section targets become searchable heading targets without duplicate ids', () => {
  const html = linkableGuideHeadings('<a href="#limits" id="limits" class="section-link h2">§</a>\n<h2>Sending limits</h2>');
  assert.match(html, /<h2 id="limits">Sending limits<\/h2>/);
  assert.equal((html.match(/id="limits"/g) || []).length, 1);
  const existing = '<a id="old" class="section-link">§</a><h2 id="current">Title</h2>';
  assert.equal(linkableGuideHeadings(existing), existing);
  assert.equal(linkableGuideHeadings('<a id="ordinary">A</a><h2>Title</h2>'), '<a id="ordinary">A</a><h2>Title</h2>');
});

test('capability registration rejects missing destinations, invalid ownership and broken references', () => {
  for (const mutate of [
    (data) => data.features.push(data.features[0]),
    (data) => { data.features[0].group = 'missing'; },
    (data) => { data.features[0].href = 'https://example.org/'; },
    (data) => { data.features[0].modules = ['missing']; },
    (data) => { data.features[0].demonstrations = ['missing']; },
    (data) => { data.groups[0].highlights = ['missing']; },
    (data) => { data.features.find((item) => item.subgroup).subgroup = 'missing'; },
  ]) {
    const data = structuredClone(catalogue);
    mutate(data);
    assert.throws(() => validateCapabilities(data));
  }
});

test('all implementation guides and runnable demonstration topics have a discovery entry', () => {
  const groups = capabilityGroups();
  const destinations = new Set([...catalogue.features.map((item) => item.href.split('#')[0]), ...groups.map((group) => group.guide)]);
  for (const group of documentationGroups().filter((item) => item.id)) {
    for (const guide of group.items) {
      assert.ok(destinations.has(guide.url), `Undiscoverable guide: ${guide.url}`);
      assert.equal(guideContext(guide.url).label, group.label);
    }
  }
  const topics = new Set(catalogue.features.flatMap((item) => item.demonstrations || []));
  for (const topic of patternDemonstrations) assert.ok(topics.has(topic.id), `Unmapped demonstration: ${topic.id}`);
  for (const id of ['bodies', 'recipients', 'batches', 'execution']) {
    assert.equal(catalogue.features.find((item) => item.id === id).modules, undefined, `${id} must not require a feature module`);
  }
});

test('template helpers use current Eleventy data after registry or guide-inventory changes', () => {
  const data = structuredClone(catalogue);
  data.groups[0].label = 'Current family';
  data.features[0].label = 'Current feature';
  const inventory = structuredClone(nav);
  const group = inventory.docsGroups.find((entry) => entry.id === data.groups[0].id);
  group.items.push({ title: 'New guide', url: '/new-guide.html' });
  assert.equal(capabilityGroups(data)[0].label, 'Current family');
  assert.equal(capabilityGroups(data)[0].sections[0].features[0].label, 'Current feature');
  assert.equal(documentationGroups(inventory, data).find((entry) => entry.id === data.groups[0].id).label, 'Current family');
  assert.equal(guideContext('/new-guide.html', inventory, data).label, 'Current family');
  const hbs = Handlebars.create();
  for (const [name, helper] of Object.entries(createTemplateHelpers())) hbs.registerHelper(name, helper);
  const rendered = hbs.compile(read('../src/_includes/components/capability-catalogue.hbs'))({ capabilities: data });
  assert.match(rendered, /Current family/);
  assert.match(rendered, /Current feature/);
  const directory = hbs.compile(read('../src/pages/docs.hbs').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''))({ nav: inventory, capabilities: data });
  assert.match(directory, /Current family/);
  assert.match(directory, /href="\/new-guide\.html"/);
});

test('published and checkout legacy fragments resolve to actual canonical guide anchors', () => {
  assert.deepEqual(new Set([...Object.keys(legacy), 'capabilities-overview-title']), new Set(baseline.all));
  assert.equal(legacy['outlook-source-data'], '/email-conversion.html#outlook-source-data');
  for (const [old, href] of Object.entries(legacy)) {
    const [route, anchor] = href.split('#');
    assert.notEqual(route, '/features.html', old);
    const source = read(`../src/pages${route.replace(/\.html$/, '.hbs')}`);
    assert.ok(source.includes(`id="${anchor}"`), `${old} has no destination: ${href}`);
  }
});

test('catalogue feature links and module requirements render from the shared inventory', () => {
  const hbs = Handlebars.create();
  for (const [name, helper] of Object.entries(createTemplateHelpers())) hbs.registerHelper(name, helper);
  const html = hbs.compile(read('../src/_includes/components/capability-catalogue.hbs'))({});
  for (const feature of catalogue.features) assert.ok(html.includes(`href="${feature.href}"`), feature.id);
  for (const group of capabilityGroups()) {
    assert.ok(html.includes(`id="${group.id}"`));
    assert.ok(html.includes(group.label));
    for (const example of group.demonstrations) assert.ok(html.includes(`href="${example.href}"`));
  }
  assert.doesNotMatch(html, /<details|<pre|doc-card-grid/);
});

test('the generated Docs directory exposes every guide and family without invoking the url filter', () => {
  const hbs = Handlebars.create();
  for (const [name, helper] of Object.entries(createTemplateHelpers())) hbs.registerHelper(name, helper);
  hbs.registerHelper('url', () => { throw new Error('A URL field invoked the url filter'); });
  const html = hbs.compile(read('../src/pages/docs.hbs').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''))({ nav });
  for (const group of documentationGroups()) {
    assert.ok(html.includes(`id="${group.anchor}"`));
    for (const guide of group.items) assert.ok(html.includes(`href="${guide.url}"`), guide.url);
  }
});

const script = ts.transpileModule(read('../src/scripts/legacy-documentation-links.ts'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

function browser(config, hash, search = '') {
  const replacements = [];
  const listeners = new Map();
  const location = { hash, search, replace: (target) => replacements.push(target) };
  const context = {
    exports: {},
    document: { querySelector: () => config ? { textContent: JSON.stringify(config) } : null },
    window: { location, addEventListener: (event, callback) => listeners.set(event, callback) },
  };
  runInNewContext(script, context);
  return { replacements, listeners, location, resolve: context.exports.legacyDestination };
}

test('legacy navigation preserves query parameters and reacts to later section changes', () => {
  const page = browser(featureCompatibility, '#automatic-image-resolution-failure', '?from=bookmark');
  assert.deepEqual(page.replacements, ['/email-composition.html?from=bookmark#automatic-image-resolution-failure']);
  page.location.hash = '#section-source-inspection';
  page.listeners.get('hashchange')();
  assert.equal(page.replacements[1], '/email-conversion.html?from=bookmark#section-source-inspection');
});

test('new, unknown and malformed fragments stay on the catalogue; redirect targets are constrained', () => {
  for (const hash of ['', '#build-messages', '#unknown', '#%E0%A4%A', '#__proto__']) {
    assert.deepEqual(browser(featureCompatibility, hash).replacements, [], hash);
  }
  const resolve = browser(null, '').resolve;
  for (const target of ['//example.org', 'https://example.org/', '/features.html#bad fragment']) {
    assert.equal(resolve('#old', '', { targets: { old: target } }), undefined);
  }
});

test('all former Use cases sections and the unfragmented page reach the catalogue', () => {
  for (const [id, target] of Object.entries(compatibility.useCases.targets)) {
    assert.deepEqual(browser(compatibility.useCases, `#${id}`).replacements, [target]);
  }
  assert.deepEqual(browser(compatibility.useCases, '').replacements, ['/features.html']);
  const hbs = Handlebars.create();
  hbs.registerHelper('json', JSON.stringify);
  const fallback = hbs.compile(read('../src/_includes/components/legacy-documentation-links.hbs'))({ config: featureCompatibility });
  for (const id of Object.keys(legacy)) assert.ok(fallback.includes(`id="${id}"`));
  assert.match(fallback, /<noscript>[\s\S]*data-pagefind-ignore/);
});
