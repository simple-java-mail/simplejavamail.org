# Homepage

Route: `/` and `/index.html`
Role: establish the easy path and reveal the depth behind it
Primary audience: every new visitor
Primary action: get the Maven dependency and send a first email
Secondary action: see what the library can handle as requirements grow

The [implemented discovery structure](capabilities-discovery.md) defines the shared capability summary and replaces the older independent maps.

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
- **See what it handles** -> `#start-small`

The right pane contains the canonical short sample. It is a real example, no candy-domain joke and no exhaustive grand configuration. Beneath the Java lines, a compact receipt reads `250 2.0.0 queued` to establish the transport motif.

### Proof strip

Visible factual items:

- current release and release date;
- Java 11+;
- Apache-2.0;
- built against the Jakarta Mail API, with Angus included by default;
- active source and releases on GitHub.

No vanity counters or unsourced adoption numbers.

### Start small without starting over

Open with the bold sentence introducing the journey from a first announcement to a shared mail service. The six stages cover signed campaigns, sending limits, bounce handling, retries, separate capacity for urgent mail and a backup relay. The final stage shows a billing workflow matching a delivery report to the send that produced it.

Each borderless row pairs one stage of the story with its API calls and a compact Captain Simple Java Mail panel. The panel opens the full-size artwork in the shared image viewer. On narrow screens, the panel and calls sit directly below their paragraph. Link selected terms to their guides or tactical examples and close with the runnable mail feedback pattern.

### What it handles

Preserve `delivery-route` as the homepage summary anchor. Render the seven families and selected feature links from the capability registry. Family headings link to their main guide and the features link to their specific guidance. Finish with one All capabilities link to the catalogue.

Keep this summary outside the search index. It introduces the breadth, including recovery, observability and supplied-message inspection, without a numbered learning sequence.

### Less common, still supported

Two side-by-side technical explanations:

- **Multiple SMTP clusters:** give different workloads their own connection pools, SMTP servers, limits, and load-balancing rules.
- **Authenticated SOCKS:** connect through a SOCKS proxy with credentials even though Jakarta Mail does not expose that path directly.

The section explains who needs each capability and links to exact anchors. It does not claim every application should use them.

### Compare your options

Brief comparison framing:

> Jakarta Mail gives you the protocol and message foundation. Spring Mail adds Spring's standard sender contract. Commons Email shortens some basic message code. Simple Java Mail builds well-formed MIME and adds reusable message rules, DKIM, S/MIME, OpenPGP/MIME, diagnostics, conversion, authenticated SOCKS, and batched, pooled, or clustered delivery.

Action: **Compare the approaches** -> `/feature-matrix.html`.

### Documentation access

Use the shared summary, primary Docs menu and footer for navigation. Do not maintain another feature grid. Keep the first-email and All capabilities actions clear.

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
- Version and release date must come from Eleventy's global site data.
- The acceptance receipt must be clearly illustrative, not a claim that delivery to the recipient is guaranteed.
