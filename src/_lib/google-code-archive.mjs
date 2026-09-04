import { readdir, readFile } from "node:fs/promises";
import MarkdownIt from "markdown-it";
import xss from "xss";

const snapshotDirectory = new URL("../_data/google-code-issues/", import.meta.url);
const projectSnapshotDirectory = new URL("../_data/google-code-projects/", import.meta.url);
const wikiSnapshotDirectory = new URL("../_data/google-code-wikis/", import.meta.url);
const snapshotFilename = /^(?<project>[a-z0-9]+(?:-[a-z0-9]+)*)-(?<issueId>[0-9]+)\.json$/;
const projectSnapshotFilename = /^(?<project>[a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const wikiSnapshotFilename = /^(?<project>[a-z0-9]+(?:-[a-z0-9]+)*)-(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const adjectives = ["Happy", "Grumpy", "Quick", "Happy", "Massive", "Swift", "Helpful"];
const animals = ["Cat", "Dog", "Wombat", "Lion", "Kangaroo", "Giraffe", "Hippo", "Bird", "Ox", "Camel", "Elephant", "Panda", "Rabbit", "Bear", "Horse", "Rhino", "Monkey"];
const historicalRepository = "https://github.com/bbottema/simple-java-mail";
const initialVesijamaCommit = "4d5bf205a1a5193d4ea1d655f98e875f0b026e7f";
const vesijama11Commit = "5a4d1bcd69bd587dc143eabaf68579ff5be45923";
const simpleJavaMail18Commit = "0cccba388d3420efab84c70e4cda86c36d82069d";
const unavailableAttachments = new Set(["simple-java-mail/4/0/Recipient.java.patch"]);
const waybackUrl = /^https?:\/\/web\.archive\.org\/web\/\d+(?:[a-z_]+)?\/(https?:\/\/.*)$/i;
const googleCodeProjectUrl = /^https?:\/\/code\.google\.com\/p\/(?<project>[a-z0-9-]+)(?<path>\/[^?#]*)?(?<search>\?[^#]*)?(?<hash>#.*)?$/i;
const googleCodeHostedUrl = /^https?:\/\/(?<project>[a-z0-9-]+)\.googlecode\.com\/(?<area>files|svn\/trunk)\/(?<path>[^?#]+)$/i;

export function googleCodePseudoIdentity(commenterId) {
  const identityCount = adjectives.length * animals.length;
  const identity = Math.floor(Math.abs(Number(commenterId) || 0)) % identityCount;
  return `${adjectives[identity % adjectives.length]} ${animals[Math.floor(identity / adjectives.length)]}`;
}

export function googleCodeTimestamp(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  if (Number.isNaN(date.valueOf())) throw new Error(`[google-code] Invalid comment timestamp: ${timestamp}`);
  return {
    iso: date.toISOString(),
    label: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(date),
  };
}

export function createGoogleCodeCommentLibrary() {
  return new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: true });
}

export function createGoogleCodeProjectLibrary() {
  const markdown = createGoogleCodeCommentLibrary();
  markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
    const hrefIndex = tokens[index].attrIndex("href");
    if (hrefIndex >= 0) tokens[index].attrs[hrefIndex][1] = googleCodeArchiveLink(tokens[index].attrs[hrefIndex][1]);
    return renderer.renderToken(tokens, index, options, environment);
  };
  return markdown;
}

export function googleCodeArchiveLink(value) {
  const candidate = String(value || "").trim();
  const archived = waybackUrl.exec(candidate);
  const original = archived?.[1] || candidate;
  const projectUrl = googleCodeProjectUrl.exec(original);
  if (projectUrl?.groups) {
    const { project, path = "/", search = "", hash = "" } = projectUrl.groups;
    if (path === "/" || path === "") return `/sources/google-code/${project}/project.html${hash}`;
    if (/^\/wiki\/Manual\/?$/i.test(path)) return `/sources/google-code/${project}/wiki/manual.html${hash}`;
    if (/^\/issues\/detail$/i.test(path)) {
      const issueId = new URLSearchParams(search).get("id");
      if (/^[0-9]+$/.test(issueId || "")) return `/sources/google-code/${project}/issue-${issueId}.html${hash}`;
    }
    if (/^\/downloads\/detail$/i.test(path)) {
      const filename = new URLSearchParams(search).get("name");
      if (filename && /^[A-Za-z0-9][A-Za-z0-9._-]+$/.test(filename)) {
        return `https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/${project}/${encodeURIComponent(filename)}`;
      }
    }
    const sourcePath = /^\/source\/browse\/(?:trunk\/)?(?<file>.+)$/i.exec(path)?.groups?.file;
    if (project === "simple-java-mail" && sourcePath) {
      const decodedPath = decodeURIComponent(sourcePath);
      if (decodedPath === "tags/vesijama v1.1/src/org/codemonkey/vesijama/Mailer.java") {
        return `${historicalRepository}/blob/${vesijama11Commit}/src/org/codemonkey/vesijama/Mailer.java`;
      }
      return `${historicalRepository}/blob/${simpleJavaMail18Commit}/${decodedPath}`;
    }
    if (project === "vesijama" && sourcePath) {
      return `${historicalRepository}/blob/${initialVesijamaCommit}/${decodeURIComponent(sourcePath)}`;
    }
  }

  const hostedUrl = googleCodeHostedUrl.exec(original);
  if (!hostedUrl?.groups) return candidate;
  const { project, area, path } = hostedUrl.groups;
  if (area === "files") {
    return `https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/${project}/${encodeURIComponent(path)}`;
  }
  const decodedPath = decodeURIComponent(path);
  if (project === "simple-java-mail") {
    return `${historicalRepository}/blob/${simpleJavaMail18Commit}/${decodedPath}`;
  }
  if (project === "vesijama") {
    const classMatch = /^javadoc\/(?:users|developers)\/org\/codemonkey\/vesijama\/(?<className>[A-Za-z0-9.]+)\.html$/.exec(decodedPath);
    if (classMatch?.groups) {
      return `${historicalRepository}/blob/${initialVesijamaCommit}/src/org/codemonkey/vesijama/${classMatch.groups.className}.java`;
    }
    if (/^javadoc\/(?:users|developers)\/index\.html$/.test(decodedPath)) {
      return `${historicalRepository}/tree/${initialVesijamaCommit}/src/org/codemonkey/vesijama`;
    }
  }
  return candidate;
}

export function decodeGoogleCodeEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (entity) => ({
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&#39;": "'",
    })[entity]);
}

export function sanitizeGoogleCodeWikiHtml(value) {
  const prepared = String(value || "")
    .replace(/<h([1-6])><a name="([A-Za-z0-9_-]+)"\s*\/>([\s\S]*?)<\/h\1>/g, '<h$1 id="$2">$3</h$1>')
    .replace(/<h([1-6])><a name="([A-Za-z0-9_-]+)"\s*>([\s\S]*?)<\/a>([\s\S]*?)<\/h\1>/g, '<h$1 id="$2">$3$4</h$1>')
    .replace(/<a href="#[^"]+" class="section_anchor"><\/a>/g, "");
  const filter = new xss.FilterXSS({
    whiteList: {
      a: ["href", "title"],
      b: [],
      blockquote: [],
      br: [],
      code: [],
      em: [],
      h1: ["id"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      li: [],
      ol: [],
      p: [],
      pre: [],
      strong: [],
      tt: [],
      ul: [],
    },
    onTagAttr(tag, name, attrValue, isWhiteAttr) {
      if (tag !== "a" || name !== "href" || !isWhiteAttr) return undefined;
      const absolute = attrValue.startsWith("/") ? new URL(attrValue, "http://code.google.com").href : attrValue;
      const mapped = googleCodeArchiveLink(absolute);
      const stillUnavailable = /^https?:\/\/(?:code\.google\.com|[a-z0-9-]+\.googlecode\.com)\//i.test(mapped);
      if (stillUnavailable) return "";
      const safeValue = xss.safeAttrValue(tag, name, mapped);
      return safeValue ? `href="${safeValue}"` : "";
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed", "form"],
  });
  return filter.process(prepared)
    .replace(/<a><\/a>/g, "")
    .replace(/<h([1-6]) id="([^"]+)">/g, '<h$1 id="$2">');
}

function attachmentUrl(project, issueId, commentId, filename) {
  const path = [project, `issue-${issueId}`, `comment-${commentId}`, filename]
    .map((part) => encodeURIComponent(String(part)))
    .join("/");
  return `https://storage.googleapis.com/google-code-attachments/${path}`;
}

function normalizeIssue(issue, project, issueId) {
  if (issue.id !== issueId) {
    throw new Error(`[google-code] ${project}-${issueId}.json contains issue #${issue.id}`);
  }
  if (!Array.isArray(issue.comments)) {
    throw new Error(`[google-code] ${project} issue #${issueId} has no comments array`);
  }

  return {
    ...issue,
    project,
    snapshotDate: "2 September 2026",
    rawUrl: `https://storage.googleapis.com/google-code-archive/v2/code.google.com/${project}/issues/issue-${issueId}.json`,
    comments: issue.comments.map((comment) => ({
      ...comment,
      identity: googleCodePseudoIdentity(comment.commenterId),
      posted: googleCodeTimestamp(comment.timestamp),
      attachments: (comment.attachments || []).map((attachment) => ({
        ...attachment,
        url: attachmentUrl(project, issueId, comment.id, attachment.fileName),
        available: !unavailableAttachments.has(`${project}/${issueId}/${comment.id}/${attachment.fileName}`),
      })),
    })),
  };
}

export async function loadGoogleCodeIssues() {
  const filenames = (await readdir(snapshotDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));

  return Promise.all(filenames.map(async (filename) => {
    const match = snapshotFilename.exec(filename);
    if (!match?.groups) throw new Error(`[google-code] Invalid snapshot filename: ${filename}`);
    const project = match.groups.project;
    const issueId = Number(match.groups.issueId);
    const issue = JSON.parse(await readFile(new URL(filename, snapshotDirectory), "utf8"));
    return normalizeIssue(issue, project, issueId);
  }));
}

export async function loadGoogleCodeProjects() {
  const filenames = (await readdir(projectSnapshotDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));

  return Promise.all(filenames.map(async (filename) => {
    const match = projectSnapshotFilename.exec(filename);
    if (!match?.groups) throw new Error(`[google-code] Invalid project snapshot filename: ${filename}`);
    const snapshot = JSON.parse(await readFile(new URL(filename, projectSnapshotDirectory), "utf8"));
    const project = snapshot.payload;
    if (snapshot.project !== match.groups.project || project.name !== snapshot.project) {
      throw new Error(`[google-code] Invalid project snapshot metadata in ${filename}`);
    }
    return {
      ...project,
      project: snapshot.project,
      snapshotDate: snapshot.snapshotDate,
      rawUrl: snapshot.rawUrl,
      permalink: `/sources/google-code/${snapshot.project}/project.html`,
      created: project.creationTime ? googleCodeTimestamp(project.creationTime / 1000) : null,
      licenseLabel: project.license === "asf20" ? "Apache License 2.0" : project.license,
    };
  }));
}

export async function loadGoogleCodeWikis() {
  const filenames = (await readdir(wikiSnapshotDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));

  return Promise.all(filenames.map(async (filename) => {
    const match = wikiSnapshotFilename.exec(filename);
    if (!match?.groups) throw new Error(`[google-code] Invalid wiki snapshot filename: ${filename}`);
    const wiki = JSON.parse(await readFile(new URL(filename, wikiSnapshotDirectory), "utf8"));
    if (wiki.project !== match.groups.project || wiki.slug !== match.groups.slug) {
      throw new Error(`[google-code] Invalid wiki snapshot metadata in ${filename}`);
    }
    return {
      ...wiki,
      permalink: `/sources/google-code/${wiki.project}/wiki/${wiki.slug}.html`,
      contentHtml: sanitizeGoogleCodeWikiHtml(wiki.contentHtml),
    };
  }));
}
