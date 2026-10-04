# RelayDesk mail examples

Companion to **Case study: Everybody Brought Their Own Mail Server**. These are small Java application helpers targeting the Simple Java Mail **10.0.0 development API**, with the batch and OpenPGP modules. They are not a complete multi-tenant dispatcher or a library feature called RelayDesk.

## Use the pieces together

1. Approve the customer, region, endpoints, authentication and return addresses. Enforce destination restrictions in application and network policy, including DNS changes. The helper does not validate user-supplied hosts or provide an SSRF defense.
2. Supply a `SimpleJavaMail` factory with an approved configuration snapshot. Audit raw Session properties, socket factories and inherited settings as well as the explicit TLS settings. The fictional `.com` domains in the example are illustrative; do not send to or connect to them to test it.
3. Supply your `AttemptResults` implementation and a bounded, application-owned observer executor. Both must report failures, including rejected callback work. SJM logs observer exceptions without changing the send result; an exception alone does not make a failed archive write recoverable. Recover unfinished records separately, never by blindly resending.
4. Build every approved relay member with `createMailer(...)`. Share a key only among interchangeable endpoints within one permitted customer/region group. A single managed endpoint needs one reusable Mailer, not several discovered backend addresses.
5. Prepare a fresh email builder for each attempt. `prepareKestrelReply(...)` uses application-generated UUIDs: retain the conversation token, generate a new attempt token for a permitted retry, and store its Message-ID with the customer, route and configuration revision **before** calling `mailer.async().sendMail(email)`.
6. Dispatch only after application-level admission. Keep the backlog durable; apply per-customer and fleet-wide limits before `submitReply(...)` calls SJM's `customerMailer.async().sendMail(reply)`. It returns the original `MailSend<MailSubmissionReceipt>` handle without waiting; the already-configured observer records the outcome. Queue-full rejection means the attempt was not admitted; defer the job without spinning. Other exceptions require a receipt/recipient-aware retry decision. Partial or unknown acceptance is not permission to resend the whole reply.
7. Preserve the terminal outcome, including logging-only mode, receipts, failures and timestamps. SMTP acceptance is not delivery, and a late bounce arrives through a separate incoming-mail handler. Treat correlation tokens and delivery reports as untrusted input, validate against the stored customer/attempt/recipient, and handle duplicates.

## Tenant requirements and diagnostics

- `checkCredentials(...)` calls `probeConnection(true)` on a dedicated connection and rejects a failed/unsupported report. Perform it only after endpoint/egress approval and TLS configuration, on every replacement relay. It submits no mail, does not use pooled connections and does not replace a controlled test send. The Mailer send deadline does not bound the probe; configure appropriate connection/read timeouts too.
- `protectWholesaleReply(...)` is for Kestrel's approved wholesale conversations, not ordinary shopper replies. `ApprovedOpenPgpKeys` verifies the tenant, each mailbox identity and key fingerprint, approvals, expiry/revocation and signing authorization. Failure throws before a protected Email is returned; the caller holds the job instead of sending the unprotected original. Never resolve a recipient key outside its tenant or accept a browser-supplied key as proof of identity.
- The helper's base-MIME rehearsal skips cryptography and maximum-size validation while resolving the effective envelope. Keys cover its To/Cc/Bcc and any configured override recipients. Copying the effective message explicitly retains override recipients, then disables further defaults/overrides so the send cannot add unapproved recipients after key selection. Full sending still validates and performs protection. The key adapter and approved Mailer remain current and unchanged for that attempt; the deployment must not silently mix S/MIME and OpenPGP requirements.
- OpenPGP protects the outgoing payload, not RelayDesk's stored conversation. Retrieve current signing material from secret storage for each preparation; do not expect serialized Emails to retain OpenPGP private keys/passphrases.
- Kestrel's example enables `mail.smtp.sendpartial` for STARTTLS. With `SMTPS`, the property is `mail.smtps.sendpartial`. This is an explicit per-integration choice. Load the stored `MailSendOutcome` only after authorizing access to its customer and ticket. `presentOutcome(...)` obtains its optional submission receipt and delegates to `presentResult(...)`, which gives the ticket UI size and per-recipient facts, retry advice and eligible candidates. A failed attempt may still contain a receipt; an attempt without one retains its failure/status in the stored outcome rather than inventing submission facts. Neither helper schedules retries. A retry must target only approved candidates and pass authorization, deadlines, rate limits and backoff again. Unknown acceptance must never become a resend-all button.
- The receipt's `getMessageSize()` and `getServerMaximumMessageSize()` are optional facts, including on failed sends. Null is unknown, not zero or unlimited. Rehearsal size is offline; the actual connection's SIZE check uses its advertised maximum and SMTP content size, which can differ after negotiated encoding. Equality fits the reported limit; other checks may still fail.
- SMTPUTF8 is needed for an internationalized mailbox such as `josé@partner.com`, not merely an accented display name or encoded subject. 8BITMIME is a separate content capability. The managed provider checks the actual sending connection. Do not rewrite addresses or enable legacy compatibility globally when a customer server lacks a required capability.

The code deliberately has no `main()` method and never chooses or connects to a server by itself. It fixes the article's sample Message-ID before submission so the observer can use the initial ID even if a transport supplies a different effective ID.

## Resource and reconfiguration limits

- Pool size is per relay pool and per process; async workers and queue capacity are per Mailer. Multiply before comparing with a customer's approved connection limit. The observer executor also needs its own capacity and shutdown policy.
- Core size zero and idle expiry do not bound the number of Mailers, executors or retained cluster definitions. The application still needs a bounded registry and retirement design.
- A password change retains the cluster key and its pool policy, pauses admission across the affected deployment, accounts for in-flight work, closes all old members and constructs the complete replacement group. A failed or partial replacement must remain paused and clean up newly built resources. Only then may approved jobs resume.
- First registration establishes cluster pool settings. Re-registering under the same key does not replace them. Closing the last Mailer must not be assumed to forget every retained cluster setting; a fresh key on every change is not proof of bounded metadata. A complete hot-reload registry needs lifecycle/churn tests before use.
- A managed provider such as Juniper's handles server discovery behind its hostname. Rebuilding configured beans, including with Spring Cloud refresh scope, does not coordinate the application-level pause, in-flight work, replacement checks or cleanup described here.
- Offloaded observer work is application-owned. Draining sends and closing Mailers is not a substitute for accounting for pending persistence callbacks. Shutdown and credential revocation require explicit application decisions.

## Verification

The companion `tests/journal-examples/RelayDeskMailExamplesTest.java` checks message/DSN construction, observer correlation, asynchronous submission handoff, optional receipt extraction, authenticated probe invocation, recipient feedback, unknown sizes and tenant-key selection. It also renders, decrypts and verifies an OpenPGP reply using public development fixtures, without SMTP. The submission handoff uses a synthetic Mailer, not a network connection. Compile it with this source against the current 10.0.0 classes and dependencies:

```powershell
$exampleClasses = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ('relaydesk-example-' + [Guid]::NewGuid().ToString('N')))
# Set $exampleClasspath to the current 10.0.0 development classes and dependencies.
javac -proc:none --release 11 -cp $exampleClasspath -d $exampleClasses.FullName `
  src/assets/journal/examples/relaydesk/RelayDeskMailExamples.java `
  tests/journal-examples/RelayDeskMailExamplesTest.java
if ($LASTEXITCODE -ne 0) { throw 'Compilation failed' }
java -cp "$($exampleClasses.FullName);$exampleClasspath" RelayDeskMailExamplesTest `
  ../modules/simple-java-mail/src/test/resources
```

These checks do not prove live SMTP authentication, DNS/egress restrictions, fair scheduling, callback durability, coordinated credential replacement or unbounded customer churn. No credentials or external mail service are needed for the tests.
