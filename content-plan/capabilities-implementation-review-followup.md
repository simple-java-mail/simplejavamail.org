# Capabilities implementation: repairs and holistic review

Date: 2026-11-14
Status: repaired and verified locally; ready for maintainer discussion
References: [agreed structure](capabilities-discovery.md), [original Claude review](capabilities-implementation-claude-review.md)

## Assessment

Keep the seven-family discovery structure. Capabilities now gives readers a short, visible inventory; each feature opens the relevant guide section, and runnable examples are available beside the features they demonstrate. The catalogue contains 66 entries in about 1,225 words. More detailed guidance belongs in the task guides.

The repaired implementation has no further structural blocker in the reviewed scope. Desktop and mobile walkthroughs support the intended path from discovery to implementation and back. This is a maintainer review, not evidence from a usability study.

The subsequent approved copy pass has revised Configuration, Security and conversion guidance as current documentation. Repeated explanations are consolidated, received-mail details are grouped by topic, and version comparisons belong in the migration notes. Building emails remains outside this follow-up's copy scope.

## Current-documentation copy pass

Completed locally on 2026-11-14:

- Configuration uses task headings and current behavior, with a single proxy/bridge explanation, clearer configuration timing and plainer Session/custom-sending guidance.
- Security presents signature statuses in a table and consolidates key-material, certificate, protection and inspection instructions. Required inputs, failure timing, module requirements and trust limits remain documented.
- Conversion groups stream ownership, resources/CID matching, MIME bodies, headers, dates and optional metadata under topic headings. The structural contracts now protect their order and heading ownership.
- Existing migration entries retain the before/after comparisons for configuration, proxies, TLS, key inputs, dates, inline resources and missing Outlook senders. A new serialized-email-compatibility section collects older serialized-form limitations and the actions needed when restoring stored Emails.

All 134 code blocks and all 104 original anchors across the three guides are retained. An independent comparison also checks that every original inline code example remains somewhere in its guide; this caught and restored the literal-filename/CID distinction during editing. Migration-note code examples and existing anchors are preserved too.

Excluding code blocks, the three source guides contain about 1,770 fewer whitespace-separated words. This is a content inventory, not a readability score or a word-count target. Detailed behavior remains where readers need it, while repeated release framing is removed.

The website check passes all 143 cases, including the expanded structural contracts; the production build, 6,546 internal links and indexability checks pass. The preservation inventory, screenshots and check logs are in .local/current-docs-copy-pass-20261114/.

Rendered walkthroughs covered all three guides at 1280px and 360px, the new conversion topic headings, Configuration contents/section landings, the signature-status table, and the snapshot migration link with Back navigation. The new table has a narrow scoped style so its two columns fit a phone screen without sideways scrolling. Code examples retain their existing horizontal scrolling where needed.

## Claude findings

| Finding | Repair and verification |
| --- | --- |
| P1: Gmail and existing-MIME protection bodies inside the Security contents list, with orphan links at EOF | Moved both bodies into their authentication/S/MIME sections and their links into the real contents list. Rendered destination checks reject targets inside contents, navigation, code or fallback markup. Browser bookmarks land at the repaired headings. |
| P2a: protected-content receive inputs inside the first conversion column | Added the top-level `section-receive-protected-content` after source inspection and before received-mail details. Added its contents entry and dependency links. Order and H2 contracts cover it. |
| P2b: missing Outlook module badge | Restored the badge on the Outlook heading. A regression check requires it on that heading, and it remains visible at 360px. |
| P2c: supplied Session incorrectly reparents other settings; malformed Configuration intro and late contents | Repaired intro containers, moved contents before the API reference, promoted other settings to H2, and placed supplied Session beside raw Session properties. Heading ownership/order contracts cover the repaired relationships. |
| P2d: missing debug logger and batch cleanup facts | Restored `org.simplejavamail.javamail.debug` in Diagnostics and the acquired-transport cleanup/suppressed-failure behavior in Sending and execution. Checked the logger against its Java definition. |
| P3: contents order differs from body order | Reordered Security, Configuration, Diagnostics, Execution and Results contents; the broader check also found and corrected Spring and CLI ordering. Every family guide now receives the ordering check. |
| P3: proxy introduction separated from bridge guidance | Moved it beside the proxy bridge subsection. The heading contract keeps bridge settings under proxies. |
| P3: no-JavaScript links precede the catalogue heading | Moved the fallback below the catalogue and preserved its targets. Rendering tests cover its order and current mapping. |
| P3: compatibility styling and stale feature-reference wording | Added the Use cases stylesheet and updated the Why handoff. |
| P3: recipient-validation and pools/clusters labels overstate destinations | Split recipient builders from address validation, and pools from clusters. Each has its own direct destination. |
| Optional: static legacy-map import can go stale during development | Compatibility rendering now receives current Eleventy data. A test changes the input mapping and checks the resulting aliases. |
| Optional: double header offset | Removed the second header-height allowance from catalogue/directory groups. Browser landings put the groups about 33–35px below the 68px header. |
| Optional: catalogue omissions and repeated accessible names | Added message-size limits, local SMTP address, and reading S/MIME/OpenPGP content; made every Full guide accessible name identify its family. |

## Additional findings from this review

- The stricter contents rule found a failover/MIME paragraph inside the MIME guide's contents box. It now sits with the explanation of message preparation.
- The Gmail example still offered port 25 and ordinary-password wording. It now shows the documented 587/STARTTLS and 465/TLS routes, explains the app-password example, and links to OAuth2 guidance. Sources: [Google SMTP documentation](https://developers.google.com/workspace/gmail/imap/imap-smtp) and [Google app-password help](https://support.google.com/accounts/answer/185833?hl=en).
- The transport contents omitted SMTPS OAuth2 and used stale section labels; those now match the relevant headings. The text no longer claims there are four strategies while showing five.
- Removed current-guide claims that 10.0.0 is unreleased, matching the agreed release presentation. Kept the historical warning about earlier unreleased serialized snapshots.
- Moved the expired-certificate/failover aside beside server-identity guidance and removed the adjacent duplicated one-Mailer-per-Session reminder.

## Regression coverage

`src/_lib/documentation-structure.mjs` parses rendered HTML with `htmlparser2`, already present in the dependency tree and now declared directly. `tests/fixtures/guide-structure-contracts.json` records the important moved sections' order, heading levels/parents, contents placement and module requirements.

The tests render all 17 family guides with their real partials and helpers. Adversarial fixtures cover content hidden inside contents boxes (with and without code), list bodies and orphan items, duplicate IDs, fallback/navigation/code targets, wrong heading parents, reordered/late contents, misplaced badges, and stale root/absolute/encoded Features links. Sidebar and dropdown tests check the shared family order and guide destinations. The build verifier checks feature, module, demonstration, family and legacy destinations in actual output, rather than accepting any matching ID string.

The stronger verifier was run against the pre-repair build and rejected the Security, Configuration, heading/badge and ordering defects. The resulting failure log is `.local/capabilities-review-fixes-20261114/structure-before-fixes.log`.

## Verification

- `npm run check`: 143 tests, all passing; TypeScript and Eleventy dry-run also pass.
- `npm run build`: passes, including Pagefind and the structural destination gate for 66 entries and 80 captured legacy fragments.
- Internal links: 6,553 local links across 85 production pages, all passing.
- Indexability: 53 production sitemap pages with matching canonicals; compatibility and 404 pages remain excluded.
- Published baseline: re-fetched the published Features content anchors and confirmed the 40-anchor fixture matches. The union with checkout anchors remains 80.
- Browser: 1280px and 360px layouts; repaired Gmail and existing-MIME destinations; Configuration contents and supplied Session placement; conversion order and Outlook badge; guide-to-family return without a sidebar; keyboard access to catalogue items and the Docs dropdown; family anchors; first-email route; recovery-to-example handoff; old Features/Use cases bookmarks with query retention and Back; failover, DKIM and sending-limit searches with direct canonical subsection navigation.

Screenshots and check logs are in `.local/capabilities-review-fixes-20261114/`. The no-JavaScript fallback was checked through rendered-markup tests, not a browser session with JavaScript disabled. The runnable example handoff was exercised; Docker applications and Java behavior were not re-tested for these website changes. External links were not exhaustively checked. Nothing was committed or published by this repair pass.
