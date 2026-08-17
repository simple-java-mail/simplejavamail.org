# Capabilities reference

Route: `/features.html`
Role: be the complete, searchable map of the high-level outbound-email API
Primary audience: implementers checking whether and how a requirement is supported
Primary action: reach an exact example or adjacent configuration/security page

## Reader question

> Does the library handle this requirement, and where is the smallest correct example?

## Visible structure

### Hero: Features from compose to send

Short orientation plus local search/filter links. Preserve the legacy `navigation` anchor.

Follow the hero with quick-link cards for composing, attachments and embedded images, replies and forwards, address validation, and asynchronous or batch sending. Keep the exhaustive feature list in the table of contents.

The opening copy must establish that this is not only a friendlier `MimeMessage` API. Name the integrated capabilities: reusable message rules, DKIM, S/MIME, OpenPGP/MIME, diagnostics, conversion, authenticated SOCKS, batching, connection pools, and SMTP clusters. Distinguish features absent from Jakarta Mail itself from those that would otherwise require direct Session, MimeMessage, or Transport work.

### Compose messages

Preserve and reorganize existing material for:

- builder API and reusable `Mailer`;
- recipients and recipient builders;
- plain text, HTML, and iCalendar content;
- attachments and embedded images, including pre-encoded resources;
- headers, message ID, sent date, content-transfer encoding;
- replies, forwards, and copies;
- bounce address, delivery/read notifications, and DSN;
- validation and maximum message size.

### Configure sending

Concise wayfinding sections for:

- authentication and OAuth2;
- custom `Session`;
- raw Session properties;
- debug output routing;
- local bind address and SMTP client hostname;
- connection testing.

Detailed configuration belongs on `/configuration.html`; security-specific detail belongs on `/security.html`.

### Deliver one or many

- synchronous and asynchronous sending plus result handling;
- simple sequential batch;
- callback-scoped open connection;
- pooled batch module;
- keyed clusters and multiple pools;
- proxy support.

Clearly label which features are part of the main dependency and which require an optional module.

### Convert and inspect

- `Email` <-> `MimeMessage`;
- EML;
- Outlook `.msg` and conversion metadata;
- serialization;
- access to generated IDs, submission receipts, `Session`, and mailer configuration.

### Extend delivery

- custom sending logic for REST/provider delivery;
- custom SSL factory;
- direct Jakarta Mail properties and Session;
- lifecycle callbacks/async completion where available.

### Use content rendered by your template system

Preserve the existing `section-rendered-templates` anchor and place this near the end of the page, after custom sending logic and before maximum message size.

This is a useful application integration recipe, not a core Simple Java Mail capability. Keep it out of the opening quick links and the primary Compose summary.

Reader question:

> How do I use Thymeleaf, FreeMarker, or another template system with Simple Java Mail?

Lead with the render-then-build flow: the application renders its templates first, passes the completed plain-text and HTML strings to `withPlainText(...)` and `withHTMLText(...)`, and then builds and sends the `Email`.

Present this as a composition pattern, not as a built-in template-engine integration.

The section must:

- keep one short engine-neutral example showing both text and HTML alternatives;
- add compact, concrete Thymeleaf and FreeMarker examples using their real APIs rather than an invented shared renderer API;
- use the same model and message example so readers can compare only the rendering step;
- complete rendering before `buildEmail()`, keeping rendering failures separate from email building and SMTP delivery;
- state that Simple Java Mail does not select, configure, discover, or invoke the template engine;
- state that the application owns template lookup, locale, model validation, escaping, unescaped markup, and whether template authors are trusted;
- explain that Simple Java Mail accepts the resulting HTML as message content and does not sanitize it;
- link rendered `<img>` references to the existing embedded-image documentation instead of presenting resource resolution as a template integration;
- retain the explanation that the reply-builder `%s` placeholder only formats quoted original HTML and is not a general template API.

A short Spring note may show an application service receiving both a `Mailer` and its application-configured renderer. Do not imply that Simple Java Mail Spring Support discovers or configures template engines.

The concrete engines are examples, not an endorsement or compatibility matrix. Do not add template-engine dependencies, version promises, a renderer SPI, delayed rendering, or engine-specific Simple Java Mail modules.

### Grand example appendix

Retain a complete, feature-rich example as a clearly labeled appendix. Break it into logical annotated regions and keep it out of the main reading path.

## Legacy anchor commitments

Preserve every current section ID, including:

- `section-basic-usage`
- `section-rendered-templates`
- `authentication`
- all existing IDs for builder APIs, batch/clustering, custom Session, encodings, IDs/dates/receipts, transport examples, resources, headers/properties/debug, binding/hostname, iCalendar, delivery notifications/DSN, validation, conversion, bounce/reply/forward, proxy, connection tests, serialization, custom sending, and maximum size.

When headings move, compatibility anchors remain before the new heading.

## Content pattern per capability

1. **Use it when:** one sentence.
2. **API:** smallest correct code or property fragment.
3. **Behavior:** defaults and important result/failure semantics.
4. **Requires:** main dependency or optional module.
5. **Related:** configuration/security/diagnostics link.

## Metadata intent

Title: `Simple Java Mail capabilities: compose, secure, deliver, and diagnose`
Description: `Explore Simple Java Mail's complete outbound-email API: rich MIME, recipient policy, async and batch delivery, proxies, receipts, conversion, validation, and extension points.`

## Rationale

The features already exist, but the current page reads like a chronological accumulation. Grouping them by task and using a consistent pattern makes uncommon features easier to find without making common tasks intimidating.

## Watch-items

- Do not duplicate full security or configuration guides here.
- Keep project planning and the public roadmap on `/contact.html`, not in the capability reference.
- Identify optional-module requirements before the code sample.
- Keep examples current with version 9 recipient builders.
- Do not describe template engines as supported integrations; describe the render-then-build contract.
- Preserve all existing anchors even if an old label is retired.
