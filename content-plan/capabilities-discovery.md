# Capabilities and documentation discovery

Status: implemented locally and verified
Date: 2026-11-14
Review: [Independent Claude assessment](capabilities-discovery-claude-review.md)
Implementation review: [Claude findings](capabilities-implementation-claude-review.md) and [repairs and holistic review](capabilities-implementation-review-followup.md)

## Agreed structure

Capabilities remains at `/features.html`, preserving the established discovery URL. Detailed instructions now live in `/email-composition.html` (Building emails), `/email-conversion.html` (Converting and inspecting email), and the existing focused guides. `/use-cases.html` is a noindex compatibility page. No separate capabilities slug is introduced.

The catalogue, homepage summary, documentation sidebar and guide context use the same seven families:

- Build messages
- Convert and inspect existing mail
- Protect messages and connections
- Send one or many
- Recover from failures
- Observe and troubleshoot
- Configure and integrate

Configure and integrate has visible Shared settings, Application integration, and Connection and delivery integration subtopics. The catalogue names features directly and keeps them visible for scanning and find-in-page. It links to the first-email example, canonical guides and runnable demonstrations. The supplied-mail section makes clear that the application provides the messages; SJM does not fetch a mailbox.

## Shared sources

`src/_data/capabilities.json` owns family names, feature labels, canonical destinations, optional modules, related features and homepage highlights. `src/_lib/capabilities.mjs` validates and resolves that data. Runnable examples reuse `src/_lib/pattern-demonstrations.mjs`.

`src/_data/nav.json` owns the guide inventory and descriptions, grouped by family id. The sidebar and Docs directory resolve labels from the catalogue. The Docs dropdown opens real directory sections rather than arbitrary first pages. Start and Maintain surround the seven families; Patterns retains its two child collections.

## Page responsibilities

| Page | Responsibility |
| --- | --- |
| Homepage and Why | Explain why to choose the library, with a small first send and selected examples |
| Capabilities | Show the breadth and link directly to guides and demonstrations |
| Get started | Complete one working send and explain dependency choices |
| Docs and guides | Search, locate and implement a particular capability |
| Patterns and case studies | Explain feature combinations through concrete application problems |

The homepage retains `delivery-route` for its shared family summary. Each row links to the main guide and selected feature guidance. A single All capabilities link opens the full catalogue. The old independent lifecycle, capability rows and final wayfinding grid have been consolidated. Why has a short catalogue handoff. Get started offers capabilities, configuration and diagnostics as next steps while retaining module installation guidance. Footer links include the two new task guides.

## Detailed content ownership

| Destination | Content |
| --- | --- |
| Building emails | Builders, recipients, bodies/encodings, calendars, attachments/images, headers and identity, replies/copies, envelope and notification choices, rendered templates |
| Converting and inspecting email | Common conversions, supplied sources and Problems, receiving-key examples, interpretation details, import limits, Outlook metadata, exact EML and serialization |
| Configuration | Reusable Mailers, supplied Sessions/properties, local addresses and client identity, Session access, proxies, extension points and custom sending |
| Security | Authentication/TLS, the Gmail example and protection of existing MIME |
| Sending and execution | Execution modes, batches, limits, observers and international SMTP compatibility |
| Diagnostics and results | Validation/rehearsal, connection tests, size limits, logging, receipts, IDs, recipient replies and asynchronous results |

Existing canonical sections own summary topics such as authentication, retries and receipts. New substantive sections retain their old ids in their destination guides. The full technical material is preserved in the extracted guides or focused sections; repeated introductory maps and obsolete announcements are removed.

## Compatibility and search

The compatibility baseline is the union of published and checkout content anchors, captured in `tests/fixtures/legacy-features-anchors.json`. It includes the published-only `outlook-source-data` fragment. `src/_data/legacyFeatures.json` maps moved fragments to their canonical destinations.

Features keeps its catalogue/navigation anchors. Recognized old fragments use same-origin `location.replace`, preserve query parameters, and work on initial arrival and later hash changes. Unknown or malformed Features fragments remain on the catalogue. A no-JavaScript fallback contains the old ids and ordinary destination links, excluded from search.

Use cases preserves all seven known section targets and offers automatic navigation plus ordinary links to the matching catalogue groups. It is excluded from sitemap and search. Both new guides have their own canonical URLs and are indexable. Internal website links point directly to current guidance.

The homepage summary is excluded from Pagefind, the catalogue has lower-weight feature-list text, and guide content has increased weight. Legacy section ids are moved onto their rendered headings without duplication so search can return subsection links.

## Validation and maintenance

The website check includes capability validation, guide/demonstration coverage, the captured legacy-anchor contract, rendered catalogue/directory integration, redirect safety and query/hash behavior. Guide checks parse rendered HTML and enforce section order, heading ownership, contents placement and order, valid lists, and module badges. They reject full instructions inside contents boxes and stale internal links to moved Features fragments, even when a no-JavaScript alias exists. `scripts/verify-capabilities.mjs` applies these rules to built HTML, checks feature/module/demonstration/main-guide destinations and validates the sitemap.

Required development checks are `npm run check`, `npm run build`, `node scripts/verify-links.js internal --no-build`, `npm run verifyIndexability`, and `node scripts/verify-capabilities.mjs`.

Review at 360px and 1280px. Exercise relay recovery to its runnable example, signed supplied-mail inspection, sending limits, guide-to-family navigation without the sidebar, old Features/Use cases bookmarks, and the first-email route. Check failover, DKIM and sending-limit searches for useful canonical-guide results.

Keep future additions in the shared inventory and focused guides. Module badges apply to the feature requiring the dependency; ordinary message construction, async sends and simple batches must not acquire optional-module requirements. Publishing is a separate action.

## Verification record

After the implementation review, the configured website check passed with 143 cases, along with TypeScript/template checks, the production build, internal links and indexability. Built coverage resolves all 66 catalogue entries and the 80 captured legacy fragments. All 17 family guides receive structural checks. The published 40-anchor baseline was independently re-fetched and matched the fixture.

Browser walkthroughs covered 360px/1280px layouts, the repaired Security/Configuration/Conversion sections, keyboard traversal, recovery to its demonstration, guide-to-family navigation without the sidebar, representative old bookmarks with query parameters, back navigation, and failover/DKIM/sending-limit search results. Catalogue and directory anchors now use one header offset. No-JavaScript fallbacks are covered by rendering checks. See the [follow-up review](capabilities-implementation-review-followup.md) for the remaining editorial recommendation and evidence limits. The implementation is local; no site deployment was performed.
