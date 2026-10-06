import { createArticleData } from "../_lib/article-data.mjs";
import { z } from "zod";

const journalData = createArticleData({
  kind: "journal",
  collection: "journal",
  label: "Engineering Journal",
  indexUrl: "/engineering-journal.html",
  urlPrefix: "/journal/",
  tocLabel: "In this entry",
});

export default {
  ...journalData,
  eleventyDataSchema(data) {
    journalData.eleventyDataSchema(data);
    z.object({ draft: z.boolean().optional() }).parse(data);
  },
  eleventyComputed: {
    ...journalData.eleventyComputed,
    journalDraft: (data) => data.draft === true,
  },
};
