import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import Handlebars from "handlebars";
import less from "less";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import handlebarsPlugin from "@11ty/eleventy-plugin-handlebars";
import { rssPlugin } from "@11ty/eleventy-plugin-rss";
import nav from "./src/_data/nav.json" with { type: "json" };
import site from "./src/_data/site.json" with { type: "json" };
import {
  collectionSchema,
  createMarkdownLibrary,
  formatDate,
  hasMarkdownHeading,
  hardenExternalLinks,
  headingsFromHtml,
  isoDate,
  isJournalArticleFilename,
  journalNeighbor,
  navItemForUrl,
  rssDate,
  validateSiteData,
} from "./src/_lib/eleventy-helpers.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const articlePath = /[\\/]src[\\/]journal[\\/][^\\/]+\.md$/i;

function runPagefind(outputDirectory) {
  const runner = path.join(root, "node_modules", "pagefind", "lib", "runner", "bin.cjs");
  const result = spawnSync(process.execPath, [runner, "--site", outputDirectory], { cwd: root, stdio: "inherit" });
  if (result.status === 0) return;
  const message = `[pagefind] Search index generation failed with exit code ${result.status ?? "unknown"}.`;
  console.warn(`${message} The development server will continue.`);
}

export default function (eleventyConfig) {
  eleventyConfig.addFilter("eq", (left, right) => left === right);
  eleventyConfig.addFilter("year", () => new Date().getFullYear());
  eleventyConfig.addFilter("activeClass", (href, current) => href === current ? "is-active" : "");
  eleventyConfig.addFilter("docsActiveClass", (href, current, breadcrumbParent) => href === current || href === breadcrumbParent ? "is-active" : "");
  eleventyConfig.addFilter("navItemForUrl", navItemForUrl);
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("newestFirst", (value) => [...(value || [])].reverse());
  eleventyConfig.addFilter("isoDate", isoDate);
  eleventyConfig.addFilter("formatDate", formatDate);
  eleventyConfig.addFilter("rssDate", rssDate);
  eleventyConfig.addFilter("journalHeadings", headingsFromHtml);
  eleventyConfig.addFilter("journalNeighbor", journalNeighbor);
  eleventyConfig.addFilter("journalCollectionSchema", collectionSchema);
  eleventyConfig.addFilter("absoluteUrl", (url, base) => new URL(url, base).toString());

  const markdown = createMarkdownLibrary();
  eleventyConfig.setLibrary("md", markdown);

  eleventyConfig.addPlugin(handlebarsPlugin, { eleventyLibraryOverride: Handlebars });
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addCollection("publicPages", (collectionApi) => {
    const pages = collectionApi.getFilteredByTag("publicPage");
    validateSiteData(site, nav, pages);
    return pages;
  });
  eleventyConfig.addCollection("publishedJournal", (collectionApi) => collectionApi
    .getFilteredByTag("journal")
    .filter((entry) => !entry.data.draft));

  eleventyConfig.addPreprocessor("journal-policy", "md", function (data, content) {
    if (!articlePath.test(this.inputPath)) return;
    const filename = path.basename(this.inputPath);
    if (!isJournalArticleFilename(filename)) {
      throw new Error(`[journal] Article filenames must use lowercase kebab-case: ${filename}`);
    }
    if (hasMarkdownHeading(markdown, content, 1)) {
      throw new Error(`[journal] Use the front matter title instead of an H1 heading in ${filename}`);
    }
    if (!content.trim()) throw new Error(`[journal] Article body is empty in ${filename}`);
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") return false;
  });

  eleventyConfig.addTemplateFormats("less");
  eleventyConfig.addExtension("less", {
    outputFileExtension: "css",
    useLayouts: false,
    compile: async function (inputContent, inputPath) {
      const rendered = await less.render(inputContent, { filename: path.resolve(inputPath) });
      this.addDependencies(inputPath, rendered.imports);
      const processed = await postcss([autoprefixer]).process(rendered.css, { from: inputPath, map: false });
      return () => processed.css;
    },
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/lib": "assets/lib" });
  eleventyConfig.addPassthroughCopy({ "src/static": "." });
  eleventyConfig.ignores.add("src/journal/README.md");
  eleventyConfig.ignores.add("src/journal/article-template.md");
  eleventyConfig.ignores.add("src/styles/tokens.less");

  eleventyConfig.addTransform("external-link-safety", function (content) {
    return this.page.outputPath?.endsWith(".html") ? hardenExternalLinks(content, site.url) : content;
  });

  eleventyConfig.on("eleventy.after", ({ runMode, results, directories }) => {
    if (runMode !== "serve" || !results.some((result) => result.outputPath?.endsWith(".html"))) return;
    runPagefind(directories.output);
  });

  eleventyConfig.setServerOptions({ port: 3000, watch: ["dist/**/*.js"] });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "dist" },
    markdownTemplateEngine: false,
    htmlTemplateEngine: false,
    templateFormats: ["hbs", "md", "njk", "less"],
  };
}
