import { journalArticleUrl, orderJournalEntries } from "./eleventy-helpers.mjs";

export function articleUrl(data, section = data.articleSection) {
  return section ? `${section.urlPrefix}${data.page.fileSlug}.html`
    : journalArticleUrl(data.site, data.page.fileSlug);
}

export function orderCaseStudies(entries) {
  return [...(entries || [])].sort((left, right) => left.data.caseStudy.order - right.data.caseStudy.order);
}

export function articleNeighbor(entries, currentUrl, direction, kind) {
  const ordered = kind === "caseStudy" ? orderCaseStudies(entries) : orderJournalEntries(entries);
  const index = ordered.findIndex((entry) => entry.url === currentUrl);
  if (index < 0) return null;
  const entry = ordered[index + (direction === "older" ? -1 : 1)];
  return entry ? { title: entry.data.title, url: entry.url, category: entry.data.category } : null;
}
