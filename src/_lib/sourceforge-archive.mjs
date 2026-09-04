import { readdir, readFile } from "node:fs/promises";
import MarkdownIt from "markdown-it";
import { decodeGoogleCodeEntities } from "./google-code-archive.mjs";

const snapshotDirectory = new URL("../_data/sourceforge-sources/", import.meta.url);
const snapshotFilename = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;
const sourceKinds = new Set(["project", "discussion", "ticket", "mail"]);
const projectNames = new Map([
  ["msgparser", "msgparser"],
  ["dkim-javamail", "DKIM for JavaMail"],
  ["javamail-crypto", "JavaMail Cryptography API"],
]);

const sourceRoutes = new Map([
  ["https://sourceforge.net/projects/msgparser", "/sources/sourceforge/msgparser/project.html"],
  ["https://sourceforge.net/projects/dkim-javamail", "/sources/sourceforge/dkim-javamail/project.html"],
  ["https://sourceforge.net/projects/javamail-crypto", "/sources/sourceforge/javamail-crypto/project.html"],
  ["https://sourceforge.net/p/dkim-javamail/discussion/893011/thread/c25e4d2b", "/sources/sourceforge/dkim-javamail/discussion/error-sending-to-yahoo.html"],
  ["https://sourceforge.net/p/dkim-javamail/discussion/893011/thread/b46737da", "/sources/sourceforge/dkim-javamail/discussion/body-end-of-line-normalization-missing.html"],
  ["https://sourceforge.net/p/javamail-crypto/mailman/message/457552", "/sources/sourceforge/javamail-crypto/mailman/message-457552.html"],
  ["https://sourceforge.net/p/javamail-crypto/bugs/3", "/sources/sourceforge/javamail-crypto/bugs/3.html"],
]);

export function sourceForgeArchiveLink(value) {
  const candidate = String(value || "").trim();
  const normalizedCandidate = candidate.replace(/%5C(?=_)/gi, "").replace(/\\(?=_)/g, "");
  let url;
  try {
    url = new URL(normalizedCandidate);
  } catch {
    return candidate;
  }
  if (url.hostname.toLowerCase() !== "sourceforge.net") return candidate;
  if (url.pathname === "/project/showfiles.php" && url.searchParams.get("group_id") === "246725") {
    return "https://sourceforge.net/projects/dkim-javamail/files/";
  }
  const key = `https://sourceforge.net${url.pathname.replace(/\/+$/, "")}`;
  const local = sourceRoutes.get(key);
  return local ? `${local}${url.hash}` : normalizedCandidate;
}

export function createSourceForgeMarkupLibrary() {
  const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: true });
  markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
    const hrefIndex = tokens[index].attrIndex("href");
    if (hrefIndex >= 0) tokens[index].attrs[hrefIndex][1] = sourceForgeArchiveLink(tokens[index].attrs[hrefIndex][1]);
    return renderer.renderToken(tokens, index, options, environment);
  };
  return markdown;
}

export function decodeSourceForgeEntities(value) {
  return decodeGoogleCodeEntities(value).replace(/&nbsp;/g, "\u00a0");
}

export function sourceForgeTimestamp(value) {
  const candidate = String(value || "").trim();
  const date = new Date(`${candidate.replace(" ", "T")}Z`);
  if (Number.isNaN(date.valueOf())) throw new Error(`[sourceforge] Invalid timestamp: ${value}`);
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

function sourceForgeDate(value) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.valueOf())) throw new Error(`[sourceforge] Invalid date: ${value}`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function normalizeProject(source) {
  const project = source.payload;
  if (project.shortname !== source.project) {
    throw new Error(`[sourceforge] ${source.slug} contains project ${project.shortname}`);
  }
  return {
    ...source,
    title: project.name,
    kindLabel: "project",
    projectName: project.name,
    summary: project.short_description,
    registered: sourceForgeDate(project.creation_date),
    developers: project.developers || [],
    licenses: (project.categories?.license || []).map((license) => license.fullname),
    developmentStatus: (project.categories?.developmentstatus || []).map((status) => status.fullname.replace(/^\d+\s*-\s*/, "")),
    tabs: (project.tools || []).map((tool) => tool.mount_label),
  };
}

function normalizeDiscussion(source) {
  const topic = source.payload.topic;
  if (!topic || !Array.isArray(topic.posts) || source.payload.count !== topic.posts.length) {
    throw new Error(`[sourceforge] ${source.slug} contains an incomplete discussion snapshot`);
  }
  const postIds = new Set();
  const posts = topic.posts.map((post) => {
    if (!/^[a-f0-9]+(?:\/[a-f0-9]+)*$/.test(post.slug) || postIds.has(post.slug)) {
      throw new Error(`[sourceforge] ${source.slug} contains invalid or duplicate post ${post.slug}`);
    }
    postIds.add(post.slug);
    return {
      ...post,
      depth: post.slug.split("/").length,
      authorName: source.authorNames?.[post.author] || post.author,
      posted: sourceForgeTimestamp(post.timestamp),
    };
  });
  return {
    ...source,
    title: topic.subject,
    kindLabel: "discussion",
    projectName: projectNames.get(source.project) || source.project,
    posts,
    created: posts[0]?.posted,
    updated: posts.at(-1)?.posted,
    tabs: ["Summary", "Files", "Support", "Discussion"],
  };
}

function normalizeTicket(source) {
  const ticket = source.payload.ticket;
  const expectedTicketNumber = Number(source.permalink.match(/\/bugs\/(?<ticket>[0-9]+)\.html$/)?.groups?.ticket);
  if (!ticket || ticket.ticket_num !== expectedTicketNumber) {
    throw new Error(`[sourceforge] ${source.slug} contains an unexpected ticket`);
  }
  return {
    ...source,
    title: `#${ticket.ticket_num} ${ticket.summary}`,
    kindLabel: "ticket",
    projectName: projectNames.get(source.project) || source.project,
    reporterName: source.authorNames?.[ticket.reported_by] || ticket.reported_by,
    created: sourceForgeTimestamp(ticket.created_date),
    updated: sourceForgeTimestamp(ticket.mod_date),
    tabs: ["Summary", "Files", "Support", "Mailing Lists", "Tickets", "News", "Discussion", "Code"],
  };
}

function normalizeMail(source) {
  const message = source.payload;
  const expectedMessageId = Number(source.permalink.match(/\/message-(?<message>[0-9]+)\.html$/)?.groups?.message);
  if (message.id !== expectedMessageId || /=(?:20|A0|E9|C0)(?:\b|$)/.test(message.body)) {
    throw new Error(`[sourceforge] ${source.slug} contains an invalid or undecoded mail snapshot`);
  }
  return {
    ...source,
    title: message.title,
    kindLabel: "mailing-list message",
    projectName: projectNames.get(source.project) || source.project,
    posted: sourceForgeTimestamp(message.timestamp),
    tabs: ["Summary", "Files", "Support", "Mailing Lists", "Tickets", "News", "Discussion", "Code"],
  };
}

function normalizeSource(source, filename) {
  if (!sourceKinds.has(source.kind) || source.slug !== filename.replace(/\.json$/, "")) {
    throw new Error(`[sourceforge] Invalid source metadata in ${filename}`);
  }
  if (!source.permalink.startsWith("/sources/sourceforge/") || !source.permalink.endsWith(".html")) {
    throw new Error(`[sourceforge] Invalid permalink in ${filename}`);
  }
  return {
    project: normalizeProject,
    discussion: normalizeDiscussion,
    ticket: normalizeTicket,
    mail: normalizeMail,
  }[source.kind](source);
}

export async function loadSourceForgeSources() {
  const filenames = (await readdir(snapshotDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));

  return Promise.all(filenames.map(async (filename) => {
    if (!snapshotFilename.test(filename)) throw new Error(`[sourceforge] Invalid snapshot filename: ${filename}`);
    const source = JSON.parse(await readFile(new URL(filename, snapshotDirectory), "utf8"));
    return normalizeSource(source, filename);
  }));
}
