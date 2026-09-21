import path from "node:path";
import { z } from "zod";
import { formatDate, isoDate, isJournalArticleFilename, journalArticleUrl } from "../_lib/eleventy-helpers.mjs";

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
  draft: z.boolean().optional(),
  "banner-type": z.enum(["note", "info", "tip"]).optional(),
  "banner-header": nonBlankText.optional(),
  "banner-body": nonBlankText.optional(),
  mermaid: z.boolean().optional(),
  series: articleSeries.optional(),
  caseStudy: z.object({
    company: nonBlankText,
    logo: nonBlankText.startsWith("/assets/").optional(),
    label: nonBlankText,
    description: nonBlankText,
    order: z.number().int().positive(),
  }).optional(),
}).refine((data) => {
  const fields = [data["banner-type"], data["banner-header"], data["banner-body"]];
  return fields.every((value) => value === undefined) || fields.every(Boolean);
}, {
  message: "Provide banner-type, banner-header and banner-body together, or omit all three",
  path: ["banner-type"],
});

export default {
  layout: "layouts/journal-entry.hbs",
  tags: ["journal", "publicPage"],
  style: "journal",
  ogType: "article",
  breadcrumbParent: "/engineering-journal.html",
  eleventyDataSchema(data) {
    articleData.parse(data);
    const filename = path.basename(data.page.inputPath);
    if (!isJournalArticleFilename(filename)) {
      throw new Error(`[journal] Article filenames must use lowercase kebab-case: ${filename}`);
    }
  },
  eleventyComputed: {
    permalink: (data) => journalArticleUrl(data.site, data.page.fileSlug),
    author: (data) => data.author || data.site.journal.author,
    summary: (data) => data.description,
    publishedIso: (data) => isoDate(data.date),
    publishedLabel: (data) => formatDate(data.date),
    updatedIso: (data) => isoDate(data.updated),
    updatedLabel: (data) => formatDate(data.updated),
    schema: (data) => {
      const published = isoDate(data.date);
      const updated = isoDate(data.updated);
      const url = new URL(journalArticleUrl(data.site, data.page.fileSlug), data.site.url).toString();
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
        isPartOf: new URL(data.site.journal.indexUrl, data.site.url).toString(),
      };
    },
  },
};
