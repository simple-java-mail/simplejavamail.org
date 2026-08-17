# Homepage

Route: `/` and `/index.html`
Role: establish the easy path and reveal the depth behind it
Primary audience: every new visitor
Primary action: get the Maven dependency and send a first email
Secondary action: see what the library can handle as requirements grow

## Reader question

> Can I use this quickly now, and will I regret the choice when the requirements become real?

## Visible structure

### Header

Compact product mark, primary navigation, GitHub utility link, and **Get started** action. Navigation is visible before the hero and remains available while reading.

### Hero: Simple to use. Built for the real world.

Lede:

> Send a well-formed email with a small fluent API. If you later need DKIM, S/MIME, OpenPGP/MIME, proxies, batch sending, or multiple SMTP clusters, you keep using the same builders and mailer.

Actions:

- **Send your first email** -> `/download.html`
- **See what it handles** -> `#delivery-route`

The right pane contains the canonical short sample. It is a real example, no candy-domain joke and no exhaustive grand configuration. Beneath the Java lines, a compact receipt reads `250 2.0.0 queued` to establish the transport motif.

### Proof strip

Visible factual items:

- current release and release date;
- Java 8+;
- Apache-2.0;
- built against the Jakarta Mail API, with Angus included by default;
- active source and releases on GitHub.

No vanity counters or unsourced adoption numbers.

### From first draft to SMTP hand-off

Anchor: `delivery-route`

Six connected stages:

1. Compose: readable messages, not MIME trees.
2. Configure: set up one reusable mailer.
3. Protect: transport security, DKIM, S/MIME, and OpenPGP/MIME.
4. Deliver: one send, open connection, pool, or cluster.
5. Diagnose: test, inspect, log, and collect receipts.
6. Extend: modules, conversion, CLI, and Jakarta Mail escape hatches.

Each stage gets one sentence and one exact reference link. The route is a map, not six equal marketing cards.

### Start small without starting over

Left: the first-email path, from dependency to email builder, mailer builder, and send.
Right: a progression showing how a requirement is added without changing the mental model: TLS -> DKIM default -> async delivery -> connection reuse.

The copy explicitly says that optional complexity stays optional.

### The difficult parts are already there

Three substantial capability rows, not a wall of badges:

- **Messages and recipient rules:** rich MIME, calendars, attachments, validation, defaults, overrides, and per-recipient S/MIME certificates.
- **Security with a usable API:** OAuth2, transport strategies, trusted hosts, DKIM, S/MIME and OpenPGP/MIME signing/encryption, and CRLF protection.
- **Sending you can see and control:** async results, connection tests, debug routing, receipts, local binding, open connections, batch pools, and clusters.

Each row pairs a short task statement with a small code/config fragment and routes to the relevant reference page.

### Less common, still supported

Two side-by-side technical explanations:

- **Multiple SMTP clusters:** give different workloads their own connection pools, SMTP servers, limits, and load-balancing rules.
- **Authenticated SOCKS:** connect through a SOCKS proxy with credentials even though Jakarta Mail does not expose that path directly.

The section explains who needs each capability and links to exact anchors. It does not claim every application should use them.

### Compare your options

Brief comparison framing:

> Jakarta Mail gives you the protocol and message foundation. Spring Mail adds Spring's standard sender contract. Commons Email shortens some basic message code. Simple Java Mail builds well-formed MIME and adds reusable message rules, DKIM, S/MIME, OpenPGP/MIME, diagnostics, conversion, authenticated SOCKS, and batched, pooled, or clustered delivery.

Action: **Compare the approaches** -> `/feature-matrix.html`.

### Documentation wayfinding

Four task routes:

- Build messages -> capabilities
- Configure an application -> configuration
- Secure mail -> security
- Diagnose delivery -> diagnostics

Secondary links cover modules, CLI, MIME/interoperability, and migrations.

### Final get-started band

Show the Maven coordinate and one copy action. Repeat **Get started**, then offer Javadocs for readers who already know what they need.

### Footer

Docs, project, release, legal/license, and maintainer routes. No newsletter, sales contact, pricing, or product-led-growth content.

The short product summary must cover both sides of the library: well-formed email through one API, plus integrated DKIM, S/MIME, OpenPGP/MIME, proxies, batches, pools, and clusters when needed. Do not reduce the site-wide footer to Jakarta Mail plumbing alone.

## Metadata intent

Title: `Simple Java Mail: Build, secure, and send email from Java`
Description: `Send email from Java with a small fluent API and built-in support for security, shared configuration, diagnostics, conversion, batching, clusters, and proxies.`

## Rationale

The current site leads with personality and a large example but makes readers work to find the features needed in a serious system. This sequence keeps the friendly first send, then introduces the harder requirements in plain language.

## Watch-items

- Keep the hero below roughly 720px on a typical laptop viewport.
- Do not put the grand example on the homepage.
- Do not turn the lifecycle into generic feature cards.
- Keep OpenPGP beside DKIM and S/MIME in existing security lists. Do not create a dedicated homepage feature band for it.
- Version and release date must be manifest-driven.
- The acceptance receipt must be clearly illustrative, not a claim that delivery to the recipient is guaranteed.
