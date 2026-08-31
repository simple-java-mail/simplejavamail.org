# Why Simple Java Mail

Route: `/why-simple-java-mail.html`
Role: explain what the library handles and why that remains useful as requirements grow
Primary audience: evaluators and teams already familiar with Java mail APIs
Primary action: inspect the capabilities relevant to the reader's system

## Reader question

> Is this only a friendlier `MimeMessage`, or will it still help when sending email becomes difficult?

## Presentation

This page belongs to the **Start** group and uses the same docs shell, breadcrumb, reading width, and soft paper/white palette as the reference pages. It is written natively for that frame: no full-width marketing bands, oversized dark registers, or dark inline API chips. Dark surfaces are reserved for actual multi-line code.

## Visible structure

### Hero: Why Simple Java Mail

Place a small, factual `Open source · Apache-2.0` badge row inside the page hero, beneath the lede, beside a `Compare to other libraries` button linking to the comparison page. Stack the controls cleanly on narrow screens.

Use `Your code should describe the email, not build a MIME tree` as the lede. Explain the origin plainly: Jakarta Mail exposes the protocol and message machinery through a low-level API. Simple Java Mail began by handling that plumbing while keeping Jakarta Mail as its standards and transport foundation, then grew to cover capabilities outside Jakarta Mail itself: reusable message rules, DKIM, S/MIME, diagnostics, conversion, authenticated SOCKS, and batched, pooled, or clustered delivery.

Bold the sentence fragments that state the original API improvement and the later breadth. Follow the MIME explanation with two restrained reference links: `Why MIME structure matters` and `See what new capabilities Simple Java Mail adds`.

### What the library takes care of

Pair one realistic rich-message example with the responsibilities that application code would otherwise own:

- with Jakarta Mail directly: session properties, multipart tree construction, encodings, addresses, connections, and failure paths;
- with Simple Java Mail: describe the message and configure the mailer through builders.

The Jakarta side stays short and representative. It must not be a contrived worst-case wall of code.

### SJM keeps helping when email gets difficult

Walk through the six main jobs. Each card ends with no more than four direct documentation links that make its promise concrete:

- Compose content and recipients: basic usage, attachments, embedded images, and replies or forwards.
- Configure a reusable mailer: Java configuration, properties, defaults and overrides, and Spring.
- Apply security and recipient rules once: TLS and OAuth2, DKIM, and S/MIME.
- Choose a delivery mode appropriate to the workload: asynchronous or simple batch sending, authenticated SOCKS, connection pooling, and SMTP clusters.
- Inspect and diagnose behavior: connection settings, operational settings, connection tests, and message validation.
- Drop down to Jakarta Mail or custom sending logic when required: custom Sessions, raw properties, MimeMessage conversion, and CustomMailer.

This is the page's central argument.

### Built on Jakarta Mail, with escape hatches

State the relationship precisely:

- Angus Mail/Jakarta Mail remains the underlying standards and transport implementation.
- Simple Java Mail handles the common and advanced work involved in sending email.
- Applications can supply or access a `Session`, configure raw properties, supply an SSL socket factory or OAuth2 token provider, convert MIME/EML, replace validation or execution services, or provide the final send operation.

This section prevents the site from presenting abstraction as lock-in.

### Where it fits

Good fit:

- application email that needs more than the basics;
- teams that want security, policy, and operation in one API;
- services that need configuration via Java, properties, or Spring;
- unusual SMTP network or throughput constraints.

Probably not the fit:

- mailbox clients built around IMAP or POP;
- applications that explicitly choose to construct and control every Jakarta Mail object directly;
- provider-specific HTTP email APIs with no SMTP or MIME portability requirement, unless using custom sending logic for the message model.

### Next steps

- Browse capabilities.
- Compare abstraction levels.
- Send the first email.

## Anchors

- `origin`
- `what-the-boundary-removes`
- `beyond-composition`
- `jakarta-mail-escape-hatches`
- `fit`

## Metadata intent

Title: `Why Simple Java Mail: Complete outbound email for Java`
Description: `Simple Java Mail is not just a Jakarta Mail wrapper. It builds well-formed MIME through a highly streamlined API and, on top of that, adds reusable message rules, security, diagnostics, conversion, and advanced SMTP delivery.`

## Rationale

Calling the library a wrapper undersells what it does. This page explains the extra work it handles without turning the website into a sales pitch or dismissing Jakarta Mail underneath it.

## Watch-items

- Use a fair low-level comparison and link to official Jakarta Mail material.
- Never imply that the Jakarta namespace change was intended to redesign the API.
- Keep “good fit / not the fit” unusually candid.
- Do not introduce an enterprise persona or commercial call to action.
