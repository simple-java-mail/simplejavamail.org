# Modules, CLI, MIME, and conversion

Routes: `/modules.html`, `/cli.html`, `/rfc-compliant.html`
Role: explain what each optional module adds, plus the CLI and message-conversion tools
Primary audience: implementers who need more than the main `simple-java-mail` dependency

## Modules page

### Reader question

> Which artifact adds this feature, and what changes when I include it?

### Visible structure

Start with a compact dependency diagram generated in HTML/CSS rather than the current raster-only explanation. Show the main artifact and core, then optional modules:

First establish what core already covers: well-formed MIME, reusable configuration and message rules, TLS and OAuth2, diagnostics, conversion, and simple batches. The optional modules extend that same model; they are not the library's only advanced capabilities.

- batch;
- authenticated SOCKS;
- Outlook;
- DKIM;
- S/MIME;
- CLI;
- Spring;
- OSGi/Karaf.

Each module entry includes:

1. capability;
2. use it when;
3. Maven coordinate;
4. main added dependencies;
5. first documentation link;
6. connection or cleanup note if relevant.

Keep the architecture image as a downloadable/reference asset only if still accurate.

### Metadata intent

Title: `Simple Java Mail modules and artifacts`
Description: `Choose optional Simple Java Mail modules for batch pools, authenticated SOCKS, DKIM, S/MIME, Outlook conversion, CLI, Spring, OSGi, and Karaf.`

## CLI page

### Reader question

> Can I perform the same configured send, validation, or connection test without writing an application?

### Visible structure

1. Install/run the standalone distribution or Maven artifact.
2. Map the builder API to generated commands.
3. Send, connect, and validate.
4. Load arguments from `@` files.
5. Use property configuration and environments.
6. Configure logging and exit behavior.
7. Open the complete generated command reference.

Preserve current anchors for API-to-command mapping, usage, `@` files, properties, logging, manual, and Maven.

### Metadata intent

Title: `Simple Java Mail CLI`
Description: `Send, validate, and test Java email configuration from the command line using the same generated option model as the Simple Java Mail builders.`

## MIME and interoperability page

Visible label: **MIME and interoperability**
Route remains `/rfc-compliant.html`.

### Reader question

> How does the library choose the right multipart structure, and how can I inspect or convert the result?

### Visible structure

1. Why MIME structure matters across clients.
2. How Simple Java Mail selects multipart structures from declared content.
3. Interactive multipart explorer, retained and restyled.
4. Encodings, resource IDs, and interoperability safeguards.
5. Convert between `Email`, `MimeMessage`, EML, and Outlook `.msg`.
6. What “RFC compliant” can and cannot promise in a diverse email-client ecosystem.

Preserve all explorer and strategy anchors.

### Claim adjustment

Replace blanket “fully RFC compliant and looks good in all clients” language with:

> Simple Java Mail generates standards-oriented MIME structures for the content you declare and tests the common multipart combinations. Rendering and policy still vary by receiving client and server.

### Metadata intent

Title: `MIME structure and email interoperability in Simple Java Mail`
Description: `Understand how Simple Java Mail builds multipart messages, handles encodings and embedded resources, and converts Email, MimeMessage, EML, and Outlook MSG content.`

## Rationale

These pages show exactly what each optional module adds. They also keep advanced features from overwhelming the main dependency and the first-send guide.

## Watch-items

- Verify every coordinate from current POM modules.
- Keep the interactive explorer functional without making it the page's only explanation.
- Explain CLI process shutdown/resource ownership for batch usage.
- Avoid universal rendering claims across email clients.
