import { parseDocument, DomUtils } from 'htmlparser2';

const classes = (node) => (node.attribs?.class || '').split(/\s+/);
export const isContents = (node) => classes(node).some((name) => name === 'toc' || name === 'guide-contents');

export function descendants(node) {
  const result = [];
  for (const child of node.children || []) {
    if (child.name) result.push(child);
    result.push(...descendants(child));
  }
  return result;
}

export function hasAncestor(node, predicate) {
  for (let parent = node.parent; parent; parent = parent.parent) if (predicate(parent)) return true;
  return false;
}

export function parseDocumentation(html, route = '/') {
  const document = parseDocument(html, { withStartIndices: true, withEndIndices: true, decodeEntities: true });
  const elements = descendants(document);
  const ids = new Map();
  for (const element of elements) {
    if (!element.attribs?.id) continue;
    const matches = ids.get(element.attribs.id) || [];
    matches.push(element);
    ids.set(element.attribs.id, matches);
  }
  return { document, elements, ids, route, html };
}

export function siteDestination(href, route, siteUrl = 'https://www.simplejavamail.org') {
  try {
    const url = new URL(href, new URL(route, siteUrl));
    const ownHost = new URL(siteUrl).hostname.replace(/^www\./, '');
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, '') !== ownHost) return undefined;
    return { route: url.pathname, id: decodeURIComponent(url.hash.slice(1)) };
  } catch { return undefined; }
}

export function destinationErrors(page, id, requireGuideBody = false) {
  const found = page.ids.get(id) || [];
  if (found.length !== 1) return [`${page.route}#${id}: expected one rendered target, found ${found.length}`];
  const target = found[0];
  const unavailable = (node) => ['noscript', 'script', 'style', 'pre', 'code', 'nav'].includes(node.name) || isContents(node);
  const errors = [];
  if (unavailable(target) || hasAncestor(target, unavailable)) errors.push(`${page.route}#${id}: target is inside navigation, contents, code or fallback markup`);
  if (!hasAncestor(target, (node) => node.name === 'main')) errors.push(`${page.route}#${id}: target is outside the main content`);
  if (requireGuideBody && !hasAncestor(target, (node) => node.name === 'article' && classes(node).includes('legacy-doc-content'))) {
    errors.push(`${page.route}#${id}: target is outside the guide body`);
  }
  return errors;
}

export function guideStructureErrors(page, contract = {}) {
  const errors = [];
  const body = page.elements.find((node) => node.name === 'article' && classes(node).includes('legacy-doc-content'));
  if (!body) return [`${page.route}: missing guide body`];
  const elements = descendants(body);
  for (const node of elements) {
    if (node.name === 'li' && !['ul', 'ol', 'menu'].includes(node.parent?.name)) errors.push(`${page.route}: list item is outside a list`);
    if (['ul', 'ol', 'menu'].includes(node.name)) {
      for (const child of node.children || []) {
        if (child.name && !['li', 'script', 'template'].includes(child.name)) errors.push(`${page.route}: <${child.name}> is directly inside <${node.name}>`);
        if (child.type === 'text' && child.data.trim()) errors.push(`${page.route}: stray text is directly inside a list`);
      }
    }
  }
  const contents = elements.filter(isContents);
  for (const toc of contents) {
    if (descendants(toc).some((node) => ['p', 'pre', 'table', 'img', 'form', 'article'].includes(node.name)
      || (/^h[1-6]$/.test(node.name) && hasAncestor(node, (parent) => parent.name === 'li')))) {
      errors.push(`${page.route}: substantive guide content is inside the contents box`);
    }
    let previous = -1;
    for (const link of descendants(toc).filter((node) => node.name === 'a' && node.attribs?.href)) {
      const destination = siteDestination(link.attribs.href, page.route);
      if (!destination?.id || destination.route !== page.route) continue;
      const target = page.ids.get(destination.id)?.[0];
      if (!target) { errors.push(`${page.route}: contents references missing #${destination.id}`); continue; }
      if (hasAncestor(target, isContents)) continue; // Reported by destination and contents-structure checks.
      if (target.startIndex < previous) errors.push(`${page.route}: contents order disagrees with page order at #${destination.id}`);
      previous = target.startIndex;
    }
  }
  if (contract.contentsBefore) {
    const target = page.ids.get(contract.contentsBefore)?.[0];
    if (!contents.length || !target || contents[0].startIndex > target.startIndex) errors.push(`${page.route}: contents must precede #${contract.contentsBefore}`);
  }
  let previous = -1;
  for (const id of contract.order || []) {
    const target = page.ids.get(id)?.[0];
    if (!target) errors.push(`${page.route}: required section #${id} is missing`);
    else {
      if (target.startIndex < previous) errors.push(`${page.route}: section #${id} is out of its agreed order`);
      previous = target.startIndex;
    }
  }
  const headings = elements.filter((node) => /^h[1-6]$/.test(node.name) && !hasAncestor(node, isContents));
  for (const expected of contract.headings || []) {
    const heading = page.ids.get(expected.id)?.[0];
    if (!heading || heading.name !== `h${expected.level}`) errors.push(`${page.route}: #${expected.id} must be an H${expected.level}`);
    if (heading && expected.parent) {
      const parent = headings.filter((node) => node.startIndex < heading.startIndex && Number(node.name.slice(1)) < expected.level).at(-1);
      if (parent?.attribs?.id !== expected.parent) errors.push(`${page.route}: #${expected.id} must belong under #${expected.parent}`);
    }
  }
  for (const expected of contract.modules || []) {
    const heading = page.ids.get(expected.id)?.[0];
    const badges = heading ? descendants(heading).filter((node) => classes(node).includes('module-badge')).map(DomUtils.textContent) : [];
    for (const label of expected.required || []) if (!badges.includes(label)) errors.push(`${page.route}: #${expected.id} is missing ${label}`);
    for (const label of expected.forbidden || []) if (badges.includes(label)) errors.push(`${page.route}: #${expected.id} incorrectly requires ${label}`);
  }
  return [...new Set(errors)];
}

export function staleFeatureLinkErrors(page, legacy) {
  const errors = [];
  for (const link of page.elements.filter((node) => node.name === 'a' && node.attribs?.href)) {
    const target = siteDestination(link.attribs.href, page.route);
    if (target?.route === '/features.html' && Object.hasOwn(legacy, target.id)) errors.push(`${page.route}: stale Features link ${link.attribs.href}; use ${legacy[target.id]}`);
  }
  return [...new Set(errors)];
}
