import { z } from "zod";

const text = z.string().trim().min(1);
const groups = z.array(z.object({
  id: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text,
  scenarios: z.array(z.object({ id: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: text, target: text })).min(1),
})).min(1).superRefine((value, context) => {
  const ids = value.flatMap((group) => [group.id, ...group.scenarios.map((scenario) => scenario.id)]);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "Guide anchors must be unique" });
});

export default {
  layout: "layouts/field-guide.hbs",
  tags: ["fieldGuide", "publicPage"],
  style: "field-guide",
  breadcrumbParent: "/use-cases.html",
  eleventyDataSchema(data) {
    z.object({ title: text, description: text, draft: z.boolean().optional(), guideGroups: groups }).parse(data);
  },
};
