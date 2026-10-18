# Field guides

The workload guide is classified as **Tactical Patterns**. Complete application blueprints live under `src/strategic-patterns/` as **Strategic Patterns**.
The shared `/patterns.html` landing page explains those two choices; both collection links remain available directly in the docs sidebar.
Use ordinary breadcrumbs and the validated category metadata to identify each collection, without category badges. Preserve the workload guide's URL
and scenario anchors. Strategic pages have a separate schema, without mandatory tactical
scenario groups. Neither category belongs to Journal/Case Study feeds. Canonical Docker application sources live in the Java repository's
`tools/integration-patterns/`; downloadable bundles are generated, not separately maintained copies.

Put scenario-based reference material here, not in the personal Engineering Journal. Guides use the site's shared Markdown features (heading anchors, code captions and code copying), with a dedicated lookup-directory layout and stylesheet.

`email-workloads.md` is the initial workload guide. Its adjacent `email-workloads.11tydata.json` supplies the directory groups and scenario targets. Each group title must match a Markdown H2 and each scenario title a Markdown H3 so directory links resolve. Keep all group and scenario IDs unique. The side navigation lists only top-level groups; the opening directory is the detailed scenario lookup. The shared layout generates a local scenario index beneath each H2 from that same metadata, so authors don't maintain a second set of links. These generated indexes appear on the website, not in Typora's source preview.

Give a scenario its own concrete situation, measurable target, smallest useful design and relevant API calls. Link the applicable reference sections within each entry, since readers can enter anywhere. Keep a failure check when it exposes something non-obvious; don't append a formulaic exercise that simply repeats the target. Distinguish application code from Simple Java Mail configuration and SMTP-service policy. Use captions to make the examples' progression legible when scanning. Do not require readers to follow a fictional company or read all previous entries.

Guides appear in both preview and production builds. Per-page draft controls are reserved for Engineering Journal entries. Guides are not Journal entries, case studies or members of their feeds.

The documentation sidebar groups both collections beneath the clickable Patterns parent. The top Docs dropdown offers one combined
Tactical/strategic patterns link to `/patterns.html`.
Collection pages name `/patterns.html` as their breadcrumb parent; individual Strategic Patterns name `/strategic-patterns.html`. The shared breadcrumb
helper follows that hierarchy. Reading rails identify their page and provide both the collection return and an All patterns link.

Link Tactical scenarios to relevant runnable applications where they help. Strategic pages declare `tacticalScenarios` with links to specific field-guide
anchors, and optionally a `caseStudy` with its title and URL. Their shared ending renders these links and the routes back to the collections on every page,
including narrow screens where the reading rail scrolls away. Keep prerequisites and the complete source-download route beside Start here.

Downloadable examples belong in `src/assets/guides/<guide>/`. Keep their methods and usage contracts synchronized with the visible code. Compile against the API being demonstrated; compilation is not proof of SMTP behavior. Use authorized local fixtures for runtime checks and send no real mail during website verification.
