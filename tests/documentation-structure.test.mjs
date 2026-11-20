import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import Handlebars from 'handlebars';
import { DomUtils } from 'htmlparser2';
import contracts from './fixtures/guide-structure-contracts.json' with { type: 'json' };
import catalogue from '../src/_data/capabilities.json' with { type: 'json' };
import nav from '../src/_data/nav.json' with { type: 'json' };
import site from '../src/_data/site.json' with { type: 'json' };
import legacy from '../src/_data/legacyFeatures.json' with { type: 'json' };
import { createTemplateHelpers } from '../src/_lib/template-helpers.mjs';
import { documentationGroups } from '../src/_lib/capabilities.mjs';
import { featuresCompatibility } from '../src/_lib/documentation-compatibility.mjs';
import { linkableGuideHeadings } from '../src/_lib/eleventy-helpers.mjs';
import { descendants, parseDocumentation, destinationErrors, guideStructureErrors, staleFeatureLinkErrors } from '../src/_lib/documentation-structure.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hbs = Handlebars.create();
for (const [name, helper] of Object.entries(createTemplateHelpers())) hbs.registerHelper(name, helper);
function register(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) register(file);
    else if (entry.name.endsWith('.hbs')) hbs.registerPartial(path.relative(path.join(root, 'src/_includes'), file).replaceAll(path.sep, '/').replace(/\.hbs$/, ''), readFileSync(file, 'utf8'));
  }
}
register(path.join(root, 'src/_includes'));

function guide(html, route = '/guide.html') {
  return parseDocumentation(`<main><article class="legacy-doc-content">${html}</article></main>`, route);
}

function render(route) {
  const source = readFileSync(path.join(root, 'src/pages', route.slice(1).replace(/\.html$/, '.hbs')), 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const content = hbs.compile(source)({ nav, capabilities: catalogue, site, page: { url: route }, collections: {} });
  return guide(linkableGuideHeadings(content), route);
}

test('a real target in contents or fallback markup cannot satisfy guide destination checks', () => {
  for (const container of ['<section class="toc">', '<nav>', '<noscript>', '<pre><code>']) {
    const end = container.startsWith('<section') ? '</section>' : container === '<pre><code>' ? '</code></pre>' : `</${container.slice(1,-1)}>`;
    const page = guide(`${container}<span id="topic">Wrong place</span>${end}<h2 id="real">Body</h2>`);
    assert.ok(destinationErrors(page, 'topic', true).some((message) => /contents, code or fallback/.test(message)), container);
    assert.deepEqual(destinationErrors(page, 'real', true), []);
  }
  assert.ok(destinationErrors(guide('<h2 id="x">A</h2><p id="x">B</p>'), 'x').some((message) => /found 2/.test(message)));
});

test('guide validation rejects copied bodies inside lists and orphan contents items', () => {
  const broken = guide('<section class="toc"><ul><section id="gmail"><h3>Gmail</h3><pre>example</pre></section></ul></section><li>Orphan</li>');
  const errors = guideStructureErrors(broken);
  assert.ok(errors.some((message) => /substantive guide content/.test(message)));
  assert.ok(errors.some((message) => /directly inside <ul>/.test(message)));
  assert.ok(errors.some((message) => /list item is outside/.test(message)));
  const misplacedProse = guide('<section class="toc"><ul><li><section><h3>Gmail</h3><p>Full instructions with no code example.</p></section></li></ul></section>');
  assert.ok(guideStructureErrors(misplacedProse).some((message) => /substantive guide content/.test(message)));
  assert.deepEqual(guideStructureErrors(guide('<section class="toc"><ul><li><a href="#topic">Topic</a></li></ul></section><h2 id="topic">Topic</h2><section><p>Body</p></section>'), { contentsBefore: 'topic' }), []);
});

test('contents placement, section order and heading ownership are checked independently of id presence', () => {
  const page = guide('<h2 id="settings">Settings</h2><h2 id="session">Session</h2><h3 id="timeouts">Timeouts</h3><section class="toc"><ul><li><a href="#timeouts">Timeouts</a></li><li><a href="#settings">Settings</a></li></ul></section>');
  const errors = guideStructureErrors(page, { contentsBefore: 'settings', order: ['timeouts', 'settings'], headings: [{ id: 'timeouts', level: 3, parent: 'settings' }] });
  assert.ok(errors.some((message) => /contents must precede/.test(message)));
  assert.ok(errors.some((message) => /contents order disagrees/.test(message)));
  assert.ok(errors.some((message) => /out of its agreed order/.test(message)));
  assert.ok(errors.some((message) => /must belong under #settings/.test(message)));
});

test('fallback ids do not conceal stale modern links to moved Features sections', () => {
  const map = { 'old-topic': '/guide.html#topic' };
  const page = guide('<a href="/features.html#old-topic">Old</a><a href="https://simplejavamail.org/features.html?x=1#old%2Dtopic">Encoded</a><noscript><span id="old-topic"><a href="/guide.html#topic">Fallback</a></span></noscript><a href="/features.html#build-messages">Group</a><a href="https://elsewhere.example/features.html#old-topic">External</a>');
  const errors = staleFeatureLinkErrors(page, map);
  assert.equal(errors.length, 2);
  assert.ok(errors.every((message) => message.includes('use /guide.html#topic')));
});

test('module requirements are checked on the relevant heading, not anywhere on the page', () => {
  const contract = { modules: [{ id: 'outlook', required: ['outlook-module'] }] };
  assert.ok(guideStructureErrors(guide('<h2 id="outlook">Outlook</h2><p><a class="module-badge">outlook-module</a></p>'), contract).some((message) => /missing outlook-module/.test(message)));
  assert.deepEqual(guideStructureErrors(guide('<h2 id="outlook">Outlook <a class="module-badge">outlook-module</a></h2>'), contract), []);
});

const families = documentationGroups().filter((group) => group.id);
for (const family of families) {
  for (const item of family.items) {
    test(`guide structure and contents: ${item.url}`, () => {
      const page = render(item.url);
      assert.deepEqual(guideStructureErrors(page, contracts[item.url]), []);
      assert.deepEqual(staleFeatureLinkErrors(page, legacy), []);
      for (const [old, href] of Object.entries(legacy)) {
        const [route, id] = href.split('#');
        if (route === item.url) assert.deepEqual(destinationErrors(page, id, true), [], old);
      }
    });
  }
}

test('the sidebar and dropdown expose the agreed families and actual directory destinations', () => {
  assert.deepEqual(families.map((group) => group.id), ['build-messages', 'convert-and-inspect-mail', 'protect-mail', 'send-one-or-many', 'recover-from-failures', 'observe-and-troubleshoot', 'configure-and-integrate']);
  const context = { nav, capabilities: catalogue, site, page: { url: '/email-composition.html' } };
  const sidebar = parseDocumentation(hbs.compile(readFileSync(path.join(root, 'src/_includes/docs-sidebar.hbs'), 'utf8'))(context));
  for (const family of families) {
    assert.equal(sidebar.elements.filter((node) => node.name === 'h2' && DomUtils.textContent(node).trim() === family.label).length, 1);
    for (const item of family.items) assert.equal(sidebar.elements.filter((node) => node.name === 'a' && node.attribs.href === item.url).length, 1, item.url);
  }
  const header = parseDocumentation(hbs.compile(readFileSync(path.join(root, 'src/_includes/site-header.hbs'), 'utf8'))(context));
  const dropdown = header.ids.get('primary-docs-submenu')[0];
  for (const family of families) {
    assert.ok(descendants(dropdown).some((node) => node.name === 'a' && node.attribs.href === `/docs.html#${family.id}` && DomUtils.textContent(node).trim() === family.label));
  }
});

test('legacy compatibility rendering reads current data and follows the catalogue for no-JavaScript visitors', () => {
  const current = { ...legacy, 'new-alias': '/email-conversion.html#section-converting' };
  const source = readFileSync(path.join(root, 'src/pages/features.hbs'), 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const html = hbs.compile(source)({ legacyFeatures: current, capabilities: catalogue });
  assert.ok(html.indexOf('<h1>Capabilities</h1>') < html.indexOf('<noscript>'));
  assert.ok(html.includes('id="new-alias"'));
  assert.ok(html.includes('S/MIME helper message ID'));
  assert.equal(featuresCompatibility(current).targets['new-alias'], '/email-conversion.html#section-converting');
});
