import Handlebars from "handlebars";

/** Derive local scenario indexes from the same directory used by the page header. */
export function fieldGuideSections(html, groups) {
  let result = String(html);
  for (const group of groups) {
    const id = group.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const heading = new RegExp(`<h2\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/h2>`, "g");
    if ([...result.matchAll(heading)].length !== 1) {
      throw new Error(`Field-guide group must have exactly one H2: ${group.id}`);
    }
    const links = group.scenarios.map((scenario) => {
      const scenarioId = scenario.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`<h3\\b[^>]*\\bid="${scenarioId}"`).test(result)) {
        throw new Error(`Field-guide scenario is missing its H3: ${scenario.id}`);
      }
      return `<li><a href="#${Handlebars.escapeExpression(scenario.id)}">${Handlebars.escapeExpression(scenario.title)}</a></li>`;
    }).join("");
    const nav = `<nav class="field-guide-section-toc" aria-label="Scenarios: ${Handlebars.escapeExpression(group.title)}" data-pagefind-ignore><ul>${links}</ul></nav>`;
    result = result.replace(heading, (match) => `${match}\n${nav}`);
  }
  return result;
}
