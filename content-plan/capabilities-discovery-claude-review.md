# Claude review of capabilities discovery

Date: 2026-11-14
Status: independent advisory review for discussion
Plan reviewed: [Capabilities and documentation discovery](capabilities-discovery.md)
Model: Claude Fable 5.2 (`claude-fable-5-2`)
Effort: `max`
Claude Code: 2.1.325 (updated from 2.1.222 before the review)

Claude inspected the website sources with read-only tools. It did not render the pages or modify the plan. The response below is retained as returned; its recommendations and hypotheses are discussion input, not adopted changes. File and line references describe the working tree at review time.

---

## 1. Verdict: partly agree

The diagnosis is sound and the direction is right: one catalogue, Use cases folded into it, and `/features.html` left in place with its anchors. I disagree on three points.

- **The problem is site-wide.** The newer areas are missing from every entry page, because nine hand-written capability lists have drifted apart. Restructuring one page will not fix that.
- **The compatibility promise is over-specified.** Mapping old `/use-cases.html` fragments needs machinery this static site lacks, for a page that is probably too new to have inbound fragment links.
- **The seven groups add another vocabulary** unless the plan says which existing ones they retire, and two of the names are weak.

## 2. Findings

Everything here comes from reading the current working tree, which includes uncommitted edits, so line numbers may shift. I rendered nothing; anything about real heights, wrapping or scanability needs a visual check.

**Observations from source**

- **The earlier description of Capabilities holds.** The page opens with five cards (`src/pages/features.hbs:17`), five intro subsections (`:37`) and a flat 43-entry contents list (`:83`). It calls itself "the complete feature reference" (`:32`), as does `src/pages/docs.hbs:54`; only the navigation label promises an overview.
- **The breadth gap is on every entry page.** Searching the homepage, Get started, Why and Docs sources for failover, retry, telemetry, sending limit, delivery report, incoming and received gives two hits, both at `src/pages/docs.hbs:61`. The standard breadth sentence (`src/pages/index.hbs:14`, `src/_includes/footer.hbs:7`) still stops at proxies, pools and clusters.
- **Nine hand-written capability maps sit on six pages.** Three are on the homepage (`src/pages/index.hbs:70`, `:141`, `:237`). The others are at `src/pages/docs.hbs:37`, `src/pages/why-simple-java-mail.hbs:61` and `src/pages/download.hbs:113`, on Use cases, and in the cards and extension map on Capabilities. The six-stage lifecycle is written out three times and sends "Deliver" to different places.
- **They have already drifted.**
  - The docs directory (`src/pages/docs.hbs:52`) omits five pages the sidebar has: sending and execution, understanding configuration, failover, retries and OpenTelemetry.
  - "Configure clusters" on the homepage (`src/pages/index.hbs:191`), and the same link at `src/pages/use-cases.hbs:71` and `src/pages/why-simple-java-mail.hbs:109`, land on a two-sentence pointer (`src/pages/configuration.hbs:1388`). The content now lives at `/sending-and-execution.html#section-clustering`.
  - The Capabilities contents list omits the international-mail section (`src/pages/features.hbs:2220`).
  - Use cases ends with an unnumbered, id-less retry paragraph (`src/pages/use-cases.hbs:139`) whose title duplicates a Tactical Patterns scenario (`src/guides/email-workloads.md:418`).
- **"Email and Mailer reference" fits only part of `/features.html`.** Sending limits (`:631`), async results (`:654`), observers (`:673`) and receipts (`:913`) are summaries that hand off to other guides.
- **There is no redirect layer in source.** `src/static` holds only `robots.txt`, and `src/pages/redirect.hbs:13` is a meta refresh to the homepage. A meta refresh does not carry a fragment.
- **Use cases is new and thinly linked.** It is absent from the route plan (`content-plan/README.md:154`), has five internal links, and nothing links to its seven fragments except its own jump list.
- **The Docs flyout mislabels its destinations.** It prints each sidebar group name as a link to that group's first page (`src/_includes/site-header.hbs:30`), so "Build and configure" opens `/features.html` and "Integrate and understand" opens the CLI page.

**Hypotheses, not verified**

- Evaluators often arrive on the homepage or straight on a guide from search and never open Capabilities. There are no analytics, and every journey in the plan starts at the catalogue, Get started or Docs.
- `/use-cases.html` has few external inbound links and none to its fragments. This needs a check against the published site.
- On narrow screens the five stacked cards are at least 1,050px tall by CSS minimum (`src/styles/main.less:313`, `:439`). That agrees with the earlier rendered review, but I measured nothing.

## 3. Consolidating Use cases, and the new route

**Folding Use cases in is a real simplification.** Its content is already a capability map (seven groups, 33 links). Its label now competes with 27 Tactical Patterns scenarios, ten Strategic Patterns and the case studies. The "which approach when" guidance in its paragraphs is covered by the pooling guide and the field guide, so it can be cut instead of migrated.

**The route table is close to right; the compatibility requirement is the over-engineered part.**

| Option | Assessment |
| --- | --- |
| New `/capabilities.html`; `/use-cases.html` maps old fragments to new ones (the plan) | Needs a redirect script or a server-side redirect; the source has neither. |
| Rework `use-cases.hbs` into the catalogue, move its permalink to `/capabilities.html`, leave a plain stub | My preference. |
| Keep the catalogue at `/use-cases.html` and only relabel it | No route change, but "Capabilities" would sit at `/use-cases.html` while `/features.html` is something else. |
| Put the catalogue on top of `/features.html` | No route change, but the page stays a 3,400-line hybrid, and search hits for attachment details stay titled "Capabilities". |

- **`/features.html`:** I agree it must keep the detailed content and its roughly 80 ids. About 160 internal references in 34 files point at it.
- **`/use-cases.html`:** a short `noindex` stub linking to the catalogue is enough, and the existing indexability check accepts that (`scripts/verify-indexability.mjs:54`). If the page was never published, drop the stub too.
- **Old fragments:** add the seven old ids to the catalogue only if inbound fragment links turn up.
- **Unknown:** I found no deployment configuration in the repository, so I cannot say whether server-side redirects are available.

**The less disruptive alternative is a different order, not a different route.** Most of the discovery gain needs no route decision; see section 6.

## 4. The seven groups

They mirror the areas you list, which is their strength. They are not complete: nothing in the table gives a home to the CLI, Karaf, modules, address validation, input scanning, delivery-status and receipt requests, or international addresses. "Compact" and "the whole library" pull against each other, so the plan needs an inclusion rule and one "everything in this area" link per group.

| Proposed group | Verdict |
| --- | --- |
| Build messages | Natural. |
| Read and convert mail | Rename, for example "Convert and inspect existing mail", and say the application supplies the message. "Read" suggests mailbox access, which `content-plan/README.md:330` and `src/pages/why-simple-java-mail.hbs:146` rule out. Cross-list delivery reports. |
| Protect messages and connections | Natural. Add input scanning and server identity checks. |
| Control sending | Keep the split, change the name. "Control" names nothing; "Send at volume" says what is inside. |
| Recover from failures | Keep. It is small, and that is fine: the heading does the discovery work. |
| Observe and troubleshoot | Natural. Move "partial and uncertain acceptance" here, where its guide sits (`src/_data/nav.json:76`), and cross-link from Recover. |
| Configure and integrate | Weakest. It mixes central policy (defaults, overrides, locks), stack fit (Spring, your own Session) and replacement points (custom sending). It also buries authenticated SOCKS, one of the homepage's two headline differentiators. Name those three clusters inside the group. |

**The control/recover split helps a reader with a resilience requirement.** Merged, failover and retries become the last items of one long list. Tactical Patterns already separates "Control arrival and contention" from "Recover without guessing" (`src/guides/email-workloads.md:86`, `:416`). The same file, though, puts failover under "Separate connections deliberately" (`:156`) and receipts and bounces under Recover, so the boundary is not settled even in your own material. Give each feature one home plus a "Related" line.

**The plan must say what the groups replace.** `content-plan/README.md:63` calls the six-stage lifecycle the canonical narrative. The plan's "no numbered sequence" rule contradicts the numbered lists on the homepage, Docs, Why and Use cases. I would treat seven as the ceiling and make them the only wayfinding vocabulary.

## 5. Preferred shape and journeys

**One capability list, shown at three depths.**

- **Homepage:** the first send, then one band with the seven group names and three or four feature names each, linking to catalogue groups. "See what it handles" keeps scrolling to that band, which ends with "All capabilities". Remove the wayfinding grid (`src/pages/index.hbs:237`); it repeats the band above it.
- **Capabilities:** a title, one sentence, a first-email link and a one-line index of groups. No cards and no code.
  - Each group is a row in the format the extension map already uses (`src/pages/features.hbs:140`): one sentence, then plain-text feature links with a short qualifier.
  - Show a module badge only where an optional module is required.
  - Take "See it working" links from the existing demonstration data (`src/_lib/pattern-demonstrations.mjs:8`).
  - The first-email link matters because the header button is inside the collapsed menu below 1080px (`src/styles/main.less:398`).
- **Guides:** each shows its catalogue group as the eyebrow and offers "More in this group" in place of the generic footer (`src/_includes/layouts/base.hbs:39`). Today the failover guide's eyebrow reads "Build and configure" (`src/pages/smtp-connection-failover.hbs:7`).
- **`/features.html`:** call it "Email and Mailer guide". "Reference" already labels every guide (`src/pages/docs.hbs:50`) and suggests Javadoc. Open with three lines and a contents list grouped as `content-plan/features.md:28` already intends, and keep the word "features" in the lede for returning readers.
- **Docs:** search, first email, migration, and a by-page directory generated from `nav.json`. Replace "Browse by task" with one link to Capabilities.
- **Why and Get started:** swap Why's 24-link stage list for a paragraph and a link. Add a Capabilities link to "Where to go next" (`src/pages/download.hbs:113`).
- **Patterns and case studies:** unchanged. Patterns answers "by problem", and its "By feature" index is the reverse lookup.

**Journeys the plan does not cover**

- A checklist evaluator uses find-in-page on Capabilities, so every feature name must be visible text, not hidden in tabs or accordions.
- A reader who lands on a guide from a search engine finds neighbouring features through the group link, without opening the collapsed sidebar.

## 6. Recommendation

**Keep:** one catalogue with Use cases folded in; `/features.html` and every id in place; no basic/advanced division; concrete feature names; module labels beside features; routes decided before content moves.

**Change in the plan**

1. Restate the goal as one list rendered at three depths, and name the maps to retire: the docs task list, the homepage grid, Why's stage list and the Capabilities cards.
2. Replace "preserving equivalent section targets" with a plain stub, and build the catalogue by reworking `use-cases.hbs` so three overview pages never coexist.
3. Rename two groups, restructure "Configure and integrate", add the inclusion rule, and update the lifecycle wording in `content-plan/README.md`, `content-plan/features.md:20` and `content-plan/docs-system.md:22`.
4. Add the search-arrival journey and the guide eyebrow.
5. Hold the list in one data file with a coverage test, as the pattern demonstrations do (`tests/patterns.test.mjs:293`). The drift above is the case for it.

**Do first, whatever happens to routes**

- Add the five missing pages to the docs directory.
- Repoint the three cluster links.
- Add the missing contents entry on Capabilities.
- Update the breadth sentence to include recovery, observability and inspection of supplied mail.

**Prototype and check before committing**

- Build the seven rows once in the existing row format and view them at 360px and 1280px.
- Check the published site for `/use-cases.html`, inbound links to it, and what the host can redirect.
- Check that site search ranks the guide above the catalogue for "failover" and "DKIM".
- Run the tasks below with three to five Java developers, and have them file twelve feature names under the seven headings.

**Reader tasks**

1. "Your relay goes down overnight. Can the library switch to another, and is there something to run?" From the homepage at 360px, without search: the failover guide in two taps, the demonstration in three.
2. "A partner sends signed EML files. Can the library verify them? Can it fetch them from a mailbox?" The reader reaches the received-protection section and can say, from catalogue text alone, that fetching is out of scope.
3. "Cap sending at 30 messages a minute." Search or Docs leads to `/sending-and-execution.html#section-sending-limits`, not the summary on `/features.html`.
4. Starting on the OpenTelemetry guide on a phone, find what else exists for observing sends without opening the sidebar.

**Acceptance criteria**

- A test confirms that every guide in the sidebar's three middle groups, and every demonstration topic, is linked from the catalogue.
- No catalogue or homepage link targets a compatibility pointer.
- Group names are string-identical on the homepage band, the catalogue and guide eyebrows.
- Hand-written capability maps fall from nine to three or fewer.
- The catalogue has at most seven groups and about 45 links, with no code and no fixed-height cards. Three phone screens is a target to confirm visually.
- Every current id on `features.hbs` survives (snapshot them first) and the internal link check passes.
- `/use-cases.html` is gone from `nav.json`, the footer, the docs directory and `src/pages/case-studies.hbs:43`.