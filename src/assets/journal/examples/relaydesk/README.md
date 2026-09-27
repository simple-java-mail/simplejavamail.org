# RelayDesk mail examples

Companion to **Case study: Everybody Brought Their Own Mail Server**. These are small Java application helpers targeting the Simple Java Mail **10.0.0 development API**, with the batch module. They are not a complete multi-tenant dispatcher or a library feature called RelayDesk.

## Use the pieces together

1. Approve the customer, region, endpoints, authentication and return addresses. Enforce destination restrictions in application and network policy, including DNS changes. The helper does not validate user-supplied hosts or provide an SSRF defense.
2. Supply a `SimpleJavaMail` factory with an approved configuration snapshot. Audit raw Session properties, socket factories and inherited settings as well as the explicit TLS settings. The fictional `.com` domains in the example are illustrative; do not send to or connect to them to test it.
3. Supply your `AttemptResults` implementation and a bounded, application-owned observer executor. Both must report failures, including rejected callback work. SJM logs observer exceptions without changing the send result; an exception alone does not make a failed archive write recoverable. Recover unfinished records separately, never by blindly resending.
4. Build every approved relay member with `createMailer(...)`. Share a key only among interchangeable endpoints within one permitted customer/region group. A single managed endpoint needs one reusable Mailer, not several discovered backend addresses.
5. Prepare a fresh email builder for each attempt. `prepareKestrelReply(...)` uses application-generated UUIDs: retain the conversation token, generate a new attempt token for a permitted retry, and store its Message-ID with the customer, route and configuration revision **before** calling `mailer.async().sendMail(email)`.
6. Dispatch only after application-level admission. Keep the backlog durable; apply per-customer and fleet-wide limits before submitting to SJM. Queue-full rejection means the attempt was not admitted; defer the job without spinning. Other exceptions require a receipt/recipient-aware retry decision. Partial or unknown acceptance is not permission to resend the whole reply.
7. Preserve the terminal outcome, including logging-only mode, receipts, failures and timestamps. SMTP acceptance is not delivery, and a late bounce arrives through a separate incoming-mail handler. Treat correlation tokens and delivery reports as untrusted input, validate against the stored customer/attempt/recipient, and handle duplicates.

The code deliberately has no `main()` method and never chooses or connects to a server by itself. It fixes the article's sample Message-ID before submission so the observer can use the initial ID even if a transport supplies a different effective ID.

## Resource and reconfiguration limits

- Pool size is per relay pool and per process; async workers and queue capacity are per Mailer. Multiply before comparing with a customer's approved connection limit. The observer executor also needs its own capacity and shutdown policy.
- Core size zero and idle expiry do not bound the number of Mailers, executors or retained cluster definitions. The application still needs a bounded registry and retirement design.
- A password change retains the cluster key and its pool policy, pauses admission across the affected deployment, accounts for in-flight work, closes all old members and constructs the complete replacement group. A failed or partial replacement must remain paused and clean up newly built resources. Only then may approved jobs resume.
- First registration establishes cluster pool settings. Re-registering under the same key does not replace them. Closing the last Mailer must not be assumed to forget every retained cluster setting; a fresh key on every change is not proof of bounded metadata. A complete hot-reload registry needs lifecycle/churn tests before use.
- Offloaded observer work is application-owned. Draining sends and closing Mailers is not a substitute for accounting for pending persistence callbacks. Shutdown and credential revocation require explicit application decisions.

## Verification

The companion `tests/journal-examples/RelayDeskMailExamplesTest.java` checks message and DSN construction, attempt identity and observer correlation without SMTP. Compile it with this source against the current 10.0.0 classes and dependencies:

```powershell
$exampleClasses = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ('relaydesk-example-' + [Guid]::NewGuid().ToString('N')))
# Set $exampleClasspath to the current 10.0.0 development classes and dependencies.
javac -proc:none --release 11 -cp $exampleClasspath -d $exampleClasses.FullName `
  src/assets/journal/examples/relaydesk/RelayDeskMailExamples.java `
  tests/journal-examples/RelayDeskMailExamplesTest.java
if ($LASTEXITCODE -ne 0) { throw 'Compilation failed' }
java -cp "$($exampleClasses.FullName);$exampleClasspath" RelayDeskMailExamplesTest
```

These checks do not prove live SMTP authentication, DNS/egress restrictions, fair scheduling, callback durability, coordinated credential replacement or unbounded customer churn. No credentials or external mail service are needed for the tests.
