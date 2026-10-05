import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const articlesDirectory = fileURLToPath(new URL("../assets/journal/articles/", import.meta.url));

export function journalCodeExample(relativePath) {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)) {
    throw new Error("[journal] Code examples must use a path relative to assets/journal/articles");
  }
  if (!/^[a-z0-9-]+\/examples\/[^/]/u.test(relativePath) || relativePath.split(/[\\/]/u).includes("..")) {
    throw new Error("[journal] Code examples must stay inside an article's examples directory");
  }
  const examplesDirectory = path.join(realpathSync(articlesDirectory), relativePath.split("/")[0], "examples");
  const filename = realpathSync(path.resolve(articlesDirectory, relativePath));
  const relative = path.relative(examplesDirectory, filename);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("[journal] Code examples must stay inside an article's examples directory");
  }
  const language = path.extname(filename).slice(1);
  const contents = readFileSync(filename, "utf8");
  const source = language === "java"
    ? contents.replace(/^(?:[ \t]*import[ \t]+[^\r\n]+;[ \t]*(?:\r?\n|$)|[ \t]*\r?\n)+/u, "")
    : contents;
  return {
    source,
    previewLines: source.split(/\r?\n/u).slice(0, 6),
    language,
  };
}
