import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runInNewContext } from "node:vm";
import Handlebars from "handlebars";
import less from "less";
import ts from "typescript";

import journalData from "../src/journal/journal.11tydata.mjs";
import { journalCodeExample } from "../src/_lib/journal-code-example.mjs";
import {
  createMarkdownLibrary,
  enforceJournalTodoPolicy,
  findUnresolvedJournalTodo,
  formatDate,
  hasMarkdownHeading,
  headingsFromHtml,
  journalArticleUrl,
  journalNeighbor,
  navItemForUrl,
  orderJournalEntries,
  rssDate,
  validateSiteData,
} from "../src/_lib/eleventy-helpers.mjs";
import {
  createGoogleCodeCommentLibrary,
  createGoogleCodeProjectLibrary,
  decodeGoogleCodeEntities,
  googleCodeArchiveLink,
  googleCodePseudoIdentity,
  googleCodeTimestamp,
  loadGoogleCodeIssues,
  loadGoogleCodeProjects,
  loadGoogleCodeWikis,
  sanitizeGoogleCodeWikiHtml,
} from "../src/_lib/google-code-archive.mjs";
import {
  loadProjectNibblePosts,
  projectNibbleArchiveLink,
  sanitizeProjectNibbleHtml,
} from "../src/_lib/project-nibble-archive.mjs";
import {
  createSourceForgeMarkupLibrary,
  decodeSourceForgeEntities,
  loadSourceForgeSources,
  sourceForgeArchiveLink,
} from "../src/_lib/sourceforge-archive.mjs";

test("theme bootstrap restores the preference before paint and keeps article skins independent", () => {
  // The blocking bootstrap deliberately uses only plain JavaScript syntax.
  const source = readFileSync(new URL("../src/scripts/theme-init.ts", import.meta.url), "utf8");
  const bootstrap = (saved, cyberpunk = false, blocked = false) => {
    const classes = new Set(cyberpunk ? ["journal-theme-cyberpunk"] : []);
    const root = { dataset: {}, classList: {
      contains: (name) => classes.has(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    } };
    runInNewContext(source, { document: { documentElement: root }, localStorage: {
      getItem: () => { if (blocked) throw new Error("Storage blocked"); return saved; },
    } });
    return { preference: root.dataset.themePreference, dark: classes.has("site-theme-dark") };
  };
  assert.deepEqual(bootstrap(null), { preference: "light", dark: false });
  assert.deepEqual(bootstrap("dark"), { preference: "dark", dark: true });
  assert.deepEqual(bootstrap("light"), { preference: "light", dark: false });
  assert.deepEqual(bootstrap("invalid"), { preference: "light", dark: false });
  assert.deepEqual(bootstrap("dark", false, true), { preference: "light", dark: false });
  assert.deepEqual(bootstrap("light", true), { preference: "light", dark: true });
});

test("dark company-logo treatment targets only the two flat logos and preserves light-mode originals", async () => {
  const stylesheetPath = new URL("../src/styles/theme.less", import.meta.url);
  const { css } = await less.render(readFileSync(stylesheetPath, "utf8"), { filename: fileURLToPath(stylesheetPath) });
  const rules = [...css.matchAll(/([^{}]+)\{\s*filter: brightness\(0\) invert\(0\.9\);\s*\}/g)];
  assert.equal(rules.length, 1);
  const selectors = rules[0][1];
  assert.match(selectors, /\.site-theme-dark img:is\(/);
  assert.match(selectors, /\.journal-theme-cyberpunk img:is\(/);
  assert.match(selectors, /staple-and-sons\.png/);
  assert.match(selectors, /polar-meridian-systems\.png/);
  assert.doesNotMatch(selectors, /relaydesk|\.case-study-logo|\.journal-company-logo/);
});

test("Mermaid console palette is article-scoped and uses matching sequence layout fonts", async () => {
  const source = readFileSync(new URL("../src/scripts/mermaid.ts", import.meta.url), "utf8");
  const script = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const initialize = async (classes) => {
    let configuration;
    let complete;
    const rendered = new Promise((resolve) => { complete = resolve; });
    runInNewContext(script, {
      document: {
        documentElement: { classList: { contains: (name) => classes.includes(name) } },
        querySelector: () => ({}), querySelectorAll: () => [],
        fonts: { ready: Promise.resolve() }, addEventListener: () => {},
      },
      window: { mermaid: {
        initialize: (config) => { configuration = config; },
        run: async () => { complete(); },
      } }, console,
    });
    await rendered;
    return configuration;
  };
  const light = await initialize([]);
  const dark = await initialize(["site-theme-dark"]);
  const cyberpunk = await initialize(["site-theme-dark", "journal-theme-cyberpunk"]);
  assert.equal(light.themeVariables.primaryBorderColor, "#087E8B");
  assert.equal(dark.themeVariables.primaryBorderColor, "#7BCBD6");
  assert.equal(cyberpunk.themeVariables.primaryBorderColor, "#F6CB43");
  assert.equal(cyberpunk.themeVariables.lineColor, "#35D9EF");
  assert.equal(cyberpunk.themeVariables.noteBorderColor, "#BB80E9");
  assert.equal(cyberpunk.fontFamily, cyberpunk.themeVariables.fontFamily);
  assert.equal(String(cyberpunk.fontSize) + "px", cyberpunk.themeVariables.fontSize);
  assert.equal(light.flowchart.curve, "basis");
  assert.equal(dark.flowchart.curve, "basis");
  assert.equal(cyberpunk.flowchart.curve, "stepBefore");
  assert.equal(cyberpunk.securityLevel, "strict");
  assert.equal(cyberpunk.layout, "dagre");
});

test("sequence portraits replace only actor glyphs, retain labels and fall back on image failure", () => {
  const source = readFileSync(new URL("../src/scripts/mermaid.ts", import.meta.url), "utf8");
  const functionSource = source.slice(source.indexOf("function applyActorPortraits"), source.indexOf("if (mermaid &&"));
  const script = ts.transpileModule(functionSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const graphic = (box, attributes = {}) => ({
    getBBox: () => box,
    getAttribute: (name) => attributes[name],
    style: { visibility: "", removeProperty(name) { delete this[name]; } },
  });
  const head = graphic({ x: 45, y: -5, width: 30, height: 30 }, { cx: "60" });
  const body = graphic({ x: 45, y: 25, width: 30, height: 35 });
  const added = [];
  const actor = {
    getAttribute: (name) => name === "name" ? "admin" : null,
    querySelector: () => head,
    querySelectorAll: (selector) => {
      assert.equal(selector, ":scope > circle, :scope > line");
      return [head, body];
    },
    append: (...nodes) => added.push(...nodes),
  };
  const context = {
    document: { createElementNS: (namespace, tag) => {
      assert.equal(namespace, "http://www.w3.org/2000/svg");
      return { tag, attrs: {}, events: {}, removed: false,
        setAttribute(name, value) { this.attrs[name] = value; },
        addEventListener(name, callback) { this.events[name] = callback; },
        remove() { this.removed = true; },
      };
    } },
  };
  runInNewContext(script, context);
  const element = { querySelectorAll: () => [actor] };
  context.applyActorPortraits(element, "%% journal-portrait: admin https://unapproved.example/portrait.jpg");
  context.applyActorPortraits(element, "%% journal-portrait: admin /assets/journal/articles/relaydesk/personas/../secret-portrait.jpg");
  context.applyActorPortraits(element, "%% journal-portrait: other /assets/journal/articles/relaydesk/personas/relay-desk-anika-portrait.jpg");
  assert.equal(added.length, 0);
  context.applyActorPortraits(element, "%% journal-portrait: admin /assets/journal/articles/relaydesk/personas/relay-desk-anika-portrait.jpg");
  assert.equal(added.length, 2);
  const [image, frame] = added;
  assert.equal(image.attrs.href, "/assets/journal/articles/relaydesk/personas/relay-desk-anika-portrait.jpg");
  assert.equal(image.attrs.width, "60");
  assert.equal(image.attrs.height, "60");
  assert.equal(image.attrs.x, "30");
  assert.equal(image.attrs.y, "-2.5");
  assert.equal(frame.attrs.class, "diagram-person-frame");
  assert.equal(head.style.visibility, "hidden");
  assert.equal(body.style.visibility, "hidden");
  image.events.error();
  assert.equal(image.removed, true);
  assert.equal(frame.removed, true);
  assert.equal(head.style.visibility, undefined);
  assert.equal(body.style.visibility, undefined);
});

test("sequence system images preserve proportions, labels and lifelines with a native-box fallback", async () => {
  const source = readFileSync(new URL("../src/scripts/mermaid.ts", import.meta.url), "utf8");
  const functionSource = source.slice(source.indexOf("async function applySequenceNodeImages"), source.indexOf("if (mermaid &&"));
  const script = ts.transpileModule(functionSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const label = { attrs: { y: "50" }, getAttribute(name) { return this.attrs[name] ?? null; },
    setAttribute(name, value) { this.attrs[name] = value; }, removeAttribute(name) { delete this.attrs[name]; } };
  const added = [];
  let headerWidth = 160;
  let artworkWidth = 256;
  let artworkHeight = 171;
  let failDecode = false;
  const box = {
    getAttribute: (name) => name === "name" ? "registry" : null,
    getBBox: () => ({ x: 192, y: 0, width: headerWidth, height: 125 }),
    style: { removeProperty(name) { delete this[name]; } },
    parentElement: { querySelector: () => label, append: (node) => added.push(node) },
  };
  const context = { Image: class {
    get naturalWidth() { return artworkWidth; }
    get naturalHeight() { return artworkHeight; }
    async decode() { if (failDecode) throw new Error("Missing artwork"); }
  }, document: { createElementNS: (namespace, tag) => {
    assert.equal(namespace, "http://www.w3.org/2000/svg");
    return { tag, attrs: {}, events: {}, removed: false,
      setAttribute(name, value) { this.attrs[name] = value; },
      addEventListener(name, callback) { this.events[name] = callback; },
      remove() { this.removed = true; },
    };
  } } };
  runInNewContext(script, context);
  const element = { querySelectorAll: (selector) => {
    assert.equal(selector, "rect.actor"); return [box];
  } };
  for (const path of ["https://unapproved.example/node.png", "/assets/journal/../private-node.png", "/assets/journal/articles/relaydesk/personas/relay-desk-sam-portrait.jpg"]) {
    await context.applySequenceNodeImages(element, `%% journal-node: registry ${path}`);
  }
  await context.applySequenceNodeImages(element, "%% journal-node: other /assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-route-manager-node.png");
  assert.equal(added.length, 0);
  await context.applySequenceNodeImages(element, "%% journal-node: registry /assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-route-manager-node.png");
  assert.equal(added.length, 1);
  const [image] = added;
  assert.equal(image.attrs.href, "/assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-route-manager-node.png");
  const workerWidth = 85 * 256 / 171;
  assert.ok(Math.abs(Number(image.attrs.x) - (192 + (160 - workerWidth) / 2)) < 0.001);
  assert.equal(image.attrs.y, "4");
  assert.ok(Math.abs(Number(image.attrs.width) - workerWidth) < 0.001);
  assert.equal(image.attrs.height, "85");
  assert.equal(image.attrs.preserveAspectRatio, "xMidYMid meet");
  assert.equal(label.attrs.y, "109");
  assert.equal(box.style.visibility, "hidden");
  image.events.error();
  assert.equal(image.removed, true);
  assert.equal(box.style.visibility, undefined);
  assert.equal(label.attrs.y, "50");
  // The route-manager icon is also wider than tall; both fit at full height.
  artworkHeight = 220;
  await context.applySequenceNodeImages(element, "%% journal-node: registry /assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-route-manager-node.png");
  assert.equal(added.at(-1).attrs.height, "85");
  assert.ok(Math.abs(Number(added.at(-1).attrs.width) - 85 * 256 / 220) < 0.001);
  added.at(-1).events.error();
  // Portrait-shaped artwork retains its height; narrow headers reduce both axes.
  artworkWidth = 245;
  artworkHeight = 256;
  await context.applySequenceNodeImages(element, "%% journal-node: registry /assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-juniper-smtp-node.png");
  assert.equal(added.at(-1).attrs.height, "85");
  assert.equal(Number(added.at(-1).attrs.width), 85 * 245 / 256);
  added.at(-1).events.error();
  headerWidth = 60;
  await context.applySequenceNodeImages(element, "%% journal-node: registry /assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-juniper-smtp-node.png");
  assert.equal(Number(added.at(-1).attrs.width), 60);
  assert.ok(Math.abs(Number(added.at(-1).attrs.height) - 60 * 256 / 245) < 0.001);
  added.at(-1).events.error();
  const count = added.length;
  failDecode = true;
  await context.applySequenceNodeImages(element, "%% journal-node: registry /assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-route-manager-node.png");
  assert.equal(added.length, count);
  assert.equal(box.style.visibility, undefined);
  assert.equal(label.attrs.y, "50");
});

test("Journal paste targets keep assets with their article rather than in shared buckets", () => {
  const articles = [
    ["2026-08-29-simple-java-mails-origin-story.md", "origin-story"],
    ["2026-09-01-twenty-years-of-simple-java-mail.md", "twenty-years-of-simple-java-mail"],
    ["2026-09-02-the-libraries-behind-simple-java-mail.md", "the-libraries-behind-simple-java-mail"],
    ["2026-09-03-the-library-i-keep-coming-back-to.md", "the-library-i-keep-coming-back-to"],
    ["2026-09-08-set-phasers-to-synchronize.md", "set-phasers-to-synchronize"],
    ["2026-09-09-what-simple-java-mail-10-is-for.md", "what-simple-java-mail-10-is-for"],
    ["2026-09-10-mail-at-polar-meridian-systems.md", "polar-meridian"],
    ["2026-09-11-when-one-email-becomes-a-million.md", "when-one-email-becomes-a-million"],
    ["2026-09-11-your-mail-server-works-for-a-troll-farm-now.md", "staple-and-sons"],
    ["2026-09-12-everybody-brought-their-own-mail-server.md", "relaydesk"],
  ];
  for (const [filename, slug] of articles) {
    const article = readFileSync(new URL(`../src/journal/${filename}`, import.meta.url), "utf8");
    assert.ok(article.includes(`typora-copy-images-to: ../assets/journal/articles/${slug}`), filename);
    assert.ok(article.includes("typora-root-url: .."), filename);
    assert.doesNotMatch(article, /\/assets\/journal\/(?:personas|companies|examples)\//u);
  }
});

test("RelayDesk diagrams use local portraits and system icons while the infographic source stays editable", () => {
  const article = readFileSync(new URL("../src/journal/2026-09-12-everybody-brought-their-own-mail-server.md", import.meta.url), "utf8");
  for (const person of ["maya", "sam", "anika"]) {
    const filename = `relay-desk-${person}-portrait.jpg`;
    assert.ok(article.includes(`src='/assets/journal/articles/relaydesk/personas/${filename}'`));
    assert.ok(readFileSync(new URL(`../src/assets/journal/articles/relaydesk/personas/${filename}`, import.meta.url)).length > 0);
  }
  assert.ok(article.includes("actor admin as Anika"));
  assert.ok(article.includes('store@{ img: "/assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-database-node.png", label: "Saved replies<br/>+ send attempts", h: 85, pos: "b", constraint: "on" }'));
  assert.ok(article.includes('store@{ img: "/assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-database-node.png", label: "Saved replies<br/>&nbsp;", h: 85, pos: "b", constraint: "on" }'));
  const imageNodes = [...article.matchAll(/\w+@\{ img: "\/assets\/journal\/articles\/relaydesk\/nodes\/relaydesk-cyberpunk-[^\n]+/g)];
  assert.equal(imageNodes.length, 11);
  assert.ok(imageNodes.every(([node]) =>
    node.includes(`h: ${/^(workers|dispatcher)@/.test(node) ? 150 : 85}, pos: "b", constraint: "on"`)),
  "Both views emphasize the dispatch workers without enlarging the surrounding nodes");
  assert.ok(readFileSync(new URL("../src/assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-database-node.png", import.meta.url)).length > 0);
  for (const node of ["support-conversations", "dispatch-workers", "kestrel-smtp", "kestrel-smtp-eu", "kestrel-smtp-us", "juniper-smtp", "default-smtp", "route-manager"]) {
    const filename = `relaydesk-cyberpunk-${node}-node.png`;
    assert.ok(article.includes(`/assets/journal/articles/relaydesk/nodes/${filename}`));
    assert.ok(readFileSync(new URL(`../src/assets/journal/articles/relaydesk/nodes/${filename}`, import.meta.url)).length > 0);
  }
  assert.ok(article.includes('kestrel@{ img: "/assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-kestrel-smtp-node.png", label: "Kestrel Outfitters<br/>EU relay pair · US relay pair<br/>separate regional groups"'));
  assert.ok(article.includes('kestrel@{ img: "/assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-kestrel-smtp-eu-node.png", label: "Kestrel EU · route paused<br/>keep jobs in storage"'));
  assert.ok(article.includes('kestrelUs@{ img: "/assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-kestrel-smtp-us-node.png", label: "Kestrel US · ready<br/>submit through its Mailers"'));
  assert.ok(article.includes("%% journal-image-branch: dispatchKestrelUs dispatcher kestrelUs"));
  assert.ok(article.includes("%% journal-image-branch: dispatchKestrel dispatcher kestrel center"));
  assert.ok(article.includes("class kestrelUs,juniper ready"));
  const workersImage = article.match(/workers@\{ img: "([^"]+)"/)[1];
  const dispatcherImage = article.match(/dispatcher@\{ img: "([^"]+)"/)[1];
  assert.equal(dispatcherImage, workersImage, "The scheduling view reuses the setup's dispatch-worker image");
  assert.ok(article.includes("%% journal-node: registry /assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-route-manager-node.png"));
  assert.ok(article.includes("%% journal-node: workers /assets/journal/articles/relaydesk/nodes/relaydesk-cyberpunk-dispatch-workers-node.png"));
  assert.ok(article.includes("linkStyle 1,3 stroke:#A4E7B1"));
  assert.ok(article.includes("linkStyle 2 stroke:#EBA680"));
  assert.ok(article.includes("%% journal-portrait: admin /assets/journal/articles/relaydesk/personas/relay-desk-anika-portrait.jpg"));
  assert.ok(article.includes('"curve": "stepAfter"'));
  assert.ok(article.includes('<template id="relaydesk-support-network-source"'));
});

test("RelayDesk flowchart uses hexagonal portrait badges without enclosing cards or changing the sequence actor", () => {
  const article = readFileSync(new URL("../src/journal/2026-09-12-everybody-brought-their-own-mail-server.md", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/styles/journal.less", import.meta.url), "utf8");
  for (const [id, name] of [["agents", "Maya"], ["sam", "Sam"], ["anika", "Anika"]]) {
    assert.ok(article.includes(`${id}@{ shape: rect, label:`));
    assert.ok(article.includes(`<strong>${name}</strong><span>`));
    assert.ok(!article.includes(`${id}(["<span class='diagram-person'`));
  }
  assert.equal((article.match(/diagram-person diagram-person-hex/g) ?? []).length, 3);
  assert.equal((article.match(/class='diagram-person-portrait'/g) ?? []).length, 3);
  assert.ok(!article.includes("diagram-person-hud"));
  assert.ok(article.includes("classDef person fill:none,stroke:none,color:#BECBD0"));
  assert.ok(article.includes("actor admin as Anika"));
  assert.ok(article.includes("sam samMaintenance@-.->|handles this update gig| workers"));
  assert.ok(article.includes("kestrel kestrelAdmin@-.->|administered by| anika"));
  assert.ok(article.includes("%% journal-portrait-link: samMaintenance sam source left"));
  assert.ok(article.includes("%% journal-portrait-link: kestrelAdmin anika target top"));
  for (const edge of ["agentsToPortal", "samMaintenance", "kestrelAdmin"]) {
    assert.ok(article.includes(`${edge}@{ curve: basis }`));
  }
  const cyberpunkStyles = styles.slice(styles.indexOf(".journal-theme-cyberpunk {"));
  assert.ok(cyberpunkStyles.includes(".diagram-person-hex"));
  assert.ok(cyberpunkStyles.includes(".diagram-person-copy strong"));
  assert.match(cyberpunkStyles, /\.diagram-person-portrait \{[^}]*background: #638E98;[^}]*clip-path: polygon\(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%\);/);
  assert.match(cyberpunkStyles, /\.diagram-person-portrait img \{[^}]*width: 58px !important;[^}]*height: 66px;[^}]*border: 0;[^}]*clip-path: polygon/);
  assert.match(cyberpunkStyles, /\.diagram-person-copy strong \{[^}]*color: #9DC3CD;/);
  assert.match(cyberpunkStyles, /\.diagram-person-copy > span \{\s*color: #BECBD0;/);
  assert.ok(cyberpunkStyles.includes(".diagram-person-hex .diagram-person-portrait {"));
  assert.ok(!cyberpunkStyles.includes("pre.mermaid .diagram-person-portrait {"));
});

test("portrait links anchor to badge edges, preserve arrowheads and move their labels with the curve", () => {
  const source = readFileSync(new URL("../src/scripts/mermaid.ts", import.meta.url), "utf8");
  const functions = source.slice(source.indexOf("type DiagramPoint"), source.indexOf("if (mermaid &&"));
  const script = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const label = {
    classList: { contains: (name) => name === "edgeLabel" },
    attrs: {}, setAttribute(name, value) { this.attrs[name] = value; },
  };
  const edge = {
    attrs: { "marker-end": "url(#arrowhead)" },
    getScreenCTM: () => ({ inverse: () => ({ scale: 2, x: 10, y: 20 }) }),
    getTotalLength: () => 200,
    getPointAtLength: (length) => ({ x: 300 - length, y: 300 + length }),
    setAttribute(name, value) { this.attrs[name] = value; },
  };
  const portrait = { getBoundingClientRect: () => ({ left: 100, top: 200, width: 64, height: 72 }) };
  const node = {
    id: "mermaid-123-flowchart-sam-4",
    querySelector: (selector) => selector === ".diagram-person-hex .diagram-person-portrait" ? portrait : null,
  };
  const element = {
    querySelectorAll: (selector) => selector === "g.node" ? [node] : [],
    querySelector: (selector) => {
      if (selector === 'path.flowchart-link[data-id="samMaintenance"]') return edge;
      if (selector === 'g.label[data-id="samMaintenance"]') return { parentElement: label };
      return null;
    },
  };
  const context = { DOMPoint: class {
    constructor(x, y) { this.x = x; this.y = y; }
    matrixTransform(matrix) { return { x: this.x * matrix.scale + matrix.x, y: this.y * matrix.scale + matrix.y }; }
  } };
  runInNewContext(script, context);
  context.applyPortraitLinks(element, "%% journal-portrait-link: samMaintenance sam source left");
  assert.ok(edge.attrs.d.startsWith("M210,492C"));
  assert.ok(edge.attrs.d.endsWith("100,500"));
  assert.equal(edge.attrs["marker-end"], "url(#arrowhead)");
  assert.equal(label.attrs.transform, "translate(200, 400)");

  context.applyPortraitLinks(element, "%% journal-portrait-link: samMaintenance sam target top");
  assert.ok(edge.attrs.d.startsWith("M300,300C"));
  assert.ok(edge.attrs.d.endsWith("274,416")); // Top anchor minus the four-unit arrowhead.
  const unchanged = edge.attrs.d;
  context.applyPortraitLinks(element, "%% journal-portrait-link: absent sam source left");
  context.applyPortraitLinks(element, "%% journal-portrait-link: samMaintenance unknown source left");
  context.applyPortraitLinks(element, "%% journal-portrait-link: samMaintenance sam source invalid");
  assert.equal(edge.attrs.d, unchanged);
  portrait.getBoundingClientRect = () => ({ left: 100, top: 200, width: 0, height: 0 });
  context.applyPortraitLinks(element, "%% journal-portrait-link: samMaintenance sam source left");
  assert.equal(edge.attrs.d, unchanged);
});

test("portrait Bézier curves leave and approach their anchors in the chosen directions", () => {
  const source = readFileSync(new URL("../src/scripts/mermaid.ts", import.meta.url), "utf8");
  const functions = source.slice(source.indexOf("type DiagramPoint"), source.indexOf("if (mermaid &&"));
  const context = {};
  runInNewContext(ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  assert.equal(context.portraitLinkPath({ x: 200, y: 100 }, { x: 0, y: 200 }, { x: -1, y: 0 }, { x: 0, y: -1 }),
    "M200,100C99.37694101250946,100 0,99.37694101250946 0,200");
  assert.equal(context.portraitLinkPath({ x: 0, y: 0 }, { x: 0, y: 1000 }, { x: 0, y: 1 }, { x: 0, y: -1 }),
    "M0,0C0,120 0,880 0,1000");
});

test("image branches leave the artwork, keep angular elbows out of captions and preserve arrow styles", () => {
  const article = readFileSync(new URL("../src/journal/2026-09-12-everybody-brought-their-own-mail-server.md", import.meta.url), "utf8");
  assert.ok(article.includes("%% journal-image-branch: dispatchKestrel dispatcher kestrel"));
  assert.ok(article.includes("%% journal-image-branch: dispatchJuniper dispatcher juniper"));
  assert.ok(article.includes("dispatcher dispatchKestrel@---> kestrel"));
  assert.ok(article.includes("dispatcher dispatchJuniper@---> juniper"));
  assert.ok(article.includes("%% journal-image-branch: savedReplies store dispatcher center"));
  assert.ok(article.includes("store savedReplies@--> dispatcher"));
  assert.ok(article.includes("%% journal-image-inlet: storedJobs workers"));
  assert.ok(article.includes("store storedJobs@--> workers"));
  const source = readFileSync(new URL("../src/scripts/mermaid.ts", import.meta.url), "utf8");
  const functions = source.slice(source.indexOf("function applyImageBranchLinks"), source.indexOf("if (mermaid &&"));
  const images = {
    dispatcher: { getBoundingClientRect: () => ({ right: 100, top: 100, width: 80, height: 100 }) },
    kestrel: { getBoundingClientRect: () => ({ left: 300, top: 0, width: 80, height: 100 }) },
    juniper: { getBoundingClientRect: () => ({ left: 300, top: 200, width: 80, height: 100 }) },
  };
  const edge = { attrs: { stroke: "green", "marker-end": "url(#arrow)" },
    getScreenCTM: () => ({ inverse: () => ({ scale: 2 }) }),
    getTotalLength: () => 200,
    getPointAtLength: () => ({ x: 200, y: 260 }),
    setAttribute(name, value) { this.attrs[name] = value; },
  };
  const element = {
    querySelectorAll: (selector) => selector === 'g.image-shape'
      ? Object.entries(images).map(([id, image]) => ({ id: `mermaid-123-flowchart-${id}-0`, querySelector: () => image }))
      : [],
    querySelector: (selector) => selector === 'path.flowchart-link[data-id="branch"]' ? edge : null,
  };
  const context = { DOMPoint: class {
    constructor(x, y) { this.x = x; this.y = y; }
    matrixTransform(matrix) { return { x: this.x * matrix.scale, y: this.y * matrix.scale }; }
  } };
  runInNewContext(ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  context.applyImageBranchLinks(element, "%% journal-image-branch: branch dispatcher kestrel");
  assert.equal(edge.attrs.d, "M200,260L398,260L398,100L596,100");
  context.applyImageBranchLinks(element, "%% journal-image-branch: branch dispatcher juniper");
  assert.equal(edge.attrs.d, "M200,340L398,340L398,500L596,500");
  context.applyImageBranchLinks(element, "%% journal-image-branch: branch dispatcher juniper center");
  assert.equal(edge.attrs.d, "M200,300L398,300L398,500L596,500");
  assert.equal(edge.attrs.stroke, "green");
  assert.equal(edge.attrs["marker-end"], "url(#arrow)");
  const unchanged = edge.attrs.d;
  context.applyImageBranchLinks(element, "%% journal-image-branch: missing dispatcher juniper");
  context.applyImageBranchLinks(element, "%% journal-image-branch: branch absent juniper");
  images.juniper.getBoundingClientRect = () => ({ left: 50, top: 200, width: 80, height: 100 });
  context.applyImageBranchLinks(element, "%% journal-image-branch: branch dispatcher juniper");
  assert.equal(edge.attrs.d, unchanged);
  images.juniper.getBoundingClientRect = () => ({ left: 300, top: 200, width: 80, height: 100 });
  context.applyImageBranchLinks(element, "%% journal-image-inlet: branch juniper");
  assert.equal(edge.attrs.d, "M200,260L200,500L596,500");
  assert.equal(edge.attrs.stroke, "green");
  assert.equal(edge.attrs["marker-end"], "url(#arrow)");
  const inletPath = edge.attrs.d;
  context.applyImageBranchLinks(element, "%% journal-image-inlet: missing juniper");
  context.applyImageBranchLinks(element, "%% journal-image-inlet: branch absent");
  images.juniper.getBoundingClientRect = () => ({ left: 50, top: 200, width: 80, height: 100 });
  context.applyImageBranchLinks(element, "%% journal-image-inlet: branch juniper");
  images.juniper.getBoundingClientRect = () => ({ left: 300, top: 200, width: 0, height: 100 });
  context.applyImageBranchLinks(element, "%% journal-image-inlet: branch juniper");
  assert.equal(edge.attrs.d, inletPath);
});

test("copy controls stay on the frame while the code remains the unmodified copy source", async () => {
  const site = readFileSync(new URL("../src/scripts/site.ts", import.meta.url), "utf8");
  const source = site.slice(site.indexOf("const copyLabel ="), site.indexOf("const route ="));
  const script = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const original = "// a long line\nSystem.out.println(\"<value>\");\n";
  const code = { textContent: original };
  const classes = new Set();
  let button;
  let click;
  let clipboard;
  const pre = {
    querySelector: () => code, closest: () => null,
    classList: { add: (name) => classes.add(name) },
    append: (element) => { button = element; },
  };
  const skipped = { querySelector: () => code, closest: () => ({}) };
  runInNewContext(script, {
    document: {
      querySelectorAll: () => [pre, skipped],
      createElement: () => ({ setAttribute: () => {}, addEventListener: (_, handler) => { click = handler; } }),
    },
    navigator: { clipboard: { writeText: async (text) => { clipboard = text; } } },
    window: { setTimeout: () => {} },
  });
  assert.ok(classes.has("code-copy-enabled"));
  assert.equal(button.className, "copy-code");
  assert.equal(button.type, "button");
  await click();
  assert.equal(clipboard, original);
  assert.equal(code.textContent, original);
  assert.equal(button.textContent, "Copied");
});

test("expandable Java code omits imports from its body and preview without changing the download", () => {
  const source = readFileSync(new URL("../src/assets/journal/articles/polar-meridian/examples/PolarMeridianDispatcher.java", import.meta.url), "utf8");
  const example = journalCodeExample("polar-meridian/examples/PolarMeridianDispatcher.java");
  assert.equal(example.source, source.slice(source.indexOf("/**")));
  assert.doesNotMatch(example.source, /^import /mu);
  assert.deepEqual(example.previewLines, example.source.split(/\r?\n/u).slice(0, 6));
  assert.equal(readFileSync(new URL("../src/assets/journal/articles/polar-meridian/examples/PolarMeridianDispatcher.java", import.meta.url), "utf8"), source);
  assert.equal(example.language, "java");
  assert.throws(() => journalCodeExample("../../../_data/site.json"), /must stay inside/);
  assert.throws(() => journalCodeExample("polar-meridian/personas/polar-meridian-ravi.jpg"), /must stay inside/);
  assert.throws(() => journalCodeExample("polar-meridian/examples/../personas/polar-meridian-ravi.jpg"), /must stay inside/);
  assert.throws(() => journalCodeExample(import.meta.filename), /must use a path relative/);
});

test("Handlebars source disclosure survives Markdown rendering without rewriting the Java", () => {
  const handlebars = Handlebars.create();
  handlebars.registerHelper("journalCodeExample", journalCodeExample);
  handlebars.registerPartial("components/journal-code-disclosure", readFileSync(
    new URL("../src/_includes/components/journal-code-disclosure.hbs", import.meta.url), "utf8"));
  const article = readFileSync(new URL("../src/journal/2026-09-10-mail-at-polar-meridian-systems.md", import.meta.url), "utf8");
  const body = article.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, "");
  const html = createMarkdownLibrary().render(handlebars.compile(body)({}));
  // Markdown normalizes line endings, including escaped source inside raw HTML.
  const source = journalCodeExample("polar-meridian/examples/PolarMeridianDispatcher.java").source.replace(/\r\n/gu, "\n");
  assert.match(html, /<details class="journal-code-disclosure" data-pagefind-ignore>/);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  assert.ok(html.includes(`<pre><code class="language-java">${Handlebars.escapeExpression(source)}</code></pre>`));
  assert.ok(html.includes("Expand Dispatcher"));
  assert.ok(html.includes("Collapse Dispatcher"));
  assert.doesNotMatch(html, /\{\{> components\/journal-code-disclosure/);
});

test("source disclosures escape both the example and its preview", () => {
  const render = Handlebars.compile(readFileSync(
    new URL("../src/_includes/components/journal-code-disclosure.hbs", import.meta.url), "utf8"));
  const source = '</code><script>alert("example")</script>';
  const html = render({ source, previewLines: [source], title: "<Dispatcher>", language: "java" });
  assert.doesNotMatch(html, /<script>|<Dispatcher>/);
  assert.equal(html.split(Handlebars.escapeExpression(source)).length - 1, 2);
  assert.match(html, /aria-hidden="true"/);
});

test("journal series allow an unknown total but validate a declared total", () => {
  const data = {
    title: "An article", description: "A description", category: "Library design", date: "2026-09-08",
    page: { inputPath: "src/journal/2026-09-08-an-article.md" },
  };
  const validate = (series) => journalData.eleventyDataSchema({ ...data, series });
  assert.doesNotThrow(() => validate({ title: "A series", part: 1 }));
  assert.doesNotThrow(() => validate({ title: "A series", part: 3, total: 3 }));
  assert.throws(() => validate({ title: "A series", part: 4, total: 3 }));
  assert.throws(() => validate({ title: "A series", part: 0 }));
  assert.throws(() => validate({ title: "A series", part: 1, total: 0 }));
});

test("case studies require a company, label, index description and positive display order", () => {
  const data = {
    title: "An article", description: "A description", category: "System design", date: "2026-09-11",
    page: { inputPath: "src/journal/2026-09-11-an-article.md" },
  };
  const caseStudy = { company: "Staple & Sons", label: "Self-managed SMTP", description: "A company profile", order: 1 };
  const validate = (value) => journalData.eleventyDataSchema({ ...data, caseStudy: value });
  assert.doesNotThrow(() => validate(undefined));
  assert.doesNotThrow(() => validate(caseStudy));
  assert.doesNotThrow(() => validate({ ...caseStudy, logo: "/assets/journal/company-logos/staple-and-sons.png" }));
  assert.throws(() => validate({ ...caseStudy, logo: " " }));
  assert.throws(() => validate({ ...caseStudy, logo: "https://example.com/logo.png" }));
  assert.throws(() => validate({ ...caseStudy, company: " " }));
  assert.throws(() => validate({ ...caseStudy, label: " " }));
  assert.throws(() => validate({ ...caseStudy, label: undefined }));
  assert.throws(() => validate({ ...caseStudy, description: "" }));
  assert.throws(() => validate({ ...caseStudy, order: 0 }));
  assert.throws(() => validate({ ...caseStudy, order: 1.5 }));
  assert.throws(() => validate(true));
  const spotlight = { image: "/assets/journal/articles/relaydesk/personas/relay-desk-sam.jpg", heading: "A repair gig", description: "Customer SMTP integration" };
  assert.doesNotThrow(() => validate({ ...caseStudy, spotlight }));
  assert.throws(() => validate({ ...caseStudy, spotlight: { ...spotlight, image: "https://example.com/sam.jpg" } }));
  for (const field of Object.keys(spotlight)) {
    assert.throws(() => validate({ ...caseStudy, spotlight: { ...spotlight, [field]: " " } }));
    assert.throws(() => validate({ ...caseStudy, spotlight: { ...spotlight, [field]: undefined } }));
  }
});

test("case-study spotlights reuse their article metadata on the index and homepage", () => {
  const handlebars = Handlebars.create();
  handlebars.registerHelper("url", () => { throw new Error("A URL field must not invoke Eleventy's url helper"); });
  handlebars.registerHelper("eq", (left, right) => left === right);
  handlebars.registerPartial("components/case-study-spotlight", readFileSync(new URL("../src/_includes/components/case-study-spotlight.hbs", import.meta.url), "utf8"));
  handlebars.registerPartial("components/module-badges", "");
  const ordinary = (company, order) => ({ url: `/journal/company-${order}.html`, data: { title: `Case study: ${company}`, caseStudy: { company, order, label: "SMTP integration", description: "An ordinary case study" } } });
  const featured = ordinary("RelayDesk", 3);
  featured.data.caseStudy.spotlight = { image: "/assets/journal/articles/relaydesk/personas/relay-desk-sam.jpg", heading: "Sam's <repair> gig", description: "Customer-owned mail servers" };
  const renderPage = (name, entries) => {
    const source = readFileSync(new URL(`../src/pages/${name}.hbs`, import.meta.url), "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, "");
    return handlebars.compile(source)({ collections: { caseStudies: entries }, site: { journal: { indexUrl: "/engineering-journal.html" } } });
  };
  const entries = [ordinary("Staple & Sons", 1), ordinary("Polar Meridian", 2), featured];
  const index = renderPage("case-studies", entries);
  assert.equal((index.match(/class="case-study-card"/g) || []).length, 2);
  assert.equal((index.match(/class="case-study-spotlight"/g) || []).length, 1);
  assert.match(index, /aria-labelledby="case-study-relaydesk-3-heading"/);
  assert.match(index, /id="case-study-relaydesk-3-heading">Sam&#x27;s &lt;repair&gt; gig/);
  assert.match(index, /Cyberpunk case study/);
  assert.match(index, /class="case-study-spotlight-logo">RelayDesk<\/span>/);
  assert.match(index, /src="\/assets\/journal\/articles\/relaydesk\/personas\/relay-desk-sam.jpg" alt=""[^>]+loading="lazy"/);
  const home = renderPage("index", entries);
  assert.equal((home.match(/class="case-study-spotlight"/g) || []).length, 1);
  assert.match(home, /aria-labelledby="home-relaydesk-3-heading"/);
  assert.match(home, /href="\/journal\/company-3.html"/);
  assert.doesNotMatch(renderPage("index", entries.slice(0, 2)), /home-case-study|case-study-spotlight/);
});

test("journal banners are optional but require a supported type, header and body together", () => {
  const data = {
    title: "An article", description: "A description", category: "Library design", date: "2026-09-11",
    page: { inputPath: "src/journal/2026-09-11-an-article.md" },
  };
  const banner = { "banner-type": "note", "banner-header": "AI-Assisted", "banner-body": "Reviewed by the author." };
  const validate = (value) => journalData.eleventyDataSchema({ ...data, ...value });
  assert.doesNotThrow(() => validate({}));
  for (const type of ["note", "info", "tip"]) {
    assert.doesNotThrow(() => validate({ ...banner, "banner-type": type }));
  }
  for (const type of ["warning", "NOTE", "", null]) {
    assert.throws(() => validate({ ...banner, "banner-type": type }));
  }
  for (const field of Object.keys(banner)) {
    assert.throws(() => validate({ ...banner, [field]: undefined }), /Provide banner-type, banner-header and banner-body together/);
    assert.throws(() => validate({ ...banner, [field]: " " }));
  }
});

test("journal banner templates preserve custom wording, escape text and have no default disclosure", () => {
  const template = readFileSync(new URL("../src/_includes/components/journal-banner.hbs", import.meta.url), "utf8");
  const render = Handlebars.compile(template);
  assert.equal(render({}).trim(), "");
  for (const type of ["note", "info", "tip"]) {
    const html = render({ "banner-type": type, "banner-header": "Before you begin", "banner-body": "Use the staging server." });
    assert.match(html, new RegExp(`class="journal-banner journal-banner--${type}"`));
    assert.match(html, /aria-label="Before you begin"/);
    assert.match(html, /<strong class="journal-banner-header">Before you begin<\/strong>/);
    assert.match(html, /<p>Use the staging server\.<\/p>/);
    assert.doesNotMatch(html, /AI-assisted|Written without AI/i);
  }
  const html = render({ "banner-type": "info", "banner-header": "<Info> & \"details\"", "banner-body": "<script>alert(1)</script>" });
  assert.match(html, /&lt;Info&gt; &amp; &quot;details&quot;/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("journal navigation sits before and after the content inside the article", () => {
  const template = readFileSync(new URL("../src/_includes/layouts/journal-entry.hbs", import.meta.url), "utf8");
  const handlebars = Handlebars.create();
  for (const partial of ["head", "site-header", "components/journal-banner", "components/journal-comments", "components/archived-source-dialog", "components/journal-image-dialog", "footer"]) {
    handlebars.registerPartial(partial, "");
  }
  handlebars.registerPartial("components/journal-entry-navigation", '<nav class="{{className}}" aria-label="{{label}}"></nav>');
  handlebars.registerHelper("journalHeadings", () => []);
  handlebars.registerHelper("eq", (left, right) => left === right);
  const render = handlebars.compile(template);
  const html = render({ content: "<p>Article text.</p>" });
  assert.doesNotMatch(html, /journal-theme-cyberpunk/);
  assert.match(render({ theme: "cyberpunk" }), /<html[^>]*class="[^"]*journal-theme-cyberpunk/);
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)?.[1];
  assert.ok(article, "The layout should render an article element");
  assert.match(article, /journal-entry-navigation--top[\s\S]*<p>Article text\.<\/p>[\s\S]*journal-entry-navigation--bottom/);
  assert.equal((html.match(/<nav\b/g) ?? []).length, 2);
  assert.equal((article.match(/<nav\b/g) ?? []).length, 2);
  assert.doesNotMatch(article, /class="[^"]*\bshell\b/);
});

test("Markdown heading policy recognizes headings rather than code", () => {
  const markdown = createMarkdownLibrary();
  assert.equal(hasMarkdownHeading(markdown, "# ATX title", 1), true);
  assert.equal(hasMarkdownHeading(markdown, "Setext title\n============", 1), true);
  assert.equal(hasMarkdownHeading(markdown, "```shell\n# a shell comment\n```", 1), false);
});

test("journal TODO policy recognizes HTML comments rather than examples", () => {
  const markdown = createMarkdownLibrary();
  assert.deepEqual(
    findUnresolvedJournalTodo(markdown, "Opening paragraph.\n\n<!-- TODO: verify the date -->\n\nContinue."),
    { line: 3 },
  );
  assert.deepEqual(
    findUnresolvedJournalTodo(markdown, "First line\nsecond line <!-- TODO(publication): add the source -->"),
    { line: 2 },
  );
  assert.equal(findUnresolvedJournalTodo(markdown, "<!-- A normal explanatory comment -->"), null);
  assert.equal(findUnresolvedJournalTodo(markdown, "`<!-- TODO: inline example -->`"), null);
  assert.equal(findUnresolvedJournalTodo(markdown, "```markdown\n<!-- TODO: fenced example -->\n```"), null);

  const unresolved = "Opening paragraph.\n\n<!-- TODO: verify the date -->";
  assert.doesNotThrow(() => enforceJournalTodoPolicy(markdown, unresolved, "draft-entry.md", true));
  assert.throws(
    () => enforceJournalTodoPolicy(markdown, unresolved, "published-entry.md", false),
    /Resolve TODO marker in published-entry\.md:3 before publishing/,
  );
});

test("journal headings receive descriptive permalinks at every supported depth", () => {
  const markdown = createMarkdownLibrary();
  const html = markdown.render("## Hello *world*\n\n#### Deep heading\n\n###### Last heading");
  assert.match(html, /<h2 id="hello-world"><a class="journal-heading-anchor" href="#hello-world" aria-label="Link to Hello world">#<\/a>/);
  assert.match(html, /<h4 id="deep-heading"><a class="journal-heading-anchor" href="#deep-heading" aria-label="Link to Deep heading">#<\/a>/);
  assert.match(html, /<h6 id="last-heading"><a class="journal-heading-anchor" href="#last-heading" aria-label="Link to Last heading">#<\/a>/);
  assert.doesNotMatch(html, /aria-hidden="true"/);
});

test("journal table of contents includes only top-level sections without removing subheading anchors", () => {
  const markdown = createMarkdownLibrary();
  const html = markdown.render([
    "# Article title",
    "## First *section*",
    "### Subsection",
    "#### Details",
    "##### Fine print",
    "###### Footnote",
    "## Next & last",
    "```markdown\n## Not a section\n```",
  ].join("\n\n"));

  assert.deepEqual(headingsFromHtml(html), [
    { depth: 2, id: "first-section", text: "First section" },
    { depth: 2, id: "next-last", text: "Next & last" },
  ]);
  for (const id of ["subsection", "details", "fine-print", "footnote"]) {
    assert.ok(html.includes(`id="${id}"`));
    assert.ok(html.includes(`href="#${id}"`));
  }
  assert.deepEqual(headingsFromHtml(markdown.render("### Subsection only")), []);
});

test("site data validation checks navigation and breadcrumb relationships", () => {
  const site = {
    url: "https://www.simplejavamail.org",
    journal: {
      author: "Maintainer",
      indexUrl: "/engineering-journal.html",
      urlPrefix: "/journal/",
      feedUrl: "/journal/feed.xml",
    },
  };
  const navigation = {
    docsGroups: [{ label: "Maintain", items: [{ title: "Migration notes", url: "/migration-notes.html" }] }],
  };
  const pages = [
    { url: "/engineering-journal.html", data: { layout: "layouts/marketing.hbs" } },
    { url: "/migration-notes.html", data: { layout: "layouts/base.hbs" } },
    { url: "/migration-notes-10.0.0.html", data: { layout: "layouts/base.hbs", breadcrumbParent: "/migration-notes.html" } },
  ];

  assert.doesNotThrow(() => validateSiteData(site, navigation, pages));
  assert.throws(
    () => validateSiteData(site, { docsGroups: [{ items: [{ title: "Missing", url: "/missing.html" }] }] }, pages),
    /documentation navigation references missing page \/missing\.html/,
  );
  assert.throws(
    () => validateSiteData(site, navigation, [...pages, { url: "/orphan.html", data: { layout: "layouts/base.hbs", breadcrumbParent: "/missing.html" } }]),
    /breadcrumb parent references missing page \/missing\.html/,
  );
});

test("small code fences preserve highlighting, escaped content, captions and following blocks", () => {
  const markdown = createMarkdownLibrary();
  for (const language of ["text", "java"]) {
    for (const caption of ["", "\n*Inspect the result.*\n"]) {
      for (const newline of ["\n", "\r\n"]) {
        const source = ('```' + language + ' code-small\n<redacted> & value\n```\n' + caption
          + '\n```' + language + '\nnormal size\n```\n').replaceAll("\n", newline);
        const rendered = markdown.render(source);
        assert.ok(rendered.includes(`<pre class="code-small"><code class="language-${language}">&lt;redacted&gt; &amp; value\n</code></pre>`));
        assert.ok(rendered.includes(`<pre><code class="language-${language}">normal size\n</code></pre>`));
        assert.equal((rendered.match(/class="code-small"/g) || []).length, 1);
        assert.equal(rendered.includes("<figcaption>Inspect the result.</figcaption>"), Boolean(caption));
      }
    }
  }
});

test("compact code spacing combines with small text and preserves captions and following blocks", () => {
  const markdown = createMarkdownLibrary();
  for (const modifiers of ["code-compact", "code-small code-compact", "code-compact code-small code-compact"]) {
    const classes = modifiers.includes("code-small") ? "code-small code-compact" : "code-compact";
    for (const caption of ["", "\n*Inspect the result.*\n"]) {
      for (const newline of ["\n", "\r\n"]) {
        const source = ('```text ' + modifiers + '\n09:41:06.218 INFO  <redacted>\n```\n' + caption
          + '\n```java\nnormal spacing\n```\n').replaceAll("\n", newline);
        const rendered = markdown.render(source);
        assert.ok(rendered.includes(`<pre class="${classes}"><code class="language-text">09:41:06.218 INFO  &lt;redacted&gt;\n</code></pre>`));
        assert.equal(rendered.includes('<figure class="journal-captioned">'), Boolean(caption));
        assert.equal(rendered.includes("<figcaption>Inspect the result.</figcaption>"), Boolean(caption));
        assert.ok(rendered.includes('<pre><code class="language-java">normal spacing\n</code></pre>'));
      }
    }
  }
});

test("code styling requires exact fence modifiers and leaves Mermaid sizing alone", () => {
  const markdown = createMarkdownLibrary();
  for (const info of ["text", "text not-code-small", "text code-smallish", "text not-code-compact", "text code-compactish"]) {
    assert.match(markdown.render('```' + info + '\ncode-small\n```\n'), /^<pre><code class="language-text">/);
  }
  assert.match(markdown.render('```mermaid code-small code-compact\nflowchart LR\nA --> B\n```\n'), /<pre class="mermaid">/);
});

test("Markdown Mermaid fences become progressively enhanced journal diagrams", () => {
  const markdown = createMarkdownLibrary();
  const rendered = markdown.render("```mermaid\nflowchart LR\n  A --> B\n  C[<script>]\n```\n");
  assert.match(rendered, /<figure class="journal-diagram" data-pagefind-ignore>/);
  assert.match(rendered, /<pre class="mermaid">/);
  assert.match(rendered, /C\[&lt;script&gt;\]/);
  assert.doesNotMatch(rendered, /language-mermaid/);
});

test("Mermaid flowcharts and sequence diagrams share a single figure with their captions", () => {
  const markdown = createMarkdownLibrary();
  const diagrams = [
    'flowchart LR\nA["<value>"] --> B',
    'sequenceDiagram\nworker->>store: Attempt <result>',
  ];
  for (const diagram of diagrams) {
    const rendered = markdown.render('```mermaid\n' + diagram + '\n```\n\n*Store `id` & inspect [the result](/docs.html).*\n\nNext paragraph.\n');
    assert.equal((rendered.match(/<figure\b/g) || []).length, 1);
    assert.match(rendered, /<figure class="journal-captioned journal-diagram" data-pagefind-ignore="">\s*<pre class="mermaid">/);
    assert.match(rendered, /&lt;(?:value|result)&gt;/);
    assert.match(rendered, /<\/pre>\s*<figcaption>Store <code>id<\/code> &amp; inspect <a href="\/docs\.html">the result<\/a>\.<\/figcaption>\s*<\/figure>\s*<p>Next paragraph\.<\/p>/);
    assert.doesNotMatch(rendered, /<em>|language-mermaid/);
  }
});

test("compact Mermaid sizing uses a comment inside a standard fence, with or without captions", () => {
  const markdown = createMarkdownLibrary();
  for (const caption of ["", "\n*The regional mail setup.*\n"]) {
    for (const newline of ["\n", "\r\n"]) {
      const source = ('```mermaid\n%% journal: compact\nflowchart TB\nA --> B\n```\n' + caption).replaceAll("\n", newline);
      assert.equal(markdown.parse(source, {}).find((token) => token.type === "fence").info, "mermaid");
      const rendered = markdown.render(source);
      assert.match(rendered, /<pre class="mermaid mermaid-compact">%% journal: compact\nflowchart TB/);
      assert.equal((rendered.match(/<figure\b/g) || []).length, 1);
      assert.equal(rendered.includes("<figcaption>"), Boolean(caption));
    }
  }
  assert.doesNotMatch(markdown.render('```mermaid\nflowchart TB\nA --> B\n```\n'), /mermaid-compact/);
  assert.doesNotMatch(markdown.render('```mermaid\n%% journal: compactish\nflowchart TB\nA --> B\n```\n'), /mermaid-compact/);
  assert.doesNotMatch(markdown.render('```java\n%% journal: compact\ncall();\n```\n'), /mermaid-compact/);
});

test("consecutive diagram, code and image captions remain separate figures", () => {
  const markdown = createMarkdownLibrary();
  const rendered = markdown.render('```mermaid\nflowchart LR\nA --> B\n```\n\n*Claim the job.*\n\n```java\ncall();\n```\n\n*Send the email.*\n\n![Result](/result.png)\n\n_Inspect the result._\n\n```mermaid\nsequenceDiagram\nA->>B: Next job\n```\n\nOrdinary prose.\n');
  assert.equal((rendered.match(/<figure\b/g) || []).length, 4);
  assert.equal((rendered.match(/<figcaption>/g) || []).length, 3);
  assert.equal((rendered.match(/class="journal-captioned journal-diagram"/g) || []).length, 1);
  assert.match(rendered, /<figure class="journal-diagram" data-pagefind-ignore><pre class="mermaid">sequenceDiagram/);
  assert.match(rendered, /<\/figure>\s*<p>Ordinary prose\.<\/p>/);
});

test("italic paragraphs caption fenced code without changing code, links or following prose", () => {
  const markdown = createMarkdownLibrary();
  const rendered = markdown.render('```java\ncall("<value>");\n```\n\n*Save `id` & check [the result](/docs.html).*\n\nNext paragraph.\n');
  assert.match(rendered, /<figure class="journal-captioned">\s*<pre><code class="language-java">call\(&quot;&lt;value&gt;&quot;\);/);
  assert.match(rendered, /<figcaption>Save <code>id<\/code> &amp; check <a href="\/docs\.html">the result<\/a>\.<\/figcaption>/);
  assert.match(rendered, /<\/figure>\s*<p>Next paragraph\.<\/p>/);
  assert.doesNotMatch(rendered, /<em>/);
});

test("image captions preserve separate alt text and raw image attributes", () => {
  const markdown = createMarkdownLibrary();
  const rendered = markdown.render('![Image description](/sample.png)\n\n*A visible caption.*\n\n<img src="/sample.png" alt="A > B" class="journal-paragraph-image image-align-right" style="width:200px;" />\n\n_Another caption._\n');
  assert.equal((rendered.match(/<figure class="journal-captioned">/g) || []).length, 2);
  assert.match(rendered, /<img src="\/sample\.png" alt="Image description">\s*<figcaption>A visible caption\.<\/figcaption>/);
  assert.match(rendered, /alt="A > B" class="journal-paragraph-image image-align-right" style="width:200px;"/);
  assert.match(rendered, /<figcaption>Another caption\.<\/figcaption>/);
  assert.doesNotMatch(rendered, /<p>\s*<img/);
});

test("linked image captions retain their original-file link and image title", () => {
  const markdown = createMarkdownLibrary();
  const path = "/assets/journal/articles/polar-meridian/Polar Meridian - Noor's Kibana Dashboard.png";
  const rendered = markdown.render(`[![Dashboard description](<${path}> "Noor's dashboard")](<${path}>)\n\n*Synthetic monitoring data; click to enlarge.*\n`);
  assert.match(rendered, /<figure class="journal-captioned">\s*<a href="[^"]+"><img/);
  assert.match(rendered, /alt="Dashboard description" title="Noor's dashboard"/);
  assert.match(rendered, /<\/a>\s*<figcaption>Synthetic monitoring data; click to enlarge\.<\/figcaption>/);
  const href = rendered.match(/href="([^"]+)"/)[1];
  const src = rendered.match(/src="([^"]+)"/)[1];
  assert.equal(href, src);
  assert.equal(decodeURI(href), path);
  assert.doesNotMatch(rendered, /<p>\s*<a/);
});

test("linked raw persona images retain captions, attributes and their lightbox opt-in", () => {
  const article = readFileSync(new URL("../src/journal/2026-09-12-everybody-brought-their-own-mail-server.md", import.meta.url), "utf8");
  const html = createMarkdownLibrary().render(article.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, ""));
  for (const name of ["maya", "sam", "anika"]) {
    const pattern = new RegExp(`<figure class="journal-captioned">\\s*<a href="(/assets/journal/articles/relaydesk/personas/relay-desk-${name}\\.jpg)"><img([^>]+)></a>\\s*<figcaption>([^<]+)</figcaption>\\s*</figure>`, "u");
    const figure = html.match(pattern);
    assert.ok(figure, `${name} keeps the portrait and caption together`);
    assert.ok(figure[2].includes(`src="${figure[1]}"`), "Self-link uses the original image as its destination");
    assert.match(figure[2], /class="journal-persona-image(?: image-align-left)?"/);
    assert.match(figure[2], /width="1075" height="717" loading="lazy" decoding="async"/);
    assert.match(figure[2], /title="[^\"]+"/);
    if (name === "sam") assert.match(figure[2], /image-align-left/);
  }
  const mixed = '<a href="/assets/journal/test.jpg"><img src="/assets/journal/test.jpg">Extra prose</a>\n\n*An aside.*\n';
  assert.doesNotMatch(createMarkdownLibrary().render(mixed), /journal-captioned|figcaption/);
});

test("RelayDesk closes with a readable mission debrief rather than a copyable code example", () => {
  const article = readFileSync(new URL("../src/journal/2026-09-12-everybody-brought-their-own-mail-server.md", import.meta.url), "utf8");
  const html = createMarkdownLibrary().render(article.slice(article.indexOf("## Back to Maya's support ticket")));
  assert.match(html, /class="journal-mission-debrief" role="group" aria-labelledby="relaydesk-run-complete"/);
  assert.match(html, /id="relaydesk-run-complete">RUN COMPLETE<\/p>/);
  assert.match(html, /Back at the bar, Sam orders a fresh beer\.<br>\s*This time, his pad stays in his jacket\.<br>\s*For the moment\./);
  assert.match(html, /<div class="journal-mission-opening">[\s\S]*?<img class="journal-mission-mascot" src="\/assets\/journal\/articles\/relaydesk\/relaydesk-spiderbot-mascotte\.png" width="400" height="210" alt="" loading="lazy" decoding="async">\s*<\/div>\s*<dl>/);
  assert.ok(readFileSync(new URL("../src/assets/journal/articles/relaydesk/relaydesk-spiderbot-mascotte.png", import.meta.url)).length > 0);
  const styles = readFileSync(new URL("../src/styles/journal.less", import.meta.url), "utf8");
  assert.match(styles, /img\.journal-mission-mascot \{[^}]*top: 50%;[^}]*right: calc\(@space-lg \+ \(100% - \(@space-lg \* 2\)\) \* 0\.225\);[^}]*border: 0;[^}]*transform: translate\(50%, -50%\);/);
  assert.match(styles, /@media \(max-width: 640px\) \{\s*\.journal-mission-opening \{\s*position: relative;\s*margin-bottom: 96px;/);
  for (const [name, result] of [["Maya", "Reply delivered"], ["Sam", "Access restored"], ["Anika", "Credentials replaced"]]) {
    const row = html.match(new RegExp(`<dt>${name}</dt><dd class="journal-mission-result">([\\s\\S]*?)</dd>`));
    assert.ok(row, `${name} keeps a name and result row`);
    assert.ok(row[1].includes(`src="/assets/journal/articles/relaydesk/personas/relay-desk-${name.toLowerCase()}-portrait.jpg"`));
    assert.ok(row[1].includes('class="journal-mission-portrait"'));
    assert.ok(row[1].includes(`<span>${result}. Level up.</span>`));
    assert.ok(row[1].indexOf("<img") < row[1].indexOf("<span"), "portrait sits before the result");
  }
  assert.match(html, /10\.547 credits &mdash; contract complete\./);
  assert.match(html, /&gt; Job's done\. Jack out\./);
  assert.doesNotMatch(html, /<pre|<code|RelayDesk sells support software/);
});

test("RelayDesk keeps its editable Mermaid source in an inert template beside the infographic", () => {
  const article = readFileSync(new URL("../src/journal/2026-09-12-everybody-brought-their-own-mail-server.md", import.meta.url), "utf8");
  const body = article.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, "");
  const html = createMarkdownLibrary().render(body);
  const source = html.match(/<template id="relaydesk-support-network-source" data-pagefind-ignore>([\s\S]*?)<\/template>/u);
  assert.ok(source, "The original diagram remains in a native, inert template");
  assert.match(source[1], /<pre class="mermaid">/);
  assert.match(source[1], /accTitle: Customer support is one use of RelayDesk's multi-party case platform/);
  assert.match(source[1], /kestrelAgents --&gt;/);
  const visibleHtml = html.replace(source[0], "");
  assert.equal((visibleHtml.match(/<pre class="mermaid(?: mermaid-compact)?">/gu) || []).length, 3);
  assert.match(visibleHtml, /<a href="\/assets\/journal\/articles\/relaydesk\/relaydesk-support-network\.jpg"><img[^>]+src="\/assets\/journal\/articles\/relaydesk\/relaydesk-support-network\.jpg"/);
  assert.match(visibleHtml, /<figcaption>Customer support is one use of RelayDesk;/);
});

test("caption recognition leaves ordinary prose, mixed emphasis and nested content alone", () => {
  const markdown = createMarkdownLibrary();
  const samples = [
    '```java\ncall();\n```\n\nAn ordinary paragraph.\n',
    '```java\ncall();\n```\n\n*One phrase* and *another*.\n',
    '```java\ncall();\n```\n\n*One* *another*\n',
    '```java\ncall();\n```\n\nAn intervening paragraph.\n\n*An aside.*\n',
    'A paragraph with ![an image](/sample.png).\n\n*An aside.*\n',
    'A paragraph with [![an image](/sample.png)](/sample.png).\n\n*An aside.*\n',
    '<img src="/one.png"><img src="/two.png">\n\n*An aside.*\n',
    '> ```java\n> call();\n> ```\n>\n> *Quoted prose.*\n',
    '- ![Image](/sample.png)\n\n  *List prose.*\n',
    '```mermaid\nflowchart LR\nA --> B\n```\n\nOrdinary diagram prose.\n',
    '> ```mermaid\n> flowchart LR\n> A --> B\n> ```\n>\n> *Quoted diagram prose.*\n',
  ];
  for (const source of samples) assert.doesNotMatch(markdown.render(source), /journal-captioned|figcaption/, source);
});

test("caption markup does not hide publication TODOs", () => {
  for (const language of ["java", "mermaid"]) {
    const source = '```' + language + '\nexample\n```\n\n*A caption <!-- TODO: verify the example -->.*\n';
    assert.throws(() => enforceJournalTodoPolicy(createMarkdownLibrary(), source, "example.md", false), /Resolve TODO marker/);
  }
});

test("documentation navigation supports always-visible child pages", () => {
  const groups = [{
    label: "Build and configure",
    items: [{
      title: "Configuration",
      url: "/configuration.html",
      children: [{ title: "Spring integration", url: "/spring.html" }],
    }],
  }];
  const site = {
    url: "https://www.simplejavamail.org",
    journal: {
      author: "Maintainer",
      indexUrl: "/engineering-journal.html",
      urlPrefix: "/journal/",
      feedUrl: "/journal/feed.xml",
    },
  };
  const pages = [
    { url: "/engineering-journal.html", data: { layout: "layouts/marketing.hbs" } },
    { url: "/configuration.html", data: { layout: "layouts/base.hbs" } },
    { url: "/spring.html", data: { layout: "layouts/base.hbs", breadcrumbParent: "/configuration.html" } },
  ];

  assert.equal(navItemForUrl(groups, "/spring.html")?.title, "Spring integration");
  assert.doesNotThrow(() => validateSiteData(site, { docsGroups: groups }, pages));
  assert.throws(
    () => validateSiteData(site, { docsGroups: groups }, pages.filter((page) => page.url !== "/spring.html")),
    /documentation navigation references missing page \/spring\.html/,
  );
});

test("journal URLs and feed dates retain the established public format", () => {
  assert.equal(journalArticleUrl({ journal: { urlPrefix: "/journal" } }, "an-entry"), "/journal/an-entry.html");
  assert.equal(formatDate("2026-08-26"), "August 2026");
  assert.equal(rssDate("2026-08-26"), "Wed, 26 Aug 2026 12:00:00 GMT");
});

test("journal series use their first part's date and retain part order", () => {
  const entry = (url, date, part) => ({
    url,
    date: new Date(`${date}T00:00:00Z`),
    data: {
      title: url,
      category: "Project history",
      date,
      ...(part ? { series: { title: "Twenty Years", part, total: 3 } } : {}),
    },
  });
  const entries = [
    entry("/origin.html", "2026-08-29"),
    entry("/part-1.html", "2026-09-01", 1),
    entry("/part-2.html", "2026-09-02", 2),
    entry("/part-3.html", "2026-09-03", 3),
    entry("/later.html", "2026-09-02"),
  ];

  assert.deepEqual(
    orderJournalEntries(entries).map(({ url }) => url),
    ["/origin.html", "/part-1.html", "/part-2.html", "/part-3.html", "/later.html"],
  );
  assert.deepEqual(
    orderJournalEntries(entries, true).map(({ url }) => url),
    ["/later.html", "/part-3.html", "/part-2.html", "/part-1.html", "/origin.html"],
  );
  assert.equal(journalNeighbor(entries, "/part-1.html", "newer").url, "/part-2.html");
  assert.equal(journalNeighbor(entries, "/part-3.html", "newer").url, "/later.html");
});

test("Google Code snapshots retain the archive identities and render comments safely", async () => {
  const issues = await loadGoogleCodeIssues();
  const vesijamaIssue = issues.find((issue) => issue.project === "vesijama" && issue.id === 1);
  const unavailableAttachment = issues.find((issue) => issue.project === "simple-java-mail" && issue.id === 4)?.comments[0].attachments[0];
  assert.equal(issues.length, 15);
  assert.equal(vesijamaIssue?.comments[1].identity, googleCodePseudoIdentity(-8351100562032279782));
  assert.equal(vesijamaIssue?.comments[1].posted.iso, googleCodeTimestamp(1244071477).iso);
  assert.equal(unavailableAttachment?.available, false);

  const markdown = createGoogleCodeCommentLibrary();
  assert.equal(decodeGoogleCodeEntities('&quot;quoted&quot;'), '"quoted"');
  const rendered = markdown.render(decodeGoogleCodeEntities('&lt;script&gt;alert(&quot;not safe&quot;)&lt;/script&gt;\n\nhttps://example.com'));
  assert.doesNotMatch(rendered, /<script>/);
  assert.match(rendered, /&lt;script&gt;/);
  assert.match(rendered, /href="https:\/\/example\.com"/);
});

test("Google Code project and wiki snapshots repair links without reviving unsafe markup", async () => {
  const projects = await loadGoogleCodeProjects();
  const wikis = await loadGoogleCodeWikis();
  assert.equal(projects.length, 2);
  assert.equal(wikis.length, 2);

  const projectMarkdown = createGoogleCodeProjectLibrary();
  const simpleJavaMail = projects.find((project) => project.project === "simple-java-mail");
  const renderedProject = projectMarkdown.render(simpleJavaMail?.description || "");
  assert.match(renderedProject, /href="\/sources\/google-code\/simple-java-mail\/wiki\/manual\.html"/);
  assert.match(renderedProject, /blob\/0cccba388d3420efab84c70e4cda86c36d82069d\/javadoc\/users\/index\.html/);

  const vesijamaManual = wikis.find((wiki) => wiki.project === "vesijama");
  assert.match(vesijamaManual?.contentHtml || "", /blob\/4d5bf205a1a5193d4ea1d655f98e875f0b026e7f\/NOTICE\.txt/);
  assert.doesNotMatch(vesijamaManual?.contentHtml || "", /href="https?:\/\/(?:code\.google\.com|[^"/]+\.googlecode\.com)/i);

  assert.equal(
    googleCodeArchiveLink("https://web.archive.org/web/20150531075139/http://code.google.com/p/vesijama/wiki/Manual"),
    "/sources/google-code/vesijama/wiki/manual.html",
  );
  assert.equal(
    googleCodeArchiveLink("http://code.google.com/p/simple-java-mail/source/browse/tags/vesijama%20v1.1/src/org/codemonkey/vesijama/Mailer.java"),
    "https://github.com/bbottema/simple-java-mail/blob/5a4d1bcd69bd587dc143eabaf68579ff5be45923/src/org/codemonkey/vesijama/Mailer.java",
  );

  const unsafeWiki = sanitizeGoogleCodeWikiHtml('<h1><a name="Safe">Safe</a></h1><script>alert(1)</script><a href="javascript:alert(2)">bad</a>');
  assert.match(unsafeWiki, /<h1 id="Safe">Safe<\/h1>/);
  assert.doesNotMatch(unsafeWiki, /script|javascript|alert/i);
});

test("Project Nibble snapshots preserve posts and exact comment citations safely", async () => {
  const posts = await loadProjectNibblePosts();
  const origin = posts.find((post) => post.slug === "vesijama-very-simple-java-mail");
  assert.equal(posts.length, 3);
  assert.equal(posts.reduce((total, post) => total + post.comments.length, 0), 41);
  assert.equal(origin?.comments.find((comment) => comment.id === 1221)?.author, "Davin");
  assert.equal(origin?.comments.find((comment) => comment.id === 1305)?.author, "canistel");
  assert.match(origin?.contentHtml || "", /email\.setTextHTML/);
  assert.doesNotMatch(origin?.contentHtml || "", /onclick=|<script/i);

  assert.equal(
    projectNibbleArchiveLink("https://web.archive.org/web/20150531075139/http://blog.projectnibble.org/2009/04/27/vesijama-very-simple-java-mail/comment-page-1/#comment-1305"),
    "/sources/project-nibble/vesijama-very-simple-java-mail.html#comment-1305",
  );
  assert.equal(
    projectNibbleArchiveLink("https://web.archive.org/web/20150531075139/http://code.google.com/p/simple-java-mail/issues/detail?id=7"),
    "/sources/google-code/simple-java-mail/issue-7.html",
  );
  assert.equal(
    projectNibbleArchiveLink("https://web.archive.org/web/20120722092115/http://search.maven.org/#artifactdetails%7Corg.codemonkey.simplejavamail%7Csimple-java-mail%7C1.8%7Cjar"),
    "https://repo1.maven.org/maven2/org/codemonkey/simplejavamail/simple-java-mail/1.9.1/",
  );
  const unsafe = sanitizeProjectNibbleHtml('<script>alert(1)</script><a href="javascript:alert(2)">bad</a><p>fine</p>');
  assert.doesNotMatch(unsafe, /script|javascript|alert/i);
  assert.match(unsafe, /<p>fine<\/p>/);
});

test("SourceForge snapshots preserve complete discussions and readable historic records", async () => {
  const sources = await loadSourceForgeSources();
  assert.equal(sources.length, 7);

  const discussions = sources.filter((source) => source.kind === "discussion");
  assert.equal(discussions.reduce((total, source) => total + source.posts.length, 0), 20);
  const yahoo = discussions.find((source) => source.slug === "dkim-javamail-yahoo-signatures");
  assert.equal(yahoo?.posts.find((post) => post.slug === "a7cd/57b5/60e8")?.anchor, "a7cd/57b5/60e8");
  const resolution = yahoo?.posts.find((post) => post.slug === "a7cd/57b5/60e8");
  assert.equal(resolution?.authorName, "Florian Sager");
  assert.match(resolution?.text || "", /v1\.3/i);

  const ticket = sources.find((source) => source.slug === "javamail-crypto-bug-3");
  assert.match(ticket?.payload.ticket.description || "", /addHeader instead of\s+setHeader/);
  const mail = sources.find((source) => source.slug === "javamail-crypto-message-457552");
  assert.match(mail?.payload.body || "", /application\/x-pkcs7-signature/);
  assert.doesNotMatch(mail?.payload.body || "", /=(?:20|A0|E9|C0)(?:\b|$)/);

  assert.equal(
    sourceForgeArchiveLink("https://sourceforge.net/p/dkim-javamail/discussion/893011/thread/c25e4d2b/#a7cd/57b5/60e8"),
    "/sources/sourceforge/dkim-javamail/discussion/error-sending-to-yahoo.html#a7cd/57b5/60e8",
  );
  assert.equal(
    sourceForgeArchiveLink("https://sourceforge.net/project/showfiles.php?group%5C_id=246725"),
    "https://sourceforge.net/projects/dkim-javamail/files/",
  );
  assert.equal(decodeSourceForgeEntities("one&nbsp;two"), "one\u00a0two");
  const markdown = createSourceForgeMarkupLibrary();
  assert.doesNotMatch(markdown.render('<script>alert("unsafe")</script>'), /<script>/);
});
