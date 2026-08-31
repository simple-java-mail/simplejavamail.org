# Get started

Route: `/download.html`
Role: move from evaluation to a verified first send
Primary audience: a developer ready to try the library
Primary action: copy the dependency and run the first example

## Reader question

> What do I add, what is the smallest working code, and which optional pieces do I actually need?

## Presentation

This page belongs to the **Start** group and uses the standard docs shell, breadcrumb, article rhythm, and paper/white palette. Steps follow the reading column instead of using a separate marketing-page axis. Dark surfaces are reserved for the Maven and Java examples themselves.

## Visible structure

### Hero: Get started

State Maven Central availability, current version, Java baseline, and license. Keep the version driven by global site data.

### 1. Add the dependency

Maven is primary because the project publishes Maven coordinates. Put Gradle in a compact disclosure directly underneath. Both samples have copy buttons and start with:

`org.simplejavamail:simple-java-mail:<current-version>`

Explain in one sentence that `simple-java-mail` gives the developer the public API and everything needed for the usual send.

### 2. Build a message

Canonical minimal example with realistic neutral addresses:

- from;
- to;
- subject;
- plain text;
- `buildEmail()`.

Do not introduce attachments or security yet.

### 3. Build a mailer and send

Show SMTP host, port, credentials, `SMTP_TLS`, and `sendMail`. Environment variables are used for secrets in the example; no literal production password.

### 4. Verify before sending

Show `testConnection()` and `validate(email)`. Explain that connection acceptance and message validation cover different failure classes.

### 5. Choose optional modules

Small decision table:

- batch module: pooled/high-throughput and clustered sending;
- authenticated SOCKS module: proxy credentials;
- DKIM module: domain-key signing;
- S/MIME module: signing/encryption;
- Outlook module: `.msg` parsing and conversion;
- CLI module/distribution: command-line use;
- Spring module: Spring-oriented configuration;
- OSGi/Karaf artifacts: modular container deployment.

Link every row to the Modules page and exact capability documentation.

### Where to go next

Offer three next paths:

- add rich content;
- configure shared defaults;
- secure transport and content.

### Next steps

- Add rich message content.
- Configure production policy.
- Secure transport and content.

## Existing anchors

Preserve any current `navigation` and dependency-section IDs. Add:

- `dependency`
- `first-email`
- `mailer`
- `verify`
- `optional-modules`
- `configuration-routes`

## Metadata intent

Title: `Get started with Simple Java Mail`
Description: `Install Simple Java Mail from Maven Central, send a first email, verify the SMTP connection, and choose optional modules.`

## Rationale

“Download” is an outdated mental model for a Maven library. The route stays for compatibility, while the visible page becomes a dependable five-minute start that also prevents module confusion.

## Watch-items

- Never render a `%s` version placeholder.
- Samples must compile against the current public API.
- Do not require Spring for the primary path.
- Do not imply a successful SMTP submission guarantees inbox placement.
