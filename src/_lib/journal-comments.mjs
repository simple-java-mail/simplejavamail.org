import { articleUrl } from "./article-context.mjs";

export function validateCommentsUrl(value, site) {
  if (value === undefined) return;
  const url = new URL(value);
  const prefixes = [site.journal.urlPrefix, "/case-studies/"];
  if (url.origin !== new URL(site.url).origin || !prefixes.some((prefix) => url.pathname.startsWith(prefix))
      || url.search || url.hash || url.username || url.password) {
    throw new Error("commentsUrl must be a canonical Journal or case-study URL without query parameters or a fragment");
  }
}

export function journalCommentConfig(data) {
  validateCommentsUrl(data.commentsUrl, data.site);
  return {
    ...data.journalComments,
    host: process.env.JOURNAL_COMMENTS_HOST || data.journalComments.host,
    url: data.commentsUrl || new URL(articleUrl(data), data.site.url).href,
  };
}
