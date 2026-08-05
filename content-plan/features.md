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

### Grand example appendix

Retain a complete, feature-rich example as a clearly labeled appendix. Break it into logical annotated regions and keep it out of the main reading path.

## Legacy anchor commitments

Preserve every current section ID, including:

- `section-basic-usage`
- `authentication`
- all existing IDs for builder APIs, batch/clustering, custom Session, encodings, IDs/dates/receipts, transport examples, resources, headers/properties/debug, binding/hostname, iCalendar, delivery notifications/DSN, validation, conversion, bounce/reply/forward, proxy, connection tests, serialization, custom sending, and maximum size.

When headings move, compatibility anchors remain before the new heading.

## Content pattern per capability

1. **Use it when** — one sentence.
2. **API** — smallest correct code or property fragment.
3. **Behavior** — defaults and important result/failure semantics.
4. **Requires** — main dependency or optional module.
5. **Related** — configuration/security/diagnostics link.

## Metadata intent

Title: `Simple Java Mail capabilities — compose, secure, deliver, and diagnose`
Description: `Explore Simple Java Mail's complete outbound-email API: rich MIME, recipient policy, async and batch delivery, proxies, receipts, conversion, validation, and extension points.`

## Rationale

The features already exist, but the current page reads like a chronological accumulation. Grouping them by task and using a consistent pattern makes uncommon features easier to find without making common tasks intimidating.

## Watch-items

- Do not duplicate full security or configuration guides here.
- Keep project planning and the public roadmap on `/contact.html`, not in the capability reference.
- Identify optional-module requirements before the code sample.
- Keep examples current with version 9 recipient builders.
- Preserve all existing anchors even if an old label is retired.
