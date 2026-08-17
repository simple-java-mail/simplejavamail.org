# Compare approaches

Route: `/feature-matrix.html`
Role: help a developer choose how much of sending email they want a library to handle
Primary audience: developers comparing Jakarta Mail, Spring Mail, Apache Commons Email, and Simple Java Mail
Primary action: choose based on the work they want to keep in application code

## Reader question

> Which library handles the parts of email I do not want to build and maintain myself?

## Comparison principle

This is not a winner table. The page compares the job each option is designed to do, then shows what your code still has to handle.

Any time-sensitive project-health fact must be sourced from a current official project page or omitted. The stable comparison is API scope and abstraction level.

## Visible structure

### Hero: Compare what each library handles, and what it leaves to you

Lede:

> All four libraries can send mail. The real difference is what you still have to build, configure, secure, and maintain yourself.

### At a glance

Four concise profiles:

- **Jakarta Mail / Angus Mail:** badge: `Low-level SMTP toolkit`; the standard MIME and mail-protocol API supplies the parts and your code assembles, configures, and reuses them.
- **Spring Mail:** badge: `Rudimentary support`; Spring's `JavaMailSender`, `MailException`, and `MimeMessageHelper` fit when the application already uses those APIs.
- **Apache Commons Email:** badge: `Maintenance mode`; a handful of message classes remove some Jakarta Mail boilerplate, while leaving most of the harder work to the application.
- **Simple Java Mail:** badge: `Complete SMTP solution`; it builds well-formed MIME and adds reusable message rules, DKIM, S/MIME, OpenPGP/MIME, diagnostics, conversion, authenticated SOCKS, and batched, pooled, or clustered delivery.

Use one top badge per card. Do not add a second eyebrow label inside the card.

The first three profiles link to the responsibility matrix. The Simple Java Mail profile links to the fuller explanation on `Why Simple Java Mail`. The matrix column headings carry a small external link to the corresponding project home.

### Responsibility matrix

Rows are developer responsibilities, not arbitrary feature trivia:

1. Basic and rich message composition
2. Attachments, embedded content, and calendars
3. Recipient rules, validation, defaults, and overrides
4. DKIM
5. S/MIME signing and encryption
6. OpenPGP/MIME signing, encryption, verification, and decryption
7. Transport security and OAuth2
8. Async result handling and connection tests
9. Connection reuse and simple batches
10. Pooled and multi-cluster delivery
11. Authenticated SOCKS
12. EML, `MimeMessage`, and Outlook conversion
13. Code and external configuration
14. Spring application integration, including Boot auto-configuration and the native `JavaMailSender` contract
15. Diagnostics and debug-output routing
16. Low-level session/property escape hatches

Cells use three states with visible text and symbols:

- built-in high-level support;
- helper or integration support;
- handled by application code or another integration.

Every cell with a non-obvious claim has a footnote linking to the official documentation used during the site update.

Show the explanation of `Your code handles it` as a restrained callout below the matrix so readers do not mistake it for “impossible.”

### Dependency footprint

Use compact bullet lists in the middle column to show the dependencies for each option. Keep the order consistent: the mail foundation first and subdued, the selected library second and bold, then any optional module the application may choose to add. Application context, such as Spring already being present, belongs in the explanation rather than the dependency list. For wrapped libraries, name the foundation `Jakarta Mail / Angus` consistently. Do not draw rails or put the names in badges or boxes. These lists show structure, not proportional jar sizes:

- **Jakarta Mail / Angus:** the API and implementation; validation, message construction, connection reuse, and the rest stay in application code;
- **Spring Mail:** adds little when Spring is already present, but brings Spring dependencies with it in an otherwise non-Spring application;
- **Commons Email:** a small footprint because it remains a narrow layer of typed message classes over the mail implementation;
- **Simple Java Mail:** the main artifact includes the Jakarta Mail API plus the Angus provider adapter at runtime. Core covers well-formed MIME, reusable message rules, TLS and OAuth2, diagnostics, conversion, and simple batches; DKIM, S/MIME, OpenPGP/MIME, pools and clusters, Outlook, Spring, authenticated SOCKS, CLI, and Karaf support are separate modules.

Link the `Optional modules` item in the Simple Java Mail dependency list to the modules page. Avoid exact byte-size claims because versions and the application's existing dependency graph change the result.

### Where each option fits

Use four unnumbered rows; these are alternatives, not steps:

- **Jakarta Mail / Angus, you want to own the mail mechanics:** build the Session, MIME tree, and transport handling yourself, including how they are validated, secured, and reused.
- **Spring Mail, your application already speaks `JavaMailSender`:** the honest Spring-specific fit is an existing `JavaMailSender` contract, Boot auto-configuration, `spring.mail.*`, JNDI Session support, and requirements already covered by `MimeMessageHelper`. Lead with the link to Simple Java Mail's Spring integration so Spring users know they are not excluded.
- **Commons Email, you only want a little less Jakarta Mail boilerplate:** it makes basic Jakarta Mail code shorter, but that is about as far as it goes. Version 2 mainly split the project into separate Jakarta and Javax artifacts, while the way messages are built and sent remained largely unchanged. The project still receives updates, but most recent work focuses on dependency, build, and security upkeep. Connect that maintenance focus and limited scope directly to why the library is difficult to recommend as the mail layer for a new application.
- **Simple Java Mail, you need more than message composition:** it handles well-formed MIME, reusable message rules, diagnostics, and conversion, then adds capabilities outside Jakarta Mail itself such as DKIM, S/MIME, OpenPGP/MIME, authenticated SOCKS, connection pools, and SMTP clusters; add modules only when their features are needed.

### Two concrete comparisons

1. Rich email with attachment and embedded image: compare the responsibilities each API exposes.
2. Mailer with TLS, a signing default, a connection test, and a proxy: show which settings stay together and where application code takes over.

### Scope note

Explicitly state that Simple Java Mail focuses on outbound email. Jakarta Mail covers additional protocols such as IMAP and POP3 and remains the correct foundation for mailbox access.

### Next steps

- Understand what Simple Java Mail handles for you.
- Browse the complete capability reference.
- Install from Maven Central.

## Anchors

Keep `navigation` for old inbound links. Add:

- `profiles`
- `responsibility-matrix`
- `scenarios`
- `concrete-comparisons`
- `scope`

## Metadata intent

Title: `Simple Java Mail compared with Jakarta Mail, Spring Mail, and Commons Email`
Description: `Compare Java outbound-email libraries by abstraction level, application responsibilities, security, delivery operation, diagnostics, and escape hatches.`

## Rationale

The current matrix damages trust through stale and dismissive language. A responsibility-based comparison makes Simple Java Mail's breadth clearer while respecting legitimate reasons to choose a lower-level or narrower API.

## Watch-items

- Verify the matrix against current official documentation before publication.
- Do not use project release cadence as a proxy for API fit.
- Avoid checkmark overload; textual cell states must remain understandable to screen readers.
- Do not imply that Spring Mail lacks `MimeMessageHelper`.
- Do not imply that Simple Java Mail replaces Jakarta Mail for receiving mail.

## Apache Commons Email source note

Reviewed 9 August 2026:

- The current release is `2.0.0-M1`, published in June 2024. Its defining change was splitting Commons Email into core, Jakarta, and Javax modules; the public model remains the familiar mutable `Email`, `SimpleEmail`, `MultiPartEmail`, and `HtmlEmail` hierarchy.
- The old `commons-email` artifact has a substantial installed base. That should not be confused with momentum in the 2.x line, whose GitHub dependency graph shows very limited adoption.
- The repository is maintained rather than abandoned. Recent work is dominated by dependency, build, CI, documentation, and security maintenance; several substantive pull requests have remained open for a year or more.
- Keep public claims qualitative and link them to the [official release page](https://commons.apache.org/proper/commons-email/) and [current commit history](https://github.com/apache/commons-email/commits/master/). Recheck before materially changing the wording.
