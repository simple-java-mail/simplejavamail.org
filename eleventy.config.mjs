import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import Handlebars from "handlebars";
import less from "less";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import handlebarsPlugin from "@11ty/eleventy-plugin-handlebars";
import nav from "./src/_data/nav.json" with { type: "json" };
import site from "./src/_data/site.json" with { type: "json" };
import { hardenExternalLinks, navItemForUrl, validateSiteData } from "./src/_lib/eleventy-helpers.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

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
  eleventyConfig.addFilter("absoluteUrl", (url, base) => new URL(url, base).toString());

  eleventyConfig.addPlugin(handlebarsPlugin, { eleventyLibraryOverride: Handlebars });
  eleventyConfig.addCollection("publicPages", (collectionApi) => {
    const pages = collectionApi.getFilteredByTag("publicPage");
    validateSiteData(site, nav, pages);
    return pages;
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
    templateFormats: ["hbs", "less"],
  };
}
