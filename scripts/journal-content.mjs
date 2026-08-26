import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import { parse as parseYaml } from 'yaml';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const ARTICLE_FILENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

export function loadJournalEntries({ directory, defaultAuthor, includeDrafts = false, urlPrefix = '/journal/' }) {
  if (!fs.existsSync(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile()
      && entry.name.endsWith('.md')
      && !['readme.md', 'article-template.md'].includes(entry.name.toLowerCase()))
    .map((entry) => readJournalEntry(path.join(directory, entry.name), { defaultAuthor, urlPrefix }))
    .filter((entry) => includeDrafts || !entry.draft)
    .sort((left, right) => {
      const byDate = right.publishedIso.localeCompare(left.publishedIso);
      return byDate || left.title.localeCompare(right.title);
    });

  const slugs = new Set();
  for (const entry of entries) {
    if (slugs.has(entry.slug)) throw new Error(`[journal] Duplicate article slug: ${entry.slug}`);
    slugs.add(entry.slug);
  }

  return entries.map((entry, index) => ({
    ...entry,
    newer: index > 0 ? summarizeEntry(entries[index - 1]) : null,
    older: index < entries.length - 1 ? summarizeEntry(entries[index + 1]) : null,
  }));
}

function readJournalEntry(file, { defaultAuthor, urlPrefix }) {
  const filename = path.basename(file);
  if (!ARTICLE_FILENAME.test(filename)) {
    throw new Error(`[journal] Article filenames must use lowercase kebab-case: ${filename}`);
  }

  const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const match = FRONT_MATTER.exec(source);
  if (!match) throw new Error(`[journal] Missing YAML front matter in ${filename}`);

  let attributes;
  try {
    attributes = parseYaml(match[1]);
  } catch (error) {
    throw new Error(`[journal] Invalid YAML in ${filename}: ${error.message}`);
  }
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    throw new Error(`[journal] Front matter must be a YAML object in ${filename}`);
  }

  const markdown = source.slice(match[0].length).trim();
  if (!markdown) throw new Error(`[journal] Article body is empty in ${filename}`);

  const title = requiredText(attributes.title, 'title', filename);
  const description = requiredText(attributes.description, 'description', filename);
  const category = requiredText(attributes.category, 'category', filename);
  const author = optionalText(attributes.author, 'author', filename) || defaultAuthor;
  const published = normalizeDate(attributes.published, 'published', filename, true);
  const updated = normalizeDate(attributes.updated, 'updated', filename, false);
  const appliesTo = normalizeTextList(attributes.appliesTo, 'appliesTo', filename);
  const draft = attributes.draft === undefined ? false : attributes.draft;
  if (typeof draft !== 'boolean') throw new Error(`[journal] draft must be true or false in ${filename}`);

  const slug = path.basename(filename, '.md');
  const rendered = renderMarkdown(markdown, filename);
  const normalizedPrefix = urlPrefix.endsWith('/') ? urlPrefix : `${urlPrefix}/`;

  return {
    sourceFile: file,
    slug,
    title,
    description,
    category,
    author,
    appliesTo,
    draft,
    publishedIso: published,
    publishedLabel: formatDate(published),
    publishedRss: toRssDate(published),
    updatedIso: updated,
    updatedLabel: updated ? formatDate(updated) : null,
    updatedRss: updated ? toRssDate(updated) : null,
    url: `${normalizedPrefix}${slug}.html`,
    out: `journal/${slug}.html`,
    html: rendered.html,
    headings: rendered.headings,
  };
}

function renderMarkdown(markdown, filename) {
  const headings = [];
  const usedHeadingIds = new Map();
  const renderer = {
    heading(token) {
      if (token.depth === 1) {
        throw new Error(`[journal] Use the front matter title instead of an H1 heading in ${filename}`);
      }

      const inlineHtml = this.parser.parseInline(token.tokens);
      const text = htmlToText(inlineHtml).trim();
      const baseId = slugify(text) || 'section';
      const seen = usedHeadingIds.get(baseId) || 0;
      usedHeadingIds.set(baseId, seen + 1);
      const id = seen === 0 ? baseId : `${baseId}-${seen + 1}`;
      if (token.depth <= 3) headings.push({ depth: token.depth, id, text });

      return `<h${token.depth} id="${escapeAttribute(id)}"><a class="journal-heading-anchor" href="#${escapeAttribute(id)}" aria-label="Link to ${escapeAttribute(text)}">#</a>${inlineHtml}</h${token.depth}>\n`;
    },
  };

  const parser = new Marked({ gfm: true, breaks: false, renderer });
  const html = parser.parse(markdown);
  if (typeof html !== 'string') throw new Error(`[journal] Asynchronous Markdown output is not supported for ${filename}`);
  return { html, headings };
}

function requiredText(value, key, filename) {
  const normalized = optionalText(value, key, filename);
  if (!normalized) throw new Error(`[journal] Missing ${key} in ${filename}`);
  return normalized;
}

function optionalText(value, key, filename) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`[journal] ${key} must be text in ${filename}`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`[journal] ${key} cannot be blank in ${filename}`);
  return normalized;
}

function normalizeTextList(value, key, filename) {
  if (value === undefined || value === null) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error(`[journal] ${key} must contain non-blank text values in ${filename}`);
    }
    return item.trim();
  });
}

function normalizeDate(value, key, filename, required) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`[journal] Missing ${key} in ${filename}`);
    return null;
  }
  const normalized = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`[journal] ${key} must use YYYY-MM-DD in ${filename}`);
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`[journal] ${key} is not a real calendar date in ${filename}`);
  }
  return normalized;
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function toRssDate(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`).toUTCString();
}

function summarizeEntry(entry) {
  return { title: entry.title, url: entry.url, category: entry.category };
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function htmlToText(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ({
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    })[entity]);
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderJournalFeed({ siteUrl, indexUrl, feedUrl, title, description, entries }) {
  const items = entries.map((entry) => {
    const absoluteUrl = new URL(entry.url, siteUrl).toString();
    return [
      '    <item>',
      `      <title>${escapeXml(entry.title)}</title>`,
      `      <link>${escapeXml(absoluteUrl)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(absoluteUrl)}</guid>`,
      `      <pubDate>${entry.publishedRss}</pubDate>`,
      `      <category>${escapeXml(entry.category)}</category>`,
      `      <description>${cdata(entry.description)}</description>`,
      `      <content:encoded>${cdata(absolutizeRootLinks(entry.html, siteUrl))}</content:encoded>`,
      '    </item>',
    ].join('\n');
  }).join('\n');

  const newestDate = entries[0]?.updatedRss || entries[0]?.publishedRss;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(new URL(indexUrl, siteUrl).toString())}</link>`,
    `    <atom:link href="${escapeXml(new URL(feedUrl, siteUrl).toString())}" rel="self" type="application/rss+xml"/>`,
    `    <description>${escapeXml(description)}</description>`,
    '    <language>en</language>',
    ...(newestDate ? [`    <lastBuildDate>${newestDate}</lastBuildDate>`] : []),
    ...(items ? [items] : []),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absolutizeRootLinks(html, siteUrl) {
  return html.replace(/\b(href|src)=(['"])(\/[^'"]*)\2/gi, (_match, attribute, quote, url) => {
    return `${attribute}=${quote}${new URL(url, siteUrl).toString()}${quote}`;
  });
}

function cdata(value) {
  return `<![CDATA[${String(value).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}
