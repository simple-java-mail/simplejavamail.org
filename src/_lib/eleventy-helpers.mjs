export function navItemForUrl(groups, url) {
  for (const group of groups || []) {
    const item = (group.items || []).find((candidate) => candidate.url === url);
    if (item) return item;
  }
  return null;
}

export function validateSiteData(siteData, navigation, pages) {
  const errors = [];
  try {
    new URL(siteData?.url);
  } catch {
    errors.push("site.url must be an absolute URL");
  }

  const pageUrls = new Set();
  for (const page of pages || []) {
    if (!page.url) continue;
    if (pageUrls.has(page.url)) errors.push(`duplicate page URL ${page.url}`);
    pageUrls.add(page.url);
  }

  const docsUrls = new Set();
  for (const group of navigation?.docsGroups || []) {
    for (const item of group.items || []) {
      if (typeof item.title !== "string" || !item.title.trim()) errors.push(`documentation navigation item for ${item.url || "an unknown URL"} needs a title`);
      if (typeof item.url !== "string" || !item.url.startsWith("/")) {
        errors.push(`documentation navigation item ${item.title || "without a title"} needs a root-relative URL`);
        continue;
      }
      if (docsUrls.has(item.url)) errors.push(`duplicate documentation navigation URL ${item.url}`);
      docsUrls.add(item.url);
      if (!pageUrls.has(item.url)) errors.push(`documentation navigation references missing page ${item.url}`);
    }
  }

  for (const page of pages || []) {
    const parent = page.data?.breadcrumbParent;
    if (!parent) continue;
    if (parent === page.url) errors.push(`page cannot be its own breadcrumb parent: ${page.url}`);
    if (!pageUrls.has(parent)) errors.push(`breadcrumb parent references missing page ${parent}`);
    if (page.data.layout === "layouts/base.hbs" && !docsUrls.has(parent)) {
      errors.push(`breadcrumb parent is missing from documentation navigation: ${parent}`);
    }
  }

  if (errors.length) throw new Error(`[site-data] ${errors.join("; ")}`);
}

export function hardenExternalLinks(html, siteUrl) {
  const siteOrigin = new URL(siteUrl).origin;
  return html.replace(/<a\b([^>]*?)\bhref=(["'])(https?:\/\/[^"']+)\2([^>]*)>/gi, (match, before, quote, href, after) => {
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      return match;
    }
    if (parsed.origin === siteOrigin) return match;

    let tag = `<a${before}href=${quote}${href}${quote}${after}>`;
    if (!/\btarget=/i.test(tag)) tag = tag.replace(/>$/, ' target="_blank">');
    if (!/\brel=/i.test(tag)) tag = tag.replace(/>$/, ' rel="noopener noreferrer">');
    return tag;
  });
}
