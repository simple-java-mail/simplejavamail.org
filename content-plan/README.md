# Simple Java Mail website content plan

Status: canonical plan for the website relaunch
Last synced: 2026-08-05
Direction: start simple, stay production-ready
Modernization: full visual and structural redesign on the upgraded static-site stack

This plan leads; the templates follow. Changes to the public story, route hierarchy, visible section order, or claims are made here before they are made in HTML.

## Brief

Simple Java Mail is a mature open-source Java library that removes Sun JavaMail / Jakarta Mail plumbing from application code. Its clean API is not limited to simple messages: it also covers MIME composition, recipient rules, DKIM and S/MIME, transport security, shared configuration, diagnostics, proxies, conversion, connection reuse, batch work, and clustered SMTP pools.

The website should make that depth legible without becoming commercial. It does not sell an edition, a service, or an enterprise upgrade. It helps developers:

1. send a correct first email quickly;
2. understand why the high-level API remains useful when requirements become difficult;
3. discover uncommon capabilities before they build them themselves;
4. find accurate reference material when they are implementing or operating email.

## Subject, audiences, and homepage job

**Subject:** a high-level outbound-email library for Java that keeps routine code small and difficult mail requirements manageable.

**Primary audiences:**

- A Java developer who needs to send an email today and wants a safe, obvious API.
- A team currently using Jakarta Mail, Spring Mail, or another convenience wrapper and comparing how much each library handles for them.
- A platform or backend engineer responsible for transport policy, signing, encryption, throughput, proxies, diagnostics, or multiple SMTP targets.
- A maintainer who needs conversion, extension points, configuration layering, migration guidance, or a CLI.

**The homepage has one job:** show a small first send immediately, then make clear that the same library still works when the requirements become difficult.

## Canonical narrative

The public story is a lifecycle, not a sales funnel:

> Compose -> Configure -> Protect -> Deliver -> Diagnose -> Extend

1. **Compose** — addresses, text and HTML, attachments, embedded images, calendars, replies, forwards, and MIME without constructing `MimeMessage` trees.
2. **Configure** — reusable mailers, properties, Spring integration, defaults, overrides, validation, custom sessions, and lower-level escape hatches.
3. **Protect** — SMTP transport strategies, OAuth2, DKIM, S/MIME, CRLF protection, trusted hosts, identity verification, and custom TLS behavior.
4. **Deliver** — synchronous and asynchronous sends, open-connection batches, connection pools, multiple clusters, load balancing, local bind addresses, and authenticated SOCKS.
5. **Diagnose** — connection tests, structured failures, Jakarta Mail debug routing, logging-only mode, submission and delivery receipts, inspectable configuration, and validation.
6. **Extend** — custom sending logic, EML and Outlook conversion, CLI use, optional modules, OSGi/Karaf, and direct Jakarta Mail access when required.

The short formulation used across the site is:

> Simple at the call site. Serious everywhere else.

Supporting line:

> Start with one fluent send. Keep the same API when email becomes a security, configuration, or delivery problem.

## Message hierarchy

1. **Immediate value:** readable code that sends an email without Jakarta Mail plumbing.
2. **No starting over:** advanced features use the same builders and `Mailer` API.
3. **The difficult work is included:** security, recipient rules, pools, clusters, diagnostics, and conversion.
4. **Uncommon capabilities:** authenticated SOCKS and keyed multi-cluster connection pools are discoverable, explained, and linked to reference material.
5. **Maturity:** active releases, long public history, Java 8 compatibility, Apache-2.0 licensing, modular artifacts, migrations, tests, and escape hatches.

## Tone and language

The voice is experienced, direct, and generous. It explains trade-offs without insulting lower-level APIs or other open-source projects.

- Prefer concrete nouns and verbs: compose, sign, encrypt, reuse, route, inspect, convert.
- Lead with a developer task, then name the capability that handles it.
- Speak to the developer. Prefer “what the library handles” and “what your code still has to do” over “boundary,” “model,” “application-owned,” and other planning language.
- Avoid stacked abstract nouns such as “operational capability boundary.” Use the real feature: pooled sending, shared defaults, server replies, or a Spring-configured mailer.
- Show code or a configuration fact wherever it proves the point more clearly than an adjective.
- Use **production-ready** for the nature of the work, not **enterprise** as a vague badge.
- Use **high-level API over Jakarta Mail / Angus Mail**, not **replacement for all of Jakarta Mail**.
- Use **outbound email** when scope matters. Jakarta Mail also covers mailbox access protocols that Simple Java Mail does not try to replace.
- Use **mature**, **actively maintained**, and version/date evidence. Do not use **battle-tested**, **best**, or **only** without a narrowly provable scope.
- Say other libraries make different abstraction choices. Do not call them dead ends, half-hearted, underdeveloped, or abandoned.

## Marketing claim standard

Every prominent claim must be one of:

- visible in a current public API or module;
- supported by current release metadata;
- framed as a concrete difference in what the API handles rather than an unverifiable superiority claim.

Specific limits:

- Simple Java Mail delegates SMTP and MIME mechanics to Angus Mail and the Jakarta Mail API. Its value is the usable API and the sending features built around that foundation.
- Do not claim feature parity with every Jakarta Mail protocol. State that the library covers production outbound mail while retaining Jakarta Mail escape hatches.
- Spring's mail support includes `JavaMailSender` and helpers. Compare its thinner abstraction and Spring integration role; do not claim that it has no convenience API.
- Apache Commons Email is a narrower convenience layer. Avoid claims about project health or release cadence unless the page is updated from authoritative current sources.
- Authenticated SOCKS and multi-cluster pools are rare differentiators. Prefer **built-in support for** or **uncommon in Java mail libraries** over an absolute **the only library** claim.

## Vocabulary

| Use | Avoid | Reason |
| --- | --- | --- |
| high-level outbound-email library | Jakarta Mail wrapper | describes the value, not just the dependency |
| production requirements | enterprise requirements | precise without pretending this is a commercial tier |
| Jakarta Mail plumbing | Jakarta Mail nonsense | critical but respectful |
| mailer | SMTP client singleton | matches the public API and supports more than a singleton model |
| recipient rules | recipient governance / recipient tricks | plainly covers defaults, overrides, validation, and routing |
| pools and clusters | delivery topology / enterprise clustering | names the actual feature without sales or architecture language |
| reference documentation | feature dump | supports scanning and task completion |
| compare approaches | feature winner | encourages an accurate technical choice |

## Information architecture

The public site uses a small orientation layer and preserves the existing reference routes.

### Primary navigation

- **Why Simple Java Mail** -> `/why-simple-java-mail.html`
- **Capabilities** -> `/features.html`
- **Docs** -> `/docs.html`
- **Compare** -> `/feature-matrix.html`
- **GitHub** -> repository
- **Get started** -> `/download.html`

### Route plan

| Route | Public label | Role | Action |
| --- | --- | --- | --- |
| `/` and `/index.html` | Home | Minimal send plus depth reveal | rebuild |
| `/why-simple-java-mail.html` | Why Simple Java Mail | Explain what the library handles and why | add |
| `/docs.html` | Documentation | Task-oriented wayfinding | add |
| `/features.html` | Capabilities | Complete capability reference | restructure; preserve anchors |
| `/configuration.html` | Configuration | Builder, property, Spring, recipient-rule, and pool reference | restructure; preserve anchors |
| `/security.html` | Security | Transport, signing, encryption, and injection protection | restructure; preserve anchors |
| `/debugging.html` | Diagnostics | Test, inspect, log, route, and recover | restructure; preserve anchors |
| `/modules.html` | Modules | Explain what each optional artifact adds | rebuild |
| `/cli.html` | CLI | Command-line usage and generated command model | restyle; preserve anchors |
| `/rfc-compliant.html` | MIME and interoperability | Explain MIME strategy, compliance, and message exploration | rename visibly; preserve route/anchors |
| `/feature-matrix.html` | Compare approaches | Help readers choose the right abstraction level | rewrite completely |
| `/download.html` | Get started | Install, send, and choose optional modules | rewrite completely |
| `/migration-notes.html` | Migration notes | Version chooser | restyle |
| `/migration-notes-5.0.0.html` | 5.0 migration | Historical migration reference | preserve |
| `/migration-notes-6.0.0.html` | 6.0 migration | Historical migration reference | preserve |
| `/migration-notes-7.0.0.html` | 7.0 migration | Historical migration reference | preserve |
| `/migration-notes-9.0.0.html` | 9.0 migration | Current major migration reference | preserve and foreground |
| `/contact.html` | Help and contribute | Route support, bugs, security, and contributions | rewrite |
| `/redirect.html` | Redirect helper | Existing compatibility behavior | preserve if still required |

No existing `.html` route is removed in this redesign. Existing heading IDs remain available even when the visual hierarchy changes.

## Orientation-to-reference flow

```tex
Home
 |-- first email ------------------------> Get started
 |-- why the abstraction matters -------> Why Simple Java Mail
 |-- production requirement ------------> Capabilities
 |-- evaluate another approach ----------> Compare approaches
 `-- implement / troubleshoot -----------> Docs hub
                                               |
                          +--------------------+-------------------+
                          |                    |                   |
                   Configuration           Security          Diagnostics
                          |                    |                   |
                          +---------- Modules / CLI / MIME --------+
```

## Visual direction

### Concept

**The message route.** The design borrows from SMTP routing diagrams and delivery traces: a fine route line, compact stage labels, code as primary evidence, and strong horizontal rules. It should feel like technical documentation with a memorable transport motif, not a SaaS landing page.

### Palette

| Token | Hex | Use |
| --- | --- | --- |
| Paper | `#F6F7F3` | primary canvas |
| White | `#FFFFFF` | code and raised reading surfaces |
| Ink | `#13212B` | headings, dark bands, primary text |
| Steel | `#5B6872` | secondary text and quiet metadata |
| Route teal | `#087E8B` | links, active route, focus, capability markers |
| Receipt amber | `#E49A24` | delivery acknowledgements and rare emphasis |

Teal must pass contrast requirements wherever it carries text. Amber is a signal color, not a body-text color.

### Type roles

- **IBM Plex Sans:** interface, headings, and prose. It is technical without becoming cold and remains readable in long reference pages.
- **IBM Plex Mono:** code, route stages, versions, labels, and small metadata.
- Heading scale is assertive but bounded. The hero must leave useful content visible below the fold on a common laptop viewport.

### Layout

- A compact sticky header replaces the current hero-first navigation.
- Marketing pages use ruled full-width bands with a centered 1180px working area.
- Reference pages use a searchable left rail and a 760px reading column, with optional right-side local table of contents on wide screens.
- Cards are reserved for real choices or distinct modules. Most grouping uses whitespace, rules, and typographic hierarchy.
- Code samples are copyable, keyboard accessible, horizontally scrollable, and never decorative wallpaper.

### Homepage wireframe

```tex
+------------------------------------------------------------------+
| SJM wordmark        Why  Capabilities  Docs  Compare    Get started|
+------------------------------------------------------------------+
|  SIMPLE AT THE CALL SITE.       |  Email email = ...              |
|  SERIOUS EVERYWHERE ELSE.       |  mailer.sendMail(email);        |
|  Short explanatory line        |  [copy]                          |
|  [Get started] [See the depth]  |  route: composed -> accepted    |
+---------------------------------+--------------------------------+
|  vX.Y.Z     Java 8+     Apache-2.0     built on Angus/Jakarta Mail|
+------------------------------------------------------------------+
|  01 Compose -- 02 Configure -- 03 Protect -- 04 Deliver ...      |
|     one continuous route line connects the six stages             |
+------------------------------------------------------------------+
|  The easy path                    The abstraction does not stop    |
|  minimal code + explanation       when email gets difficult       |
+------------------------------------------------------------------+
|  Rare requirements, built in                                    |
|  Multi-cluster SMTP pools        Authenticated SOCKS              |
+------------------------------------------------------------------+
|  Capability index / documentation routes                          |
+------------------------------------------------------------------+
|  Install dependency + first-send CTA                              |
+------------------------------------------------------------------+
```

### Signature element

A single **delivery route** runs through the homepage lifecycle. It begins beside the first code sample and connects the six capability stages. A small `250 accepted` receipt belongs to the Deliver stage; the route then continues to diagnostics and extension points. On mobile it becomes a vertical left rail. Motion, if used, only advances the route once and is disabled under `prefers-reduced-motion`.

### Deliberate aesthetic risk

The hero pairs a restrained editorial statement with a compact SMTP receipt rather than an illustration. The code pane ends with a literal acceptance line such as `250 2.0.0 queued`, making infrastructure part of the visual identity. This is unusual for a library homepage but truthful to the subject.

### Design self-critique and resolution

- A generic lifecycle could resemble any developer tool. SMTP verbs, real API code, and the acceptance receipt make it specific to mail delivery.
- Dark technical interfaces can imply complexity. The main canvas stays warm and light; dark surfaces are limited to code and one proof band.
- A route motif could become decoration. It only appears where it communicates progress or links lifecycle stages.
- Too much enterprise language would contradict the project. The design signals seriousness through precision, density control, and evidence rather than corporate imagery or lead-generation patterns.

## Shared content components

- **First-send sample:** one canonical `EmailBuilder` plus `MailerBuilder` example, reused verbatim where appropriate.
- **Depth sample:** one short configuration progression, never the existing everything-at-once grand example on the homepage.
- **Capability route:** the six lifecycle stages and their canonical links.
- **Proof strip:** current version, Java baseline, license, current release date, and Angus/Jakarta foundation; sourced from the manifest.
- **Requirement callout:** task, built-in mechanism, optional module if any, and reference link.
- **Code tabs:** Java builder, properties, Spring only when all three genuinely apply.
- **Next step:** every reference page ends with one adjacent task and one route back to the docs hub.

## Trust information

Trust content stays factual and lightweight:

- current version and release date;
- Java runtime baseline and Jakarta/Angus relationship;
- Apache-2.0 license;
- Maven Central, Javadocs, source, issues, and release links;
- supported migration pages;
- a security-reporting route only if the repository publishes one.

The relaunch does not invent support SLAs, compatibility promises, a vulnerability process, or a release policy. If those are formalized later, the site can surface them.

## Search, metadata, and accessibility

- Pagefind indexes reference content locally; no third-party hosted search.
- Each page has a unique title, description, canonical URL, and Open Graph metadata.
- Organization/software structured data uses current factual values from the manifest.
- Navigation, mobile menus, docs sidebars, copy buttons, and code tabs work with keyboard and assistive technology.
- Focus is always visible. Color never carries state alone. Reduced motion is respected.
- The favicon is a real SVG asset and the social image is explicit rather than an empty placeholder.

## Locked decisions

- The site is educational and adoption-oriented, not commercial.
- The main message is ease of use plus difficult features; neither half appears without the other.
- There is no separate enterprise story or edition.
- Existing documentation URLs and anchor IDs remain valid.
- Comparison is accurate and respectful; it shows what each API handles.
- Jakarta Mail is named as the lower-level foundation, not misrepresented as obsolete or useless.
- The upgraded AtlasArc build architecture is reused, but Simple Java Mail receives its own visual identity and navigation pattern.
- Planning files are source material only and are never copied into `dist/`.

## Pre-ship content checklist

- [ ] The homepage shows a runnable first send before any long explanation.
- [ ] The homepage reveals security, pools, clusters, and diagnostics without an enormous feature dump.
- [ ] Authenticated SOCKS and multi-cluster pools are explained in plain language and linked to exact docs.
- [ ] Every capability claim maps to current code or a current module.
- [ ] No page implies coverage of IMAP/POP or all Jakarta Mail protocols.
- [ ] No competitor is described with a stale maintenance claim or dismissive language.
- [ ] The current version is sourced once and rendered consistently.
- [ ] Existing routes and deep links pass the link checker.
- [ ] Long reference pages have search, local navigation, copyable code, and useful next steps.
- [ ] The site still feels welcoming to a developer with a one-email problem.
