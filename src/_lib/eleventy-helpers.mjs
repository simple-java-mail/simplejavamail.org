import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

function journalHeadingPermalink(slug, options, state, index) {
  const heading = state.tokens[index + 1];
  const children = heading.children || (heading.children = []);
  const title = options.getTokensText(children);
  const linkOpen = new state.Token("link_open", "a", 1);
  linkOpen.attrSet("class", "journal-heading-anchor");
  linkOpen.attrSet("href", `#${slug}`);
  linkOpen.attrSet("aria-label", `Link to ${title}`);
  const symbol = new state.Token("text", "", 0);
  symbol.content = "#";
  children.unshift(linkOpen, symbol, new state.Token("link_close", "a", -1));
}

export function createMarkdownLibrary() {
  const markdown = new MarkdownIt({ html: true, linkify: false, typographer: false });
  markdown.use(markdownItAnchor, {
    level: [2, 3, 4, 5, 6],
    slugify: slugifyHeading,
    uniqueSlugStartIndex: 2,
    tabIndex: false,
    permalink: journalHeadingPermalink,
  });
  return markdown;
}

export function hasMarkdownHeading(markdown, content, level) {
  return markdown.parse(String(content), {}).some((token) => token.type === "heading_open" && token.tag === `h${level}`);
}

const journalTodoPattern = /<!--\s*TODO(?:\s*\([^)]*\))?\s*:/i;

function lineOffset(value, index) {
  return String(value).slice(0, index).split("\n").length - 1;
}

export function findUnresolvedJournalTodo(markdown, content) {
  const tokens = markdown.parse(String(content), {});

  for (const token of tokens) {
    if (token.type === "html_block") {
      const match = journalTodoPattern.exec(token.content);
      if (match) return { line: (token.map?.[0] || 0) + lineOffset(token.content, match.index) + 1 };
    }

    if (token.type !== "inline") continue;
    let cursor = 0;
    for (const child of token.children || []) {
      if (child.type !== "html_inline") continue;
      const childStart = token.content.indexOf(child.content, cursor);
      const match = journalTodoPattern.exec(child.content);
      if (match) {
        const start = childStart < 0 ? cursor : childStart;
        return { line: (token.map?.[0] || 0) + lineOffset(token.content, start + match.index) + 1 };
      }
      if (childStart >= 0) cursor = childStart + child.content.length;
    }
  }

  return null;
}

export function enforceJournalTodoPolicy(markdown, content, filename, draft) {
  if (draft) return;
  const unresolvedTodo = findUnresolvedJournalTodo(markdown, content);
  if (unresolvedTodo) {
    throw new Error(`[journal] Resolve TODO marker in ${filename}:${unresolvedTodo.line} before publishing`);
  }
}

export function isoDate(value) {
  if (!value) return null;
  const normalized = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized) return null;
  return normalized;
}

export function formatDate(value) {
  const normalized = isoDate(value);
  if (!normalized) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${normalized}T00:00:00Z`));
}

export function rssDate(value) {
  const normalized = isoDate(value);
  return normalized ? new Date(`${normalized}T12:00:00Z`).toUTCString() : "";
}

export function isJournalArticleFilename(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(value);
}

function textFromHtml(value) {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ({
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
    })[entity]);
}

export function slugifyHeading(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

export function headingsFromHtml(content) {
  const headings = [];
  const pattern = /<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  for (const match of String(content).matchAll(pattern)) {
    headings.push({ depth: Number(match[1]), id: match[2], text: textFromHtml(match[3]).replace(/^#\s*/, "").trim() });
  }
  return headings;
}

function findNavItem(items, url) {
  for (const item of items || []) {
    if (item.url === url) return item;
    const child = findNavItem(item.children, url);
    if (child) return child;
  }
  return null;
}

export function navItemForUrl(groups, url) {
  for (const group of groups || []) {
    const item = findNavItem(group.items, url);
    if (item) return item;
  }
  return null;
}

function validateDocumentationItems(items, pageUrls, docsUrls, errors) {
  for (const item of items || []) {
    if (typeof item.title !== "string" || !item.title.trim()) {
      errors.push(`documentation navigation item for ${item.url || "an unknown URL"} needs a title`);
    }
    if (typeof item.url !== "string" || !item.url.startsWith("/")) {
      errors.push(`documentation navigation item ${item.title || "without a title"} needs a root-relative URL`);
    } else {
      if (docsUrls.has(item.url)) errors.push(`duplicate documentation navigation URL ${item.url}`);
      docsUrls.add(item.url);
      if (!pageUrls.has(item.url)) errors.push(`documentation navigation references missing page ${item.url}`);
    }
    validateDocumentationItems(item.children, pageUrls, docsUrls, errors);
  }
}

export function validateSiteData(siteData, navigation, pages) {
  const errors = [];
  const journal = siteData?.journal;
  for (const key of ["author", "indexUrl", "urlPrefix", "feedUrl"]) {
    if (typeof journal?.[key] !== "string" || !journal[key].trim()) errors.push(`site.journal.${key} must be non-blank text`);
  }
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
    validateDocumentationItems(group.items, pageUrls, docsUrls, errors);
  }

  if (journal?.indexUrl && !pageUrls.has(journal.indexUrl)) errors.push(`journal index references missing page ${journal.indexUrl}`);
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

export function journalArticleUrl(siteData, slug) {
  const prefix = siteData.journal.urlPrefix.endsWith("/") ? siteData.journal.urlPrefix : `${siteData.journal.urlPrefix}/`;
  return `${prefix}${slug}.html`;
}

export function journalNeighbor(collection, currentUrl, direction) {
  const entries = collection || [];
  const index = entries.findIndex((entry) => entry.url === currentUrl);
  if (index < 0) return null;
  const candidate = direction === "older" ? entries[index - 1] : entries[index + 1];
  if (!candidate) return null;
  return { title: candidate.data.title, url: candidate.url, category: candidate.data.category };
}

export function collectionSchema(siteData, collection) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: siteData.journal.title,
    description: siteData.journal.description,
    url: new URL(siteData.journal.indexUrl, siteData.url).toString(),
    hasPart: (collection || []).filter((entry) => !entry.data.draft).map((entry) => ({
      "@type": "TechArticle",
      headline: entry.data.title,
      url: new URL(entry.url, siteData.url).toString(),
    })),
  };
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
