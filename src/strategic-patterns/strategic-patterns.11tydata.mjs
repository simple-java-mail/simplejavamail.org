import { z } from "zod";
import { patternCategorySchema } from "../_lib/patterns.mjs";

const relatedPageSchema = z.object({
  title: z.string().min(1),
  url: z.string().startsWith("/"),
});

export default {
  layout: "layouts/strategic-pattern.hbs",
  tags: ["strategicPattern", "publicPage"],
  patternCategory: "strategic",
  style: "patterns",
  breadcrumbParent: "/strategic-patterns.html",
  eleventyDataSchema(data) {
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      stack: z.string().min(1),
      patternCategory: patternCategorySchema.extract(["strategic"]),
      demoSlug: z.string().regex(/^[a-z]+(?:-[a-z]+)*$/),
      tacticalScenarios: z.array(relatedPageSchema.extend({
        url: z.string().regex(/^\/email-workload-field-guide\.html#[a-z0-9-]+$/),
      })).min(1),
      caseStudy: relatedPageSchema.optional(),
    }).parse(data);
  },
};
