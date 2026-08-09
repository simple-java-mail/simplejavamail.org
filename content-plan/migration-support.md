# Migration, help, and project trust

Routes: `/migration-notes*.html`, `/contact.html`, plus shared header/footer proof
Role: help people upgrade, ask for help, report bugs, and contribute
Primary audience: upgraders, contributors, and developers who are stuck

## Migration index: `/migration-notes.html`

### Visible structure

- Current major route first: 9.x migration.
- Historical routes: 8.x, 7.x, 6.x, 5.x.
- Each entry states source version range, type of breaking change, and approximate work category without inventing an effort estimate.
- Link to release history and GitHub releases for changes that do not require migration prose.

## Version-specific migration pages

Preserve content and anchors, but add consistent chrome:

- affected versions;
- breaking changes summary;
- before/after examples;
- behavior changes;
- removed/deprecated APIs;
- verification checklist;
- next migration or current docs.

The 8.0 page covers the email-governance overhaul and its related validation, conversion, DKIM, S/MIME, and parser changes. The 9.0 page foregrounds
the recipient-builder change and relevant new behavior from the current release history.

## Help and contribute: `/contact.html`

Visible label: **Help and contribute**.

### Where to go

- Usage question -> documentation first, then a GitHub issue with a minimal example if the docs leave a gap.
- Reproducible defect -> GitHub issue.
- Feature proposal -> GitHub issue with a concrete use case.
- Roadmap -> public issue tracker, alongside feature proposals and planned improvements.
- Documentation correction -> website repository issue/source route.
- Contribution -> main repository and contribution guidance.
- Sensitive report -> GitHub issue containing only a short, non-sensitive description; the maintainer then arranges a private channel for the details.

Do not funnel ordinary support to a maintainer's personal email when a public, searchable route is suitable.

### Maintainer note

A short factual paragraph names Benny Bottema and notes that the library was first published as Vesijama (Very Simple Java Mail) on Google Code in April 2009 and reintroduced as Simple Java Mail on GitHub in 2015. Keep it human, not founder-brand marketing.

## Shared trust strip

The site may display only manifest/repository-backed facts:

- current version;
- release date;
- Java 8+;
- Apache-2.0;
- Maven Central and Javadocs;
- GitHub source, issues, and releases;
- Angus/Jakarta foundation.

No invented support policy, SLA, LTS label, vulnerability promise, or compatibility matrix.

## Optional future trust pages

These are not launch blockers and are not created unless the project formalizes them:

- supported release policy;
- security reporting policy / `SECURITY.md`;
- Java, Spring, Jakarta, and Angus compatibility matrix;
- release process overview.

## Metadata intent

Migration index title: `Simple Java Mail migration notes`
Contact title: `Simple Java Mail help and contributions`

## Rationale

For an open-source library, mature support signals are findability, release transparency, migrations, accurate ownership, and a clear contribution path. Commercial support language is not one of them.

## Watch-items

- Never ask reporters to put credentials, private keys, personal mail, exploit details, or unsanitized test cases in a public issue.
- Do not promise individual maintainer response times.
- Keep historical migration URLs in the sitemap because external links may target them.
- Use generated current-version data; never copy the version into multiple templates.
