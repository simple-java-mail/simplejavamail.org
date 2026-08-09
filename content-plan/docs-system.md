# Documentation system

Routes: `/docs.html` plus all existing reference routes
Role: provide task-oriented wayfinding and a consistent long-form reading system
Primary audience: implementers and operators
Primary action: reach the exact reference section needed

## Docs hub: `/docs.html`

### Hero: Documentation

Search is the first utility, followed by a short sentence explaining that the guides start with what the developer wants to do.

The hub, Get started, and Why Simple Java Mail use the same grouped left navigation as the reference pages, so the whole Start section moves naturally into the deeper documentation.

### Start here

- First email -> `/download.html#first-email`
- Why the library exists -> `/why-simple-java-mail.html`
- Upgrade to 9.x -> `/migration-notes-9.0.0.html`

### Browse by task

Use the six canonical stages:

- Compose -> features: content, recipients, replies/forwards, conversion
- Configure -> configuration: builders, properties, Spring, shared defaults and overrides
- Protect -> security: TLS, OAuth2, DKIM, S/MIME, CRLF
- Deliver -> features/configuration: async, open connection, batch, pools, clusters, proxies
- Diagnose -> debugging: tests, logs, receipts, validation, inspection
- Extend -> modules, CLI, RFC/MIME, custom sending

### Browse every reference

Flat list with a short description and content length/complexity hint where helpful. Avoid a grid of vague cards.

### Need help or found a bug?

Route to `/contact.html` with distinct links for usage questions, defects, feature requests, and sensitive security reports if a public security route exists.

## Reference-page chrome

All long reference routes share:

- compact global header;
- breadcrumbs;
- Pagefind search;
- grouped docs sidebar;
- on-page table of contents generated from planned headings;
- code copy buttons;
- previous/next task links;
- “Edit / report a docs issue” source link where a stable repository URL is available.

### Sidebar groups

The global **Docs** item opens a compact flyout on hover or keyboard focus. It mirrors the first page of **Start**, **Build and configure**, **Protect and operate**, and **Integrate and understand**, then ends with a direct **Help and contribute** link. Keep the rest of **Maintain** in the full docs navigation rather than the flyout.

**Start**

- Documentation
- Get started
- Why Simple Java Mail

**Build and configure**

- Capabilities
- Configuration
- Modules

**Protect and operate**

- Security
- Diagnostics

**Integrate and understand**

- CLI
- MIME and interoperability
- Compare approaches

**Maintain**

- Migration notes
- Help and contribute

## Content conventions

- Every major section begins with the developer task and ends with the exact API/configuration reference.
- Each code block identifies language and context.
- Long “grand examples” may remain as reference appendices, never as the only explanation.
- Examples use one neutral address family consistently (`sender@example.org`, `recipient@example.net`) unless a protocol case requires otherwise.
- Warnings distinguish security risk, delivery behavior, compatibility, and optional-module requirements.
- API names and property keys use exact casing and monospace styling.

## Search plan

Pagefind indexes visible reference prose and headings. It excludes global navigation, footer, repeated sidebars, and code-copy controls. Search result excerpts should contain the task description, not repeated chrome.

## URL and anchor compatibility

- Existing `.html` routes remain canonical for this release.
- Existing IDs are preserved as the visible heading ID or an invisible compatibility anchor immediately before the renamed section.
- The link checker validates both the generated manifest and all internal fragments.
- Migration pages remain directly addressable even when omitted from primary navigation.

## Metadata and structured data

- Docs hub: `TechArticle`/collection-style metadata only where schema remains valid.
- Reference pages: unique title/description/canonical URL.
- Breadcrumb structured data can be generated from the manifest.
- Version-specific pages include the version in title and description.

## Rationale

The current reference material is deep but hard to navigate. A shared docs shell and task-based index make that content easier to use than one enormous feature page.

## Watch-items

- Search must work from static output without Algolia or a hosted index.
- Mobile sidebar state must be keyboard accessible and must not trap scroll.
- Existing deep links from the README and external sites must keep working.
- Do not flatten nuanced reference prose into shallow marketing summaries.
