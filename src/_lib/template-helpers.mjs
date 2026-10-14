import { collectionSchema, createMarkdownLibrary, formatDate, headingsFromHtml, isoDate, journalNeighbor, navItemForUrl, orderJournalEntries, rssDate } from './eleventy-helpers.mjs';
import { createGoogleCodeCommentLibrary, createGoogleCodeProjectLibrary, decodeGoogleCodeEntities } from './google-code-archive.mjs';
import { createSourceForgeMarkupLibrary, decodeSourceForgeEntities } from './sourceforge-archive.mjs';
import { journalCodeExample } from './journal-code-example.mjs';
import { articleNeighbor } from './article-context.mjs';
import { fieldGuideSections } from './field-guide-sections.mjs';

// Shared by Eleventy and the local Article Workbench; keep rendering rules in one place.
export function createTemplateHelpers(markdown = createMarkdownLibrary()) {
  const helpers = {};
  const register = (name, helper) => { helpers[name] = helper; };
  const googleCodeComments = createGoogleCodeCommentLibrary();
  const googleCodeProjects = createGoogleCodeProjectLibrary();
  const sourceForgeMarkup = createSourceForgeMarkupLibrary();

  register("eq", (left, right) => left === right);
  register("year", () => new Date().getFullYear());
  register("activeClass", (href, current) => href === current ? "is-active" : "");
  register("docsActiveClass", (href, current, breadcrumbParent) => href === current || href === breadcrumbParent ? "is-active" : "");
  register("navItemForUrl", navItemForUrl);
  register("json", (value) => JSON.stringify(value).replace(/</g, "\\u003c"));
  register("journalOldestFirst", (value) => orderJournalEntries(value));
  register("isoDate", isoDate);
  register("formatDate", formatDate);
  register("journalRssDate", rssDate);
  register("capitalize", (value) => {
    const text = String(value ?? "");
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
  });
  register("join", (values, separator) => (values || []).join(separator));
  register("upper", (value) => String(value ?? "").toUpperCase());
  register("journalHeadings", headingsFromHtml);
  register("journalNeighbor", journalNeighbor);
  register("articleNeighbor", articleNeighbor);
  register("fieldGuideSections", fieldGuideSections);
  register("journalCollectionSchema", collectionSchema);
  register("absoluteUrl", (url, base) => new URL(url, base).toString());
  register("googleCodeComment", (value) => googleCodeComments.render(decodeGoogleCodeEntities(value || "")));
  register("googleCodeProject", (value) => googleCodeProjects.render(decodeGoogleCodeEntities(value || "")));
  register("sourceForgeMarkup", (value) => sourceForgeMarkup.render(decodeSourceForgeEntities(value || "")));

  register("markdownInline", (value) => markdown.renderInline(String(value ?? "")));
  register("journalCodeExample", journalCodeExample);

  return helpers;
}
