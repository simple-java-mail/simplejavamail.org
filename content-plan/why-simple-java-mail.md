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

Use `Your code should describe the email, not build a MIME tree` as the lede. Explain the origin plainly: Sun JavaMail exposed the protocol and message machinery; the Jakarta transition changed namespaces and stewardship but did not redesign the low-level API. Simple Java Mail handles that plumbing for application code.

### What the library takes care of

Pair one realistic rich-message example with the responsibilities that application code would otherwise own:

- with Jakarta Mail directly: session properties, multipart tree construction, encodings, addresses, connections, and failure paths;
- with Simple Java Mail: describe the message and configure the mailer through builders.

The Jakarta side stays short and representative. It must not be a contrived worst-case wall of code.

### It keeps helping when email gets difficult

Walk through the six main jobs:

- Compose content and recipients.
- Configure a reusable mailer.
- Apply security and recipient rules once.
- Choose a delivery mode appropriate to the workload.
- Inspect and diagnose behavior.
- Drop down to Jakarta Mail or custom sending logic when required.

This is the page's central argument.

### Complexity is opt-in

Show four quiet reference rows for connecting, protecting, setting defaults, and scaling. API names use the normal light documentation treatment rather than dark badges.

The simple case remains readable. Advanced settings stay with the mailer instead of spreading through every place that sends an email.

### Where the library is unusually deep

Use a light two-column reference register with enough detail to explain each subject. It should read like documentation, not a feature billboard:

- recipient rules: defaults, overrides, validation, bounce and receipt addresses;
- content security: DKIM plus S/MIME signing/encryption, including per-recipient certificates;
- pools and clusters: open connections, keyed clusters, multiple servers, load balancing;
- network constraints: local binding, custom TLS, trusted-host policy, and authenticated SOCKS;
- message conversion: Email/MimeMessage/EML/Outlook conversion and custom sending callbacks.

### Built on Jakarta Mail, with escape hatches

State the relationship precisely:

- Angus Mail/Jakarta Mail remains the underlying standards and transport implementation.
- Simple Java Mail handles the common and advanced work involved in sending email.
- Applications can supply a `Session`, access the generated `MimeMessage`, configure raw properties, or provide the final send operation.

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
- `complexity-is-opt-in`
- `unusual-depth`
- `jakarta-mail-escape-hatches`
- `fit`

## Metadata intent

Title: `Why Simple Java Mail — A higher-level email API for Java`
Description: `Your code should describe the email, not build a MIME tree. See what Simple Java Mail handles and where Jakarta Mail still fits.`

## Rationale

Calling the library a wrapper undersells what it does. This page explains the extra work it handles without turning the website into a sales pitch or dismissing Jakarta Mail underneath it.

## Watch-items

- Use a fair low-level comparison and link to official Jakarta Mail material.
- Never imply that the Jakarta namespace change was intended to redesign the API.
- Keep “good fit / not the fit” unusually candid.
- Do not introduce an enterprise persona or commercial call to action.
