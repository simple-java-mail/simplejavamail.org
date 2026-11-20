# Documentation system

Routes: `/docs.html` plus all existing reference routes
Role: provide task-oriented wayfinding and a consistent long-form reading system
Primary audience: implementers and operators
Primary action: reach the exact reference section needed

The [implemented discovery structure](capabilities-discovery.md) defines the shared families, guide context, directory generation and compatibility behavior.

## Docs hub: `/docs.html`

### Hero: Documentation

Search is the first utility, followed by a short sentence explaining that the guides start with what the developer wants to do.

The hub, Get started, and Why Simple Java Mail use the same grouped left navigation as the reference pages, so the whole Start section moves naturally into the deeper documentation.

### Start here

- First email -> `/download.html#first-email`
- Why the library exists -> `/why-simple-java-mail.html`
- Upgrade to 10.0 -> `/migration-notes-10.0.0.html`

### Explore and locate

Provide one clear Capabilities link for discovery. Generate the complete guide directory from navigation data and group it under Start, the seven capability families, and Maintain. Guide labels, URLs and descriptions have one source; the directory must not omit guides present in the sidebar.

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

### Sidebar groups and guide context

Use Start, the seven shared families, and Maintain. Resolve family names from the capability registry and guide items from navigation data. Patterns keeps its Tactical and Strategic child links. The Docs flyout links each family to its real directory section; it does not turn a group label into an arbitrary guide link.

Mapped guides show their family as a link in the heading and offer “More in this group” after the content. This provides neighbouring capabilities to readers arriving from search without opening the sidebar.

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
- The link checker validates generated pages and all internal fragments.
- Migration pages remain directly addressable even when omitted from primary navigation.

## Metadata and structured data

- Docs hub: `TechArticle`/collection-style metadata only where schema remains valid.
- Reference pages: unique title/description/canonical URL.
- Breadcrumb structured data can be generated from Eleventy's navigation data.
- Version-specific pages include the version in title and description.

## Rationale

The current reference material is deep but hard to navigate. A shared docs shell and task-based index make that content easier to use than one enormous feature page.

## Watch-items

- Search must work from static output without Algolia or a hosted index.
- Mobile sidebar state must be keyboard accessible and must not trap scroll.
- Existing deep links from the README and external sites must keep working.
- Do not flatten nuanced reference prose into shallow marketing summaries.
