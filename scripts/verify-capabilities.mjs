import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import catalogue from '../src/_data/capabilities.json' with { type: 'json' };
import legacy from '../src/_data/legacyFeatures.json' with { type: 'json' };
import baseline from '../tests/fixtures/legacy-features-anchors.json' with { type: 'json' };
import contracts from '../tests/fixtures/guide-structure-contracts.json' with { type: 'json' };
import { capabilityGroups, documentationGroups } from '../src/_lib/capabilities.mjs';
import { parseDocumentation, destinationErrors, guideStructureErrors, staleFeatureLinkErrors, siteDestination } from '../src/_lib/documentation-structure.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist');
const errors = [];
const pages = new Map();
function getPage(route) {
  if (!pages.has(route)) {
    const file = path.join(output, route.slice(1));
    if (!existsSync(file)) errors.push(`Missing page: ${route}`);
    pages.set(route, parseDocumentation(existsSync(file) ? readFileSync(file, 'utf8') : '', route));
  }
  return pages.get(route);
}
function check(href, requireGuideBody = false) {
  const destination = siteDestination(href, '/');
  if (!destination) { errors.push(`Invalid site destination: ${href}`); return; }
  const page = getPage(destination.route);
  if (destination.id) errors.push(...destinationErrors(page, destination.id, requireGuideBody));
}
for (const feature of catalogue.features) check(feature.href);
for (const module of Object.values(catalogue.modules)) check(module.href);
for (const group of capabilityGroups()) {
  check(group.href);
  check(group.guide);
  check(group.directoryHref);
  const family = documentationGroups().find((entry) => entry.id === group.id);
  const mainGuide = siteDestination(group.guide, '/')?.route;
  if (!family?.items.some((item) => item.url === mainGuide)) errors.push(`${group.id}: primary guide is not in its documentation family`);
  for (const demo of group.demonstrations) check(demo.href);
}
for (const id of baseline.all) {
  if (id === 'capabilities-overview-title') check(`/features.html#${id}`);
  else if (!legacy[id]) errors.push(`Missing legacy mapping: ${id}`);
  else check(legacy[id], true);
}
for (const family of documentationGroups().filter((group) => group.id)) {
  for (const guide of family.items) errors.push(...guideStructureErrors(getPage(guide.url), contracts[guide.url]));
}
function checkCurrentLinks(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'sources') checkCurrentLinks(file); // Archived historical source documents retain their original links.
    } else if (entry.name.endsWith('.html')) {
      const route = '/' + path.relative(output, file).split(path.sep).join('/');
      errors.push(...staleFeatureLinkErrors(getPage(route), legacy));
    }
  }
}
checkCurrentLinks(output);
const compatibility = getPage('/use-cases.html').html;
if (!/name="robots" content="noindex"/.test(compatibility) || /data-pagefind-body/.test(compatibility)) errors.push('Use cases must remain a noindex compatibility page outside search.');
const sitemap = readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
if (sitemap.includes('/use-cases.html')) errors.push('Use cases compatibility page is present in the sitemap.');
for (const route of ['/features.html', '/email-composition.html', '/email-conversion.html']) {
  if (!sitemap.includes(route)) errors.push(`Missing sitemap entry: ${route}`);
}
if (errors.length) { console.error([...new Set(errors)].join('\n')); process.exitCode = 1; }
else console.log(`Capability and structure checks passed: ${catalogue.features.length} entries and ${baseline.all.length} legacy fragments have usable rendered destinations.`);
