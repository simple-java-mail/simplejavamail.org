import { createTemplateHelpers } from "./src/_lib/template-helpers.mjs";
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
  hardenExternalLinks,
  headingsFromHtml,
  isoDate,
  journalNeighbor,
  navItemForUrl,
  orderJournalEntries,
  rssDate,
  validateSiteData,
} from "./src/_lib/eleventy-helpers.mjs";
import {
  createGoogleCodeCommentLibrary,
  createGoogleCodeProjectLibrary,
  decodeGoogleCodeEntities,
} from "./src/_lib/google-code-archive.mjs";
import { createSourceForgeMarkupLibrary, decodeSourceForgeEntities } from "./src/_lib/sourceforge-archive.mjs";
import { journalCodeExample } from "./src/_lib/journal-code-example.mjs";
import { articleNeighbor, orderCaseStudies } from "./src/_lib/article-context.mjs";
import { fieldGuideSections } from "./src/_lib/field-guide-sections.mjs";
import { groupPatterns, indexPatternTechnologies } from "./src/_lib/patterns.mjs";
import { patternDemonstrations } from "./src/_lib/pattern-demonstrations.mjs";
import { enforceArticlePolicy, enforceJournalPolicy } from "./src/_lib/article-policy.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const articlePath = /[\\/]src[\\/](?:journal|case-studies|guides|strategic-patterns)[\\/][^\\/]+\.md$/i;

function runPagefind(outputDirectory) {
  const runner = path.join(root, "node_modules", "pagefind", "lib", "runner", "bin.cjs");
  const result = spawnSync(process.execPath, [runner, "--site", outputDirectory], { cwd: root, stdio: "inherit" });
  if (result.status === 0) return;
  const message = `[pagefind] Search index generation failed with exit code ${result.status ?? "unknown"}.`;
  console.warn(`${message} The development server will continue.`);
}

export default function (eleventyConfig) {
  const markdown = createMarkdownLibrary();
  eleventyConfig.setLibrary("md", markdown);
  for (const [name, helper] of Object.entries(createTemplateHelpers(markdown))) {
    eleventyConfig.addFilter(name, helper);
  }

  eleventyConfig.addPlugin(handlebarsPlugin, { eleventyLibraryOverride: Handlebars });
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addCollection("publicPages", (collectionApi) => {
    const pages = collectionApi.getFilteredByTag("publicPage");
    validateSiteData(site, nav, pages);
    return pages;
  });
  eleventyConfig.addCollection("publishedJournal", (collectionApi) => orderJournalEntries(collectionApi
    .getFilteredByTag("journal")
    .filter((entry) => !entry.data.draft), true));
  eleventyConfig.addCollection("caseStudies", (collectionApi) => orderCaseStudies(collectionApi
    .getFilteredByTag("caseStudy")));
  eleventyConfig.addCollection("fieldGuides", (collectionApi) => collectionApi.getFilteredByTag("fieldGuide"));
  eleventyConfig.addCollection("patternGroups", (collectionApi) => groupPatterns([
    ...collectionApi.getFilteredByTag("fieldGuide"), ...collectionApi.getFilteredByTag("strategicPattern"),
  ]));
  eleventyConfig.addCollection("patternTechnologies", (collectionApi) => indexPatternTechnologies(collectionApi.getFilteredByTag("strategicPattern")));
  eleventyConfig.addCollection("patternTopics", () => patternDemonstrations);

  eleventyConfig.addPreprocessor("article-policy", "md", function (data, content) {
    if (!articlePath.test(this.inputPath)) return;
    const filename = path.basename(this.inputPath);
    if (/[\\/]src[\\/]journal[\\/]/i.test(this.inputPath)) {
      return enforceJournalPolicy(markdown, content, filename, data.draft, process.env.ELEVENTY_RUN_MODE);
    }
    return enforceArticlePolicy(markdown, content, filename);
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
  eleventyConfig.addPassthroughCopy({ "node_modules/mermaid/dist/mermaid.min.js": "assets/lib/mermaid.min.js" });
  eleventyConfig.addPassthroughCopy({ "src/static": "." });
  eleventyConfig.ignores.add("src/assets/journal/articles/*/examples/README.md");
  eleventyConfig.ignores.add("src/journal/README.md");
  eleventyConfig.ignores.add("src/journal/article-template.md");
  eleventyConfig.ignores.add("src/case-studies/README.md");
  eleventyConfig.ignores.add("src/guides/README.md");
  eleventyConfig.ignores.add("src/assets/guides/*/README.md");
  // Asset provenance is for maintainers; the Patterns directory renders the public credits.
  eleventyConfig.ignores.add("src/assets/technologies/README.md");
  eleventyConfig.ignores.add("src/styles/tokens.less");

  eleventyConfig.addTransform("external-link-safety", function (content) {
    return this.page.outputPath?.endsWith(".html") ? hardenExternalLinks(content, site.url) : content;
  });

  eleventyConfig.on("eleventy.after", ({ runMode, results, directories }) => {
    if (runMode !== "serve" || !results.some((result) => result.outputPath?.endsWith(".html"))) return;
    runPagefind(directories.output);
  });

  eleventyConfig.setServerOptions({
    port: 3000,
    domDiff: false,
    headers: { "Cache-Control": "no-store" },
    watch: ["dist/scripts/**/*.js", "dist/pages/scripts/**/*.js"],
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "dist" },
    markdownTemplateEngine: false,
    htmlTemplateEngine: false,
    templateFormats: ["hbs", "md", "njk", "less"],
  };
}
