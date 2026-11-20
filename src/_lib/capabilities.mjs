import catalogue from '../_data/capabilities.json' with { type: 'json' };
import navigation from '../_data/nav.json' with { type: 'json' };
import { patternExamples } from './pattern-demonstrations.mjs';

export function validateCapabilities(data = catalogue) {
  const groupIds = new Set();
  const featureIds = new Set();
  const destination = /^\/[a-z0-9/-]+\.html(?:#[a-z0-9-]+)?$/;
  for (const group of data.groups) {
    if (!group.id || groupIds.has(group.id)) throw new Error(`Duplicate or missing capability group: ${group.id}`);
    if (!group.label || !group.summary || !destination.test(group.guide)) throw new Error(`Invalid capability group: ${group.id}`);
    groupIds.add(group.id);
  }
  for (const feature of data.features) {
    if (!feature.id || featureIds.has(feature.id)) throw new Error(`Duplicate or missing capability: ${feature.id}`);
    if (!groupIds.has(feature.group) || !feature.label || !destination.test(feature.href)) throw new Error(`Invalid capability: ${feature.id}`);
    for (const module of feature.modules || []) if (!data.modules[module]) throw new Error(`Unknown module: ${module}`);
    for (const topic of feature.demonstrations || []) patternExamples(topic);
    const group = data.groups.find((candidate) => candidate.id === feature.group);
    if (group.subgroups && !group.subgroups.some((subgroup) => subgroup.id === feature.subgroup)) throw new Error(`Missing subgroup: ${feature.id}`);
    featureIds.add(feature.id);
  }
  for (const group of data.groups) {
    for (const id of [...group.highlights, ...(group.related || [])]) {
      if (!featureIds.has(id)) throw new Error(`Unknown capability reference: ${id}`);
    }
    for (const id of group.highlights) {
      if (data.features.find((feature) => feature.id === id).group !== group.id) throw new Error(`Highlight belongs to another group: ${id}`);
    }
  }
  return data;
}

validateCapabilities();

function currentCatalogue(data) {
  return data && Array.isArray(data.groups) && Array.isArray(data.features) ? validateCapabilities(data) : catalogue;
}

function resolvedCapability(id, data) {
  const feature = data.features.find((entry) => entry.id === id);
  if (!feature) throw new Error(`Unknown capability: ${id}`);
  return { ...feature, modules: (feature.modules || []).map((module) => data.modules[module]) };
}

export function capability(id, data) {
  return resolvedCapability(id, currentCatalogue(data));
}

export function capabilityGroups(input) {
  const data = currentCatalogue(input);
  return data.groups.map((group) => {
    const features = data.features.filter((feature) => feature.group === group.id).map((feature) => resolvedCapability(feature.id, data));
    const demonstrations = features.flatMap((feature) => (feature.demonstrations || []).flatMap(patternExamples));
    return {
      ...group,
      href: `/features.html#${group.id}`,
      directoryHref: `/docs.html#${group.id}`,
      highlights: group.highlights.map((id) => resolvedCapability(id, data)),
      related: (group.related || []).map((id) => resolvedCapability(id, data)),
      sections: group.subgroups
        ? group.subgroups.map((subgroup) => ({ ...subgroup, features: features.filter((feature) => feature.subgroup === subgroup.id) }))
        : [{ features }],
      demonstrations: demonstrations.filter((example, index) => demonstrations.findIndex((other) => other.href === example.href) === index),
    };
  });
}

export function documentationGroups(nav = navigation, input) {
  const data = currentCatalogue(input);
  const inventory = nav?.docsGroups ? nav : navigation;
  return inventory.docsGroups.map((group) => {
    if (!group.id) return { ...group, anchor: group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-') };
    const family = data.groups.find((entry) => entry.id === group.id);
    if (!family) throw new Error(`Unknown documentation family: ${group.id}`);
    return { ...group, label: family.label, anchor: family.id };
  });
}

export function guideContext(url, nav, input) {
  const group = documentationGroups(nav, input).find((entry) => entry.id && entry.items.some((item) => item.url === url));
  return group ? { label: group.label, href: `/features.html#${group.id}`, id: group.id } : undefined;
}
