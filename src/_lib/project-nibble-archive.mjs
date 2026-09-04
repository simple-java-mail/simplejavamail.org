import { readdir, readFile } from "node:fs/promises";
import xss from "xss";
import { googleCodeArchiveLink } from "./google-code-archive.mjs";

const snapshotDirectory = new URL("../_data/project-nibble-posts/", import.meta.url);
const snapshotFilename = /^(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const waybackUrl = /^https?:\/\/web\.archive\.org\/web\/\d+(?:[a-z_]+)?\/(https?:\/\/.*)$/i;
const projectNibbleUrl = /^https?:\/\/blog\.projectnibble\.org(?::80)?(?<path>\/[^?#]*)(?<search>\?[^#]*)?(?<hash>#.*)?$/i;

const localPosts = new Map([
  ["/2009/04/27/vesijama-very-simple-java-mail/", "vesijama-very-simple-java-mail"],
  ["/2009/04/27/vesijama-very-simple-java-mail/comment-page-1/", "vesijama-very-simple-java-mail"],
  ["/2011/03/18/vesijama-renamed-to-simple-java-mail/", "vesijama-renamed-to-simple-java-mail"],
  ["/2011/03/18/vesijama-renamed-to-simple-java-mail/comment-page-1/", "vesijama-renamed-to-simple-java-mail"],
  ["/2011/08/13/simple-java-mail-1-9-is-now-available-in-maven-central/", "simple-java-mail-1-9-is-now-available-in-maven-central"],
]);

const htmlFilter = new xss.FilterXSS({
  whiteList: {
    a: ["href", "title"],
    abbr: ["title"],
    acronym: ["title"],
    b: [],
    blockquote: ["cite"],
    br: [],
    cite: [],
    code: [],
    del: ["datetime"],
    em: [],
    h2: [],
    h3: [],
    h4: [],
    i: [],
    li: [],
    ol: [],
    p: [],
    pre: ["data-language"],
    q: ["cite"],
    small: [],
    strong: [],
    ul: [],
  },
  onTagAttr(tag, name, value, isWhiteAttr) {
    if (tag !== "a" || name !== "href" || !isWhiteAttr) return undefined;
    const safeValue = xss.safeAttrValue(tag, name, projectNibbleArchiveLink(value));
    return safeValue ? `href="${safeValue}"` : "";
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed", "form"],
});

export function projectNibbleArchiveLink(value) {
  const candidate = String(value || "").trim();
  const archived = waybackUrl.exec(candidate);
  const original = archived?.[1] || candidate;
  const googleCodeLink = googleCodeArchiveLink(original);
  if (googleCodeLink !== original) return googleCodeLink;

  if (/^https?:\/\/search\.maven\.org\/#artifactdetails(?:%7C|\|)org\.codemonkey\.simplejavamail(?:%7C|\|)simple-java-mail(?:%7C|\|)1\.8(?:%7C|\|)jar$/i.test(original)) {
    return "https://repo1.maven.org/maven2/org/codemonkey/simplejavamail/simple-java-mail/1.9.1/";
  }

  const blog = projectNibbleUrl.exec(original);
  if (!blog?.groups) return candidate;

  const slug = localPosts.get(blog.groups.path);
  if (!slug) return candidate;
  return `/sources/project-nibble/${slug}.html${blog.groups.hash || ""}`;
}

export function sanitizeProjectNibbleHtml(value) {
  return htmlFilter.process(String(value || ""));
}

function normalizePost(post, slug, filename) {
  if (post.slug !== slug) {
    throw new Error(`[project-nibble] ${filename} contains slug ${post.slug}`);
  }
  if (!Array.isArray(post.comments)) {
    throw new Error(`[project-nibble] ${filename} has no comments array`);
  }

  const commentIds = new Set();
  const comments = post.comments.map((comment) => {
    const id = Number(comment.id);
    if (!Number.isSafeInteger(id) || id < 1 || commentIds.has(id)) {
      throw new Error(`[project-nibble] ${filename} contains invalid or duplicate comment ID ${comment.id}`);
    }
    commentIds.add(id);
    return {
      ...comment,
      id,
      depth: Math.max(1, Number.isSafeInteger(Number(comment.depth)) ? Number(comment.depth) : 1),
      byAuthor: Boolean(comment.byAuthor),
      contentHtml: sanitizeProjectNibbleHtml(comment.contentHtml),
    };
  });

  return {
    ...post,
    contentHtml: sanitizeProjectNibbleHtml(post.contentHtml),
    comments,
  };
}

export async function loadProjectNibblePosts() {
  const filenames = (await readdir(snapshotDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));

  return Promise.all(filenames.map(async (filename) => {
    const match = snapshotFilename.exec(filename);
    if (!match?.groups) throw new Error(`[project-nibble] Invalid snapshot filename: ${filename}`);
    const post = JSON.parse(await readFile(new URL(filename, snapshotDirectory), "utf8"));
    return normalizePost(post, match.groups.slug, filename);
  }));
}
