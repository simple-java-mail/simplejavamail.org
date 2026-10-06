import path from "node:path";
import { z } from "zod";
import { journalCommentConfig, validateCommentsUrl } from "./journal-comments.mjs";
import { formatDate, isoDate, isJournalArticleFilename } from "./eleventy-helpers.mjs";
import { articleUrl } from "./article-context.mjs";

const nonBlankText = z.string().trim().min(1);
const dateValue = z.union([z.date(), z.string()]).refine((value) => Boolean(isoDate(value)), "must use a real YYYY-MM-DD date");
const articleSeries = z.object({
  title: nonBlankText,
  part: z.number().int().positive(),
  total: z.number().int().positive().optional(),
}).refine(({ part, total }) => total === undefined || part <= total, {
  message: "part must not be greater than total",
});
const articleData = z.object({
  title: nonBlankText,
  subtitle: nonBlankText.optional(),
  description: nonBlankText,
  category: nonBlankText,
  date: dateValue,
  author: nonBlankText.optional(),
  updated: dateValue.optional(),
  commentsUrl: z.string().url().optional(),
  "banner-type": z.enum(["note", "info", "tip"]).optional(),
  "banner-header": nonBlankText.optional(),
  "banner-body": nonBlankText.optional(),
  mermaid: z.boolean().optional(),
  theme: z.enum(["cyberpunk"]).optional(),
  series: articleSeries.optional(),
  caseStudy: z.object({
    company: nonBlankText,
    logo: nonBlankText.startsWith("/assets/").optional(),
    label: nonBlankText,
    description: nonBlankText,
    order: z.number().int().positive(),
    spotlight: z.object({
      image: nonBlankText.startsWith("/assets/"),
      heading: nonBlankText,
      description: nonBlankText,
    }).optional(),
  }).optional(),
}).refine((data) => {
  const fields = [data["banner-type"], data["banner-header"], data["banner-body"]];
  return fields.every((value) => value === undefined) || fields.every(Boolean);
}, {
  message: "Provide banner-type, banner-header and banner-body together, or omit all three",
  path: ["banner-type"],
});

export function createArticleData(section) {
  return {
    layout: "layouts/article.hbs",
    articleSection: section,
    tags: [section.kind, "publicPage"],
    style: "journal",
    ogType: "article",
    breadcrumbParent: section.indexUrl,
    eleventyDataSchema(data) {
      articleData.parse(data);
      if (section.kind === "caseStudy" && !data.caseStudy) {
        throw new Error("[article] Case-study pages require caseStudy metadata");
      }
      validateCommentsUrl(data.commentsUrl, data.site);
      const filename = path.basename(data.page.inputPath);
      if (!isJournalArticleFilename(filename)) {
        throw new Error(`[article] Article filenames must use lowercase kebab-case: ${filename}`);
      }
    },
    eleventyComputed: {
      commentConfig: (data) => journalCommentConfig(data),
      permalink: (data) => articleUrl(data, section),
      navigationEntries: (data) => data.collections?.[section.collection] || [],
      author: (data) => data.author || data.site.journal.author,
      summary: (data) => data.description,
      publishedIso: (data) => isoDate(data.date),
      publishedLabel: (data) => formatDate(data.date),
      updatedIso: (data) => isoDate(data.updated),
      updatedLabel: (data) => formatDate(data.updated),
      schema: (data) => {
        const published = isoDate(data.date);
        const updated = isoDate(data.updated);
        const url = new URL(articleUrl(data, section), data.site.url).toString();
        return {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: data.title,
          description: data.description,
          datePublished: published,
          dateModified: updated || published,
          author: { "@type": "Person", name: data.author || data.site.journal.author },
          publisher: { "@type": "Organization", name: data.site.name, url: data.site.url },
          mainEntityOfPage: url,
          isPartOf: new URL(section.indexUrl, data.site.url).toString(),
        };
      },
    },
  };
}
