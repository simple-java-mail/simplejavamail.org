import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const examplesDirectory = fileURLToPath(new URL("../assets/journal/examples/", import.meta.url));

export function journalCodeExample(relativePath) {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)) {
    throw new Error("[journal] Code examples must use a path relative to assets/journal/examples");
  }
  const filename = realpathSync(path.resolve(examplesDirectory, relativePath));
  const relative = path.relative(realpathSync(examplesDirectory), filename);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("[journal] Code examples must stay inside assets/journal/examples");
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
