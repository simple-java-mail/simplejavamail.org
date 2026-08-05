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

### Hero: Compare what each library handles, not how short the demo looks

Lede:

> All four libraries can send mail. The real difference is what you still have to build, configure, secure, and maintain yourself.

### At a glance

Four concise profiles:

- **Jakarta Mail / Angus Mail** — the standard MIME and mail-protocol API; you directly control sessions, message structure, and transports.
- **Spring Mail** — Spring's sending integration and `MimeMessageHelper`; a natural fit when those cover the whole requirement.
- **Apache Commons Email** — a smaller API for common message types; your code supplies anything outside that API.
- **Simple Java Mail** — a higher-level API for messages, security, shared configuration, advanced sending, diagnostics, and conversion.

### Responsibility matrix

Rows are developer responsibilities, not arbitrary feature trivia:

1. Basic and rich message composition
2. Attachments, embedded content, and calendars
3. Recipient validation, defaults, and overrides
4. DKIM
5. S/MIME signing and encryption
6. Transport/TLS policy and OAuth2
7. Async result handling and connection tests
8. Connection reuse and simple batches
9. Pooled and multi-cluster delivery
10. Authenticated SOCKS
11. EML, `MimeMessage`, and Outlook conversion
12. Properties and Spring configuration
13. Diagnostics and debug-output routing
14. Low-level session/property escape hatches

Cells use four states with visible text and symbols:

- built-in high-level support;
- helper or integration support;
- available through the underlying API / application code;
- outside intended scope.

Every cell with a non-obvious claim has a footnote linking to the official documentation used during the site update.

### Read the table by scenario

Four scenarios interpret the matrix:

- **I need full low-level control** -> Choose Jakarta Mail / Angus when you want to build and manage sessions, transports, and MIME parts yourself.
- **I need Spring's standard sending integration** -> Lead with the linked Simple Java Mail Spring integration: its Spring module supports property configuration and an injectable mailer. Then clarify that Spring Mail itself may be sufficient when `JavaMailSender` and `MimeMessageHelper` cover the whole requirement.
- **I need a small convenience layer for common messages** -> Commons Email may be enough when common messages are all you need and you are happy to handle validation, security, and delivery setup elsewhere.
- **I need the API to keep up as requirements grow** -> Simple Java Mail keeps the first send easy, then adds the difficult features without making you switch libraries.

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
