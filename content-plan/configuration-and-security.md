# Configuration and security

Routes: `/configuration.html` and `/security.html`
Role: explain where shared mailer settings and security settings belong
Primary audience: teams preparing production mailers

## Configuration page

### Reader question

> Where should connection, defaults, overrides, validation, environment, and throughput settings live?

### Visible structure

1. **Configuration at a glance** — link cards for the Java SMTP API, properties, Spring, defaults and overrides, and pools and clusters. Keep individual settings in the table of contents.
2. **Choose a configuration route** — Java builders, properties, Spring, or supplied Jakarta `Session`.
3. **Build a reusable Mailer** — server, port, credentials, transport strategy, timeouts.
4. **Layer configuration** — common properties, environment overrides, and precedence.
5. **Set message rules once** — defaults, forced overrides, validation, default DKIM/S/MIME where applicable.
6. **Configure delivery behavior** — async, connection reuse, simple batch.
7. **Configure pooled and clustered delivery** — batch module, pool sizing, keys, multiple clusters, load balancing.
8. **Inspect the settings in use** — server, runtime, recipient rules, proxy, transport, and Session views.
9. **Reference appendix** — complete property inventory.

Preserve current anchors for common/other programmatic APIs, properties, available properties, defaults/overrides, environments, Spring, batch/clustering, connection reuse, and multiple pools.

### Key explanation

The page distinguishes **message data** from **mailer settings**. Defaults fill omitted values; overrides enforce values. This is reusable configuration, not an enterprise-only feature.

### Metadata intent

Title: `Configure Simple Java Mail — Java, properties, Spring, and delivery pools`
Description: `Configure reusable mailers, layered properties, Spring integration, defaults and overrides, validation, connection reuse, batch pools, and multiple SMTP clusters.`

## Security page

### Reader question

> How do I protect credentials, transport, message authenticity, content, and recipient handling?

### Visible structure

1. **Security at a glance** — link cards for TLS, OAuth2, DKIM, S/MIME, and header-injection protection. Keep connection factories, individual transport variants, trust settings, and other lower-level controls in the table of contents.
2. **Choose a transport strategy** — SMTP, SMTPS, SMTP with STARTTLS, OAuth2; explain what each does and does not protect.
3. **Verify the server** — trusted hosts, server identity, custom SSL factory, certificate behavior.
4. **Prevent header injection** — CRLF handling and where validation occurs.
5. **Sign with DKIM** — per-message and mailer defaults, selectors/keys, optional module note.
6. **Sign and encrypt with S/MIME** — signing, encryption, per-recipient certificates, reading/merging/decrypting, optional module note.
7. **Security checklist** — secrets, TLS verification, key handling, logging, tests.

Preserve all current transport-strategy, SSL, trusted-host, server-identity, CRLF, DKIM, and S/MIME anchors.

### Security language

- Do not call SMTP_TLS “encrypted email”; it protects the transport hop.
- Distinguish DKIM authenticity from S/MIME end-to-end content protection.
- Explain OAuth2 as an authentication mechanism, not a transport-encryption substitute.
- Avoid blanket “secure” claims without naming the layer.

### Metadata intent

Title: `Secure Java email with TLS, OAuth2, DKIM, and S/MIME`
Description: `Configure Simple Java Mail transport verification, OAuth2, CRLF protection, DKIM signing, and S/MIME signing and encryption.`

## Shared next steps

- From configuration -> test and inspect the effective mailer.
- From security -> configure delivery policy or inspect failures.

## Rationale

Configuration and security are where the library most clearly goes beyond a message builder. The pages stay separate because their tasks differ, but they use the same terms and link to each other where needed.

## Watch-items

- Validate all property names and enum values against current code.
- Clearly name the required optional module before DKIM/S/MIME/batch examples.
- Never put real private-key material in examples.
- Preserve Spring as an integration route, not the default identity of the library.
