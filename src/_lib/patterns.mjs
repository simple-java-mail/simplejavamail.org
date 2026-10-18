import { z } from "zod";
import { patternStack } from "./pattern-technologies.mjs";

export const patternCategorySchema = z.enum(["tactical", "strategic"]);

const categories = [
  { id: "tactical", href: "/email-workload-field-guide.html", label: "Tactical Patterns", description: "Solve a specific mail problem with focused API and configuration choices." },
  { id: "strategic", href: "/strategic-patterns.html", label: "Strategic Patterns", description: "Fit email into an application architecture, with runnable Docker examples." },
];

export function patternCategoryInfo(id) {
  return categories.find((category) => category.id === patternCategorySchema.parse(id));
}

export function groupPatterns(entries) {
  for (const entry of entries) patternCategorySchema.parse(entry.data.patternCategory);
  return categories.map((category) => ({
    ...category,
    entries: entries.filter((entry) => entry.data.patternCategory === category.id)
      .sort((left, right) => (left.data.patternOrder ?? 0) - (right.data.patternOrder ?? 0)),
  }));
}

export function indexPatternTechnologies(entries) {
  const index = new Map();
  for (const entry of entries) {
    for (const technology of patternStack(entry.data.stack)) {
      if (!index.has(technology.label)) index.set(technology.label, { ...technology, alternative: false, patterns: [] });
      index.get(technology.label).patterns.push(entry);
    }
  }
  return [...index].sort(([left], [right]) => left.localeCompare(right))
    .map(([, technology]) => technology);
}
