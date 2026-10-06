import { enforceJournalTodoPolicy, hasMarkdownHeading, isJournalArticleFilename } from "./eleventy-helpers.mjs";

export function enforceArticlePolicy(markdown, content, filename, draft, runMode) {
  if (!isJournalArticleFilename(filename)) {
    throw new Error(`[article] Article filenames must use lowercase kebab-case: ${filename}`);
  }
  if (!draft && hasMarkdownHeading(markdown, content, 1)) {
    throw new Error(`[article] Use the front matter title instead of an H1 heading in ${filename}`);
  }
  if (!content.trim()) throw new Error(`[article] Article body is empty in ${filename}`);
  enforceJournalTodoPolicy(markdown, content, filename, draft);
  if (draft && runMode === "build") return false;
}
