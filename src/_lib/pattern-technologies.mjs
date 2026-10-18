import technologies from "../_data/technologies.json" with { type: "json" };

const technologiesByName = new Map(technologies.flatMap((technology) =>
  [technology.label, ...(technology.aliases || [])].map((name) => [name, technology])));

/** Keep protocol and application concepts readable even when they have no product mark. */
export function patternTechnology(name) {
  return technologiesByName.get(name) || { label: name };
}

/** Alternatives are another way to run an example, not extra services required by its main stack. */
export function patternStack(stack) {
  return (stack || "").split("·").map((part) => part.trim()).filter(Boolean).map((part) => ({
    ...patternTechnology(part.replace(/ variation$/, "")),
    alternative: part.endsWith(" variation"),
  }));
}
