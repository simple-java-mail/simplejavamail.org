import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import site from "../src/_data/site.json" with { type: "json" };

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const sitemap = readFileSync(path.join(dist, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replaceAll("&amp;", "&"));
const errors = [];
const sitemapFiles = new Set();

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(([tag]) => Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(([, name, , value]) => [name.toLowerCase(), value]),
  ));
}

function canonicals(html) {
  return tags(html, "link").filter((tag) => (tag.rel || "").toLowerCase().split(/\s+/).includes("canonical"));
}

function noindex(html) {
  return tags(html, "meta").some((tag) => /^(robots|googlebot)$/i.test(tag.name || "") && /\b(noindex|none)\b/i.test(tag.content || ""));
}

if (!urls.length) errors.push("Sitemap has no pages.");
if (new Set(urls).size !== urls.length) errors.push("Sitemap contains duplicate URLs.");
if (!urls.includes(`${site.url}/`)) errors.push("Sitemap is missing the homepage.");

for (const value of urls) {
  try {
    const url = new URL(value);
    if (url.origin !== site.url || url.search || url.hash) throw new Error("Expected a canonical site URL without query or fragment.");
    const filename = decodeURIComponent(url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname);
    const output = path.resolve(dist, `.${filename}`);
    if (!output.startsWith(`${dist}${path.sep}`)) throw new Error("Output path is outside dist.");
    const html = readFileSync(output, "utf8");
    sitemapFiles.add(output);
    const declared = canonicals(html);
    if (declared.length !== 1 || declared[0].href !== value) errors.push(`${value}: expected one matching canonical URL.`);
    if (noindex(html)) errors.push(`${value}: a noindex page is included in the sitemap.`);
  } catch (error) {
    errors.push(`${value}: ${error.message}`);
  }
}

function checkOtherPages(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const output = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      checkOtherPages(output);
    } else if (entry.name.endsWith(".html") && !sitemapFiles.has(output)) {
      const html = readFileSync(output, "utf8");
      const redirect = tags(html, "meta").some((tag) => /^refresh$/i.test(tag["http-equiv"] || ""));
      if (!noindex(html) && !redirect) errors.push(`${path.relative(dist, output)}: an indexable page is missing from the sitemap.`);
    }
  }
}
checkOtherPages(dist);

const missingUrl = `${site.url}/404.html`;
if (urls.includes(missingUrl)) errors.push("The 404 page must not appear in the sitemap.");
const missing = readFileSync(path.join(dist, "404.html"), "utf8");
if (!noindex(missing)) errors.push("The 404 page must declare noindex.");
if (canonicals(missing).length) errors.push("The 404 page must not declare a canonical URL.");
if (tags(missing, "meta").some((tag) => /^refresh$/i.test(tag["http-equiv"] || ""))) errors.push("The 404 page must not redirect visitors.");
if (/\bdata-pagefind-body\b/.test(missing)) errors.push("The 404 page must not enter the site search index.");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Indexability check passed: ${urls.length} sitemap pages have matching canonical URLs and allow indexing; the 404 page stays excluded.`);
}
