import { journalArticleUrl } from "./eleventy-helpers.mjs";

export function validateCommentsUrl(value, site) {
  if (value === undefined) return;
  const url = new URL(value);
  if (url.origin !== new URL(site.url).origin || !url.pathname.startsWith(site.journal.urlPrefix)
      || url.search || url.hash || url.username || url.password) {
    throw new Error("commentsUrl must be a canonical Journal URL without query parameters or a fragment");
  }
}

export function journalCommentConfig(data) {
  validateCommentsUrl(data.commentsUrl, data.site);
  return {
    ...data.journalComments,
    host: process.env.JOURNAL_COMMENTS_HOST || data.journalComments.host,
    url: data.commentsUrl || new URL(journalArticleUrl(data.site, data.page.fileSlug), data.site.url).href,
  };
}
