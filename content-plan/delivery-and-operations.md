# Delivery and operations

Primary routes: `/debugging.html`, with delivery sections on `/features.html` and `/configuration.html`
Role: show how a mailer behaves under load, network constraints, and failure
Primary audience: backend, platform, and operations-minded developers

## Delivery narrative

Delivery is presented as a progression. None of the later modes makes the earlier one obsolete:

1. **One send** — `sendMail` for ordinary work.
2. **Async send** — completion and failure through the returned future/callback model.
3. **Simple batch** — sequential messages without the batch module.
4. **Open connection** — callback-scoped reuse for a bounded group.
5. **Pooled batch** — reusable connections and worker sizing through the optional batch module.
6. **Keyed cluster** — independent pools and policies for multiple SMTP targets/workloads.

Each level states connection ownership, concurrency model, result behavior, and module requirement.

## Uncommon delivery constraints

### Authenticated SOCKS

Explain the concrete problem: Jakarta Mail can use a SOCKS endpoint but does not natively perform proxy username/password negotiation in the required path. The optional module provides a local authenticated bridge so mail delivery can satisfy constrained corporate/network environments.

Document:

- proxy host/port/credentials;
- optional module;
- failure diagnostics;
- security and behavior of the local bridge;
- internationalized domain behavior where relevant to current implementation.

### Multiple clusters

Explain a cluster key as a name chosen by the application for a particular pool and server set. Use cases:

- tenant or provider isolation;
- transactional versus batch workloads;
- multiple credential/server sets;
- different pool limits and load-balancing policies.

Link to the full property and Java configuration reference.

## Diagnostics page: `/debugging.html`

### Reader question

> Did the message fail validation, connection, SMTP submission, or a later delivery stage—and what can I inspect safely?

### Visible structure

1. **Diagnose by stage** — build/validate, connect/authenticate, submit, downstream delivery.
2. **Validate without sending** — email validation and maximum size.
3. **Test the connection** — sync/async connection test and error handling.
4. **Inspect what will be used** — mailer config, Session, email, generated `MimeMessage`, submission receipt.
5. **Route debug output** — Jakarta Mail debug to SLF4J or a chosen output.
6. **Use logging-only mode** — see composed output without delivery.
7. **Override envelope recipients safely** — development/test routing with a prominent warning.
8. **Understand failures** — exception families and async propagation.
9. **Logging integrations** — Log4j and Logback examples.

Preserve all current debugging anchors.

### Receipt language

Make the stages explicit:

- validation means the message meets configured application rules;
- connection test means an SMTP connection/authentication path was accepted;
- submission receipt means the SMTP server accepted the message at submission;
- delivery/read notifications are separate requests and are not universal guarantees;
- inbox placement is outside the library's control.

### Metadata intent

Title: `Diagnose Simple Java Mail — connection tests, logs, receipts, and failures`
Description: `Test SMTP connections, validate messages, inspect the settings in use, route Jakarta Mail debug output, understand async failures, and read server replies.`

## Rationale

The best proof of maturity is clear failure behavior. This page organizes the debugging tools by the stage that failed, so a developer can use it during a real incident.

## Watch-items

- Never equate SMTP acceptance with final delivery.
- Redact credentials and sensitive message content in debug examples.
- Explain resource ownership for pools/open connections and shutdown where applicable.
- Keep high-throughput claims qualitative unless measured benchmarks are published.
