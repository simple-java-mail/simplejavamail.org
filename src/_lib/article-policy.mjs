import { enforceJournalTodoPolicy, hasMarkdownHeading, isJournalArticleFilename } from "./eleventy-helpers.mjs";

function validateArticleBody(content, filename) {
  if (!isJournalArticleFilename(filename)) {
    throw new Error(`[article] Article filenames must use lowercase kebab-case: ${filename}`);
  }
  if (!content.trim()) throw new Error(`[article] Article body is empty in ${filename}`);
}

export function enforceArticlePolicy(markdown, content, filename) {
  validateArticleBody(content, filename);
  if (hasMarkdownHeading(markdown, content, 1)) {
    throw new Error(`[article] Use the front matter title instead of an H1 heading in ${filename}`);
  }
  enforceJournalTodoPolicy(markdown, content, filename, false);
}

export function enforceJournalPolicy(markdown, content, filename, draft, runMode) {
  if (draft) validateArticleBody(content, filename);
  else enforceArticlePolicy(markdown, content, filename);
  if (draft && runMode === "build") return false;
}
