---
title: "When One Email Becomes a Million"
navigationTitle: "Email workload field guide"
description: "Find a sending pattern for your workload: occasional emails, scheduled batches, competing priorities, customer-owned servers and recovery after failure."
permalink: "/email-workload-field-guide.html"
typora-root-url: ..
typora-copy-images-to: ../assets/guides/email-workloads
---

Start with the deadline and the consequence of missing it, not the connection-pool size. A million newsletters spread over a day and a hundred login codes needed right now ask for different designs.

The numbers below are **illustrative design inputs, not benchmarks**. Unless stated otherwise, each message has one envelope recipient. A message addressed to ten people is still one message, but consumes ten recipient attempts. [SMTP acceptance is not proof that any of them received it](/analyzing-send-results.html#section-get-receipt).

| What needs doing? | Where it belongs |
| --- | --- |
| Compose, protect and submit messages; bound local asynchronous work; reuse connections; inspect submission results | Simple Java Mail |
| Keep jobs across restarts; decide priority, expiry and retry timing; coordinate quotas across servers | Your application |
| Accept submissions within its limits and attempt onward delivery | Your SMTP service |

The [API reference](/sending-and-execution.html) explains the settings. The [case studies](/case-studies.html) assemble them into larger applications. Here, choose the smallest pattern that meets your target. The snippets use reusable Mailers; a `MailerRegularBuilder` parameter means a builder whose [SMTP address, credentials](/configuration.html#section-programmatic-api-common) and [transport security](/security.html#section-security-routes) you have already configured.

[Download the Java examples](/assets/guides/email-workloads/FieldGuideExamples.java) and their [usage notes](/assets/guides/email-workloads/README.md). They demonstrate the calls below, not a ready-made queue or Dispatcher.

## Choose the sending shape

### A few emails a day

<p class="field-guide-goal"><strong>Target:</strong> Send about twenty confirmations a day without making an HTTP request wait for SMTP; acknowledge the request within two seconds.</p>

At this volume, a connection pool may buy you very little. Build [one reusable Mailer](/features.html#section-reusable-mailer) and start with direct sending. If the confirmation must survive a restart, [save a mail job with the business transaction](/case-studies/polar-meridian.html#leonie-places-her-order-and-ravi-gets-to-work) and let a background worker claim it. Moving work to another thread alone does not make it durable.

Once that worker has claimed a job and constructed its `Email`, a blocking send is perfectly reasonable:

```java
static MailSubmissionReceipt submitOne(Mailer mailer, Email email) {
    return mailer.sync().sendMail(email);
}
```

*Let the request finish; a background worker waits for SMTP and records the result.*

This returns a [submission receipt](/analyzing-send-results.html#section-get-receipt) on success; a failed submission can throw an exception carrying receipt facts too. Record the result against the job before choosing whether to retry. If losing an occasional notification is acceptable, an [asynchronous send](/sending-and-execution.html#section-send-execution) may be enough, but someone still needs to inspect its completion.

### A nightly invoice run

<p class="field-guide-goal"><strong>Target:</strong> Submit 5,000 invoices between 08:00 and 08:30, preserving progress if the run fails.</p>

That needs an average of about **2.8 messages per second**, including connection setup and failures. Before adding concurrency, measure a [sequential batch over one connection](/sending-and-execution.html#section-not-reusing-connections):

```java
static void submitInvoiceBatch(Mailer mailer, Iterable<Email> invoices) {
    mailer.sync().sendMailsInSimpleBatch(invoices);
}
```

*Reuse one connection before introducing a pool.*

The iterable can produce messages as needed rather than allocating all 5,000 upfront. The batch stops at the first failure; it does not return a receipt list for every invoice. Use the [completion observer](/sending-and-execution.html#section-mail-send-observer) to record attempted messages, and resume from the resulting job state—not from invoice number one.

A simple batch holds its connection between messages. [Long pacing pauses](/sending-and-execution.html#section-sending-limits) may therefore run into the relay's idle timeout. If the run is mostly waiting for permission to send, separately scheduled sends may suit it better. Any configured [whole-operation deadline](/sending-and-execution.html#section-send-deadlines) must also allow the batch to finish.

For a restartable run, a useful failure rehearsal is to reject invoice 101: the next run should neither repeat the hundred known submissions nor skip invoices that were never attempted.

### A million before the deadline

<p class="field-guide-goal"><strong>Target:</strong> Decide whether one million one-recipient messages fit the agreed sending window before buying more connections.</p>

The arithmetic changes sharply with the deadline:

| Sending window | Minimum average submission rate |
| --- | ---: |
| 24 hours | 11.6 messages/second |
| 4 hours | 69.4 messages/second |
| 1 hour | 277.8 messages/second |

If your approved upstream limit is 100 recipients per second, the one-hour target is impossible on that route. Even without interruptions, a million recipients need at least **2 hours, 46 minutes and 40 seconds**. Connections cannot negotiate that limit away; [local sending limits](/sending-and-execution.html#section-sending-limits) help pace attempts within the capacity you actually have.

For a rough concurrency estimate, multiply the required rate by the measured time an attempt occupies a connection. At 277.8 attempts/second and an assumed 0.2 seconds per attempt, that's about 56 concurrent attempts. This is a starting estimate, not a pool recommendation: attachment sizes, slow replies, recipient counts and retries change it. Measure the actual messages against a representative fixture, then against an authorized test route.

<p class="field-guide-return"><a href="#scenario-directory">Find another scenario ↑</a></p>

## Control arrival and contention

### The producer outruns SMTP

<p class="field-guide-goal"><strong>Target:</strong> Allow four asynchronous workers and at most twenty waiting jobs, without building an unlimited in-memory backlog.</p>

The producer can enqueue much faster than the relay can accept mail. [Bound that queue](/sending-and-execution.html#section-async-queue), and decide what happens when it fills. With the optional [batch module](/modules.html#batch-module) installed, this configuration separates worker capacity from [SMTP connections](/sending-and-execution.html#section-reusing-connections):

```java
static Mailer boundedPool(MailerRegularBuilder smtpBuilder) {
    return smtpBuilder
        .withThreadPoolSize(4)                 // four active asynchronous jobs
        .withAsyncQueueCapacity(20)            // twenty more may wait in memory
        .withAsyncQueueOverflowPolicy(AsyncQueueOverflowPolicy.REJECT)
        .withConnectionPoolCoreSize(0)         // no permanently warm connections
        .withConnectionPoolMaxSize(2)          // at most two pooled connections
        .buildMailer();
}
```

*Stop admitting more work before the relay's slowdown becomes your heap problem.*

A worker waiting for a pooled connection still occupies a worker slot. Four workers do not mean four simultaneous SMTP conversations when the pool permits only two connections.

[Queue rejection](/sending-and-execution.html#section-async-queue) arrives through the returned send's completion as `MailSendRejectedException`; `getReason()` distinguishes `QUEUE_FULL` from other admission failures. Leave a rejected durable job pending and try later with backoff. Don't immediately loop over the same failed call, and don't treat a closed executor as a busy queue. [Staple & Sons](/case-studies/staple-and-sons.html#give-the-servers-a-chance-to-breathe) shows the surrounding dispatch code.

This bounds waiting tasks, not every byte your application might allocate. Thousands of callers constructing large attachments before submission can still exhaust memory.

### The service allows thirty a minute

<p class="field-guide-goal"><strong>Target:</strong> Pace local attempts to thirty messages per minute instead of spending the whole minute's capacity in one burst.</p>

For a limit expressed in messages, use a [message-rate rule](/sending-and-execution.html#section-sending-limits). A service counting recipients needs a recipient-rate rule instead:

```java
static Mailer pacedMailer(MailerRegularBuilder smtpBuilder) {
    return smtpBuilder
        .withMessageRateLimit(30, Duration.ofMinutes(1))
        .withRateLimitGroup("transactional-account")
        .withRateLimitBurstsAllowed(false)
        .buildMailer();
}
```

*Spread local attempts out rather than turning a minute's quota into a burst.*

Mailers built by the **same `SimpleJavaMail` factory**, with the same group and compatible rules, share this local rate history. A new factory or JVM does not share it. This is not a persisted daily quota or a fleet-wide agreement with the provider.

The limiter counts attempted submissions, not successful inbox deliveries. Once the provider send begins, a rejection or uncertain result does not refund that attempt. Waiting for the rate limit also occupies the sending worker; ordinary pooled sends wait before claiming a connection, while an open-connection batch already holds one. See the [local sending-limit semantics](/sending-and-execution.html#section-sending-limits) before combining the settings.

### Login codes behind a newsletter

<p class="field-guide-goal"><strong>Target:</strong> Keep the 99th-percentile queue wait for login codes below five seconds while sending a 300,000-recipient newsletter.</p>

A ninety-second login code should not spend eighty seconds waiting for bulk mail. Give urgent jobs their own scheduling priority and expiry check. Reserve enough upstream rate and daily quota for them in your Dispatcher; separate executors and connection pools can prevent bulk work from occupying every local slot, but they cannot create additional provider capacity.

Suppose the shared account permits 100 recipients per second. Limiting bulk work to 80 leaves 20 for urgent requests; the newsletter then needs at least **62.5 minutes**. That split is application policy, enforced across the sending fleet—not a Simple Java Mail priority setting. The application must also protect urgent work from exhaustion of any rolling daily quota.

[Polar Meridian's Dispatcher](/case-studies/polar-meridian.html#getting-mail-jobs-to-share-not-compete) demonstrates the surrounding scheduling. Use Simple Java Mail for the resulting send, and measure queue wait separately from its [preparation, connection wait and SMTP time](/analyzing-send-results.html#section-send-timings).

<p class="field-guide-return"><a href="#scenario-directory">Find another scenario ↑</a></p>

## Separate connections deliberately

### Three replicas share one account

<p class="field-guide-goal"><strong>Target:</strong> Keep a shared SMTP account within its connection and rate limits when the application scales from one instance to three.</p>

[Pool settings](/sending-and-execution.html#section-reusing-connections) are local. Three application instances, each with two pools capped at five connections, can open **thirty connections**, not five. If each instance has four asynchronous workers, that's twelve workers across the fleet; the connection maximum and active-worker count still describe different resources.

The same multiplication applies to [independent local rate histories](/sending-and-execution.html#section-sending-limits). Three instances configured for thirty attempts per minute can collectively attempt ninety. Assigning the same group name does not turn those JVMs into a distributed limiter.

Divide the permitted capacity between instances, or coordinate admission centrally. Include rolling deployments: old and new instances overlap. Then inspect actual connection counts and quota consumption, rather than assuming that an autoscaling setting describes either.

### Customers bring their own servers

<p class="field-guide-goal"><strong>Target:</strong> Let customer B continue sending when customer A's credentials stop working, without sending A's mail through B's servers.</p>

Keep each customer's approved SMTP configuration and reusable Mailers separate. If you use pooling, distinct [cluster keys](/sending-and-execution.html#section-clustering) prevent those customers' connections from being grouped together:

```java
static Mailer customerMailer(
        MailerRegularBuilder customerSmtpBuilder, UUID customerClusterKey) {
    return customerSmtpBuilder
        .withClusterKey(customerClusterKey)
        .withConnectionPoolCoreSize(0)
        .withConnectionPoolMaxSize(2)
        .buildMailer();
}
```

*Reuse a customer's permitted connections without borrowing another customer's route.*

Keep the key in your customer configuration and use it consistently for that customer's equivalent relays. It is a connection-group identifier, not an authorization check or a data-security sandbox. Your application must still check whose message it is, select permitted routes and schedule customers fairly.

When A's credentials fail, hold A's jobs while its administrator supplies replacements. [Build replacement Mailers from the new configuration](/configuration.html#section-config-snapshot); B's working server is not a fallback. [RelayDesk](/case-studies/relaydesk.html) takes this through onboarding, credential replacement and customer-specific protection requirements.

### One hostname or two relays

<p class="field-guide-goal"><strong>Target:</strong> Reuse or balance connections only across SMTP routes that are genuinely interchangeable for the message.</p>

Two server addresses are not automatically two eligible destinations:

| What you were given | A reasonable starting point |
| --- | --- |
| One managed SMTP hostname | [One reusable Mailer](/features.html#section-reusable-mailer); the service operator manages the servers behind it |
| Two equivalent, approved relays | [Register both Mailers in one cluster](/sending-and-execution.html#section-clustering) with matching pool settings |
| EU-only and US-only routes | Separate groups; select the permitted region before submitting |
| Different customers' servers | Separate configuration and groups; no cross-customer fallback |

Build the intended Mailers before starting the workload. Shared cluster membership lets eligible Mailers use registered connections; it does not decide which region or customer is allowed to handle a message. Nor does it make retries idempotent. After a connection fails, [inspect the attempt's result](/analyzing-send-results.html#section-retry-decisions) before choosing another route.

The [clustering reference](/sending-and-execution.html#section-clustering) covers registration and shared pool settings. You don't need that machinery just because a managed hostname resolves to multiple backend servers.

### The customer rotates credentials

<p class="field-guide-goal"><strong>Target:</strong> Resume a customer's held jobs only after verifying its replacement credentials; keep other customers sending throughout.</p>

The administrator has changed the password, but your existing Mailer and pooled connections still belong to the old configuration. Pause new handoffs for that customer's affected route, account for in-flight attempts and [drain its old Mailers](/sending-and-execution.html#section-mailer-lifecycle). Build replacements rather than mutating a live connection group.

Use an [authenticated connection probe](/debugging.html#section-smtp-capabilities) before publishing the replacement:

```java
static void verifyReplacement(Mailer replacementMailer) {
    SmtpConnectionReport report = replacementMailer.sync().probeConnection(true);
    if (!report.isSuccessful() || !report.isAuthenticated()) {
        throw new IllegalStateException("Replacement SMTP credentials not verified");
    }
}
```

*Check the replacement credentials without sending a customer message.*

The probe opens a fresh connection; it sends no email and does not warm the pool. Authentication success still doesn't prove that the server permits the required sender, recipients or message content. Follow it with a controlled test email, then release held jobs. A failed check leaves this route paused, not eligible for another customer's working server. [RelayDesk's replacement flow](/case-studies/relaydesk.html#update-kestrel-s-settings-without-stopping-juniper) shows the handover.

<p class="field-guide-return"><a href="#scenario-directory">Find another scenario ↑</a></p>

## Prepare before submission

### The PDF fits, but the email does not

<p class="field-guide-goal"><strong>Target:</strong> Detect an oversized invoice before submitting it, using the complete encoded message rather than the PDF's file size.</p>

The customer accepts attachments up to a certain size, but its relay limits the whole email. [MIME encoding](/features.html#section-content-transfer-encoding), headers, other attachments and any signing or encryption all contribute. Measure the prepared message:

```java
static long preparedBytes(Mailer mailer, Email email) {
    return mailer.rehearse(email).getEncodedSize();
}
```

*Measure what would be sent, not just what was attached.*

[Rehearsal](/features.html#section-email-validation) applies the Mailer's configuration and prepares the message offline. It contacts no server. Compare the result with your application's [maximum email size](/features.html#section-maximum-emailsize) and the relay's advertised `SIZE` maximum, when known. A [probe](/debugging.html#section-smtp-capabilities) can help during onboarding, but the actual sending connection determines the current server limit.

For the managed Angus transport, an oversized message is rejected before `MAIL FROM` when that connection advertises a usable maximum. [Receipt size facts](/analyzing-send-results.html#section-message-size) distinguish the prepared size from the server limit, so ticket feedback can say which constraint the attachment hit. Missing capability information is unknown, not proof that any size is allowed. Offer a smaller document or an approved download link; repeatedly retrying the same bytes won't shrink them.

### A recipient address needs SMTPUTF8

<p class="field-guide-goal"><strong>Target:</strong> Identify whether a customer's configured relay can submit to an internationalized mailbox before enabling that workflow.</p>

A support reply to `采购@partner.com` needs [`SMTPUTF8`](/features.html#section-international-mail) because the mailbox's local part contains non-ASCII characters. A subject saying “Résumé” does not necessarily need it: MIME header encoding can represent that text without raw UTF-8 headers.

Inspect the [effective capabilities](/debugging.html#section-smtp-capabilities) reported by the customer's connection probe:

```java
static Optional<Boolean> advertisesSmtpUtf8(SmtpConnectionReport report) {
    return report.getEffectiveCapabilities()
        .map(capabilities -> capabilities.supports("SMTPUTF8"));
}
```

*Distinguish an advertised capability, its absence and an incomplete probe.*

An empty `Optional` means the probe didn't establish the capability set; `false` means the inspected set lacks `SMTPUTF8`. [`8BITMIME`](/features.html#section-international-mail) answers a different question about raw eight-bit body content. Simple Java Mail checks the actual message against the sending connection, so onboarding information isn't a permanent guarantee. Hold incompatible messages and explain the requirement to the customer's administrator. Don't enable a [legacy content exception](/configuration.html#section-legacy-smtp-content) for every customer to make one failure disappear.

### A partner update must stay confidential

<p class="field-guide-goal"><strong>Target:</strong> Send maintenance instructions only to approved partners, protected for their keys, without silently downgrading required transport encryption.</p>

Prepare a separately encrypted message for each partner using [S/MIME](/security.html#section-sending-smime), or use [OpenPGP](/security.html#section-sending-openpgp) where that is the established partner requirement. Resolve approved recipient keys from your application configuration; if a key is unavailable or expired, hold the message rather than sending plaintext. Choosing who owns a key is not a side effect of [email-address validation](/features.html#section-email-validation).

For messages that also require encrypted onward transport, add [`.withTlsRequiredForOnwardDelivery()`](/security.html#section-requiretls) to the email builder. S/MIME protects the content; REQUIRETLS tells cooperating SMTP servers to retain transport encryption. The submission server must support the requirement or the send fails—there is no silent fallback. Neither mechanism proves final delivery.

[Polar Meridian's partner messages](/case-studies/polar-meridian.html#one-protected-message-several-partners) show per-recipient preparation. [RelayDesk](/case-studies/relaydesk.html#protect-kestrel-s-wholesale-replies) instead accommodates a customer's OpenPGP policy. In either design, encrypting the outgoing message leaves any readable application archive unprotected; decide how retained copies and keys will be secured too.

### Reproduce last month's instructions

<p class="field-guide-goal"><strong>Target:</strong> Retrieve the maintenance instructions actually submitted last month without recreating them from today's template and configuration.</p>

A business-event ID identifies why you sent something; it doesn't preserve what you sent. Retain [finalized EML alongside the explicit SMTP envelope](/features.html#section-exact-eml) and attempt metadata for streams that need this evidence. Other streams, such as short-lived login codes, can retain metadata without keeping the content.

[Polar Meridian's archive](/case-studies/polar-meridian.html#what-happened-to-leonie-s-confirmation-tracing-the-evidence) prepares, signs and encrypts the message, commits a safe outbound representation, then submits those same bytes through [`startingFromExactEml(...)`](/features.html#section-exact-eml). Sender, recipients, [DSN settings](/features.html#section-delivery-status-notification) and [REQUIRETLS](/security.html#section-requiretls) are separate submission metadata: saving just the EML is not enough to preserve that envelope and transport policy.

Exact submission bypasses ordinary composition and keeps the supplied bytes, including any accidental `Bcc` header. Reject an unsafe outbound representation before archiving or sending it; silently rewriting protected bytes defeats the point. Archive failure must stop submission if preserving the evidence was a prerequisite.

This can complement existing corporate journaling. The record establishes what the application submitted—not receipt, reading or automatic legal compliance. Access, retention and continued access to encrypted records remain your responsibilities. An archived message is evidence to inspect, not an instruction to resend it.

<p class="field-guide-return"><a href="#scenario-directory">Find another scenario ↑</a></p>

## Recover without guessing

### One support reply, three recipient results

<p class="field-guide-goal"><strong>Target:</strong> Explain a partially submitted support reply and retry only the recipients whose temporary failures permit it.</p>

The buyer, warehouse and supplier are copied on one reply. The relay accepts the buyer, temporarily rejects the warehouse and permanently rejects the supplier. If the workflow permits sending to the recipients it can accept, enable [partial sending](/analyzing-send-results.html#section-partial-send) on this email:

```java
static Email allowPartialReply(SimpleJavaMail mail, Email supportReply) {
    return mail.emailBuilder().copying(supportReply)
        .withSendingToAcceptedRecipients(true)
        .buildEmail();
}
```

*Let the buyer's copy proceed without pretending every recipient succeeded.*

A partial send still reports a failed operation with receipt facts. Use [`getRecipientResults()`](/analyzing-send-results.html#section-recipient-details) for ticket feedback, and [`getRetryDisposition()` and `getRetryableRecipients()`](/analyzing-send-results.html#section-retry-decisions) to select the next action. The warehouse may qualify for a later attempt; the supplier needs a corrected address or another change. Don't repeat the buyer's known submission.

Your application rebuilds the retry envelope and chooses timing and authorization. If the final acceptance reply was lost, [investigate the uncertainty](/analyzing-send-results.html#section-unknown-acceptance) instead of treating that recipient as unsubmitted. [RelayDesk's support reply](/case-studies/relaydesk.html#retry-the-warehouse-s-copy-not-the-buyer-s) carries these facts back to the ticket.

### SMTP may have accepted the message

<p class="field-guide-goal"><strong>Target:</strong> Retry known unsubmitted recipients without repeating known submissions; hold ambiguous attempts for investigation.</p>

If the connection drops after message data was transmitted, “the send failed” may be all your application knows. The relay could already have accepted it. Retrying the entire message then risks duplicates.

Inspect the `MailSubmissionReceipt` from the successful send, or from the failed attempt's [submission exception or observer result](/analyzing-send-results.html#section-get-receipt). Its retry guidance does not itself schedule anything:

```java
static List<MailRecipientResult> recipientsSafeToRetry(
        MailSubmissionReceipt receipt) {
    switch (receipt.getRetryDisposition()) {
        case SAFE_TO_RETRY_ALL:
        case SAFE_TO_RETRY_UNACCEPTED:
            return receipt.getRetryableRecipients();
        default:
            return Collections.emptyList();
    }
}
```

*Use known recipient results before deciding what another attempt may contain.*

An empty list is **not** a declaration of success. [`DUPLICATE_RISK`](/analyzing-send-results.html#section-unknown-acceptance) needs investigation; [`CALLER_POLICY_REQUIRED`](/analyzing-send-results.html#section-retry-decisions) means the facts are insufficient for automatic advice. `DO_NOT_RETRY` covers accepted messages and rejections that require a change. Record the disposition and recipient results, then apply your own retry timing and attempt limit.

If [partial sending](/analyzing-send-results.html#section-partial-send) is enabled, rebuild the retry envelope from eligible recipients only. Do not resend to recipients already accepted by the relay. [RelayDesk's recipient-specific example](/case-studies/relaydesk.html#retry-the-warehouse-s-copy-not-the-buyer-s) shows the required configuration and ticket feedback; [later bounces](#the-invoice-was-accepted-then-bounced) remain a separate stage.

### The invoice was accepted, then bounced

<p class="field-guide-goal"><strong>Target:</strong> Attach a later delivery failure to the correct invoice attempt without rewriting its earlier SMTP acceptance as final delivery.</p>

The relay accepted the invoice yesterday. Today the destination reports a full mailbox. These are two observations about different stages, not contradictory results. Keep submission state and later-delivery feedback separately so the application can explain both.

Use a monitored [envelope-sender address](/features.html#section-bouncing-emails) for bounce traffic; `Reply-To` directs human replies and is not a substitute. Request the [DSN notifications](/features.html#section-delivery-status-notification) the workflow needs, then retain the receipt's [`getEnvelopeId()`](/features.html#section-dsn-envelope-id) when available. This attempt identifier helps correlate a returned DSN's `Original-Envelope-Id`; keep the [Message-ID](/features.html#section-custom-id) and business-event ID too. Not every relay supports DSN or supplies all those fields.

Simple Java Mail submits the message and reports the submission. Your inbound processor parses and validates bounce feedback, matches it to an attempt and updates invoice follow-up. A later failure may warrant contacting the customer or correcting the address, not blindly sending the invoice again. [RelayDesk's bounce continuation](/case-studies/relaydesk.html#accepted-by-smtp-then-a-bounce-arrives) connects the two stages.

### A slow send is not always slow SMTP

<p class="field-guide-goal"><strong>Target:</strong> Identify the dominant wait in slow attempts before changing worker counts, connection pools or provider capacity.</p>

The HTTP request finished quickly, but the confirmation took seconds to leave. Record the [send diagnostics](/analyzing-send-results.html#section-send-timings) from the [completion observer](/analyzing-send-results.html#section-observer-results):

```java
static Mailer observedMailer(MailerRegularBuilder smtpBuilder,
                             Consumer<MailSendDiagnostics> recordTimings) {
    return smtpBuilder
        .withMailSendObserver(outcome ->
            outcome.getDiagnostics().ifPresent(recordTimings))
        .buildMailer();
}
```

*Record measured phases alongside the attempt result, rather than blaming SMTP for every delay.*

For example, an illustrative excerpt might show:

```text
Scheduling: PT0.02S
Sending-limit wait: PT1.8S
Connection acquisition: PT0.002S
Submission: PT0.11S
```

*Most of this wait is deliberate pacing; another connection won't remove it.*

Combine this timing handler with your existing result-recording observer; don't replace the archive callback just to add a metric. Keep the handler lightweight, or delegate storage through the [observer executor](/sending-and-execution.html#section-mail-send-observer).

Scheduling measures local admission-to-worker delay, not time spent in your durable job store. Connection acquisition includes connection setup or pool wait; it is not a separate DNS/TLS stopwatch. Unavailable measurements are not zero. Compare these phases with queue age and outcomes, as [Noor's monitoring](/case-studies/polar-meridian.html#noor-monitors-for-performance-degradation) does, before deciding what to tune. You don't need [raw SMTP debug logs](/debugging.html#section-debug-logging), potentially containing sensitive messages, to measure these waits.

### An outage leaves a backlog

<p class="field-guide-goal"><strong>Target:</strong> Drain 72,000 overdue jobs within an hour without making newly arriving urgent mail wait behind them.</p>

Clearing 72,000 jobs in an hour needs twenty (additional) submissions per second. If normal traffic already consumes eighty of an approved hundred per second, that uses all the remaining capacity—with no room for retries or slower responses. Either allow more time, reduce other work or arrange more upstream capacity.

Start recovery with expired jobs and permanent failures removed from the sending queue. Old login codes are not useful work. [Pace the remaining attempts](/sending-and-execution.html#section-sending-limits), preserve their business-event identity, and give each new attempt its own [Message-ID](/features.html#section-custom-id). [Known submissions and uncertain results](#smtp-may-have-accepted-the-message) need different treatment; replaying the entire outage window is not a recovery strategy.

Watch queue age by priority, current urgent-mail latency and attempts per business event. A declining backlog is encouraging, but not if fresh requests are now late or repeated attempts are making the relay busier. [Polar Meridian](/case-studies/polar-meridian.html#noor-monitors-for-performance-degradation) shows the archive and monitoring behind those questions.

### A deployment must stop cleanly

<p class="field-guide-goal"><strong>Target:</strong> Stop accepting new jobs, account for admitted sends and finish required result-writing callbacks before the deployment terminates the process.</p>

[Closing a Mailer](/sending-and-execution.html#section-mailer-lifecycle) drains its accepted work, but a send can finish before an [executor-backed observer](/sending-and-execution.html#section-mail-send-observer) writes the result. If your application supplied that executor, drain it separately:

```java
static void stopSending(
        Runnable stopAndAwaitDispatch,
        Mailer mailer,
        ExecutorService observationWorkers) throws Exception {
    stopAndAwaitDispatch.run(); // application stops claiming and handing off jobs
    mailer.close();             // drain sends and observer handoff attempts
    observationWorkers.shutdown();
    if (!observationWorkers.awaitTermination(30, TimeUnit.SECONDS)) {
        throw new IllegalStateException("Result-writing callbacks still pending");
    }
}
```

*Drain the sending work, then the application's result-writing workers.*

`stopAndAwaitDispatch` is your application's shutdown step, not a Simple Java Mail method. It must stop new handoffs and wait for any already in progress. Call this from the shutdown coordinator, not inside a send or its observer. The thirty-second callback timeout is an example policy; it does not put a thirty-second deadline on `mailer.close()`.

Choose [send deadlines](/sending-and-execution.html#section-send-deadlines) that fit your deployment grace period. If the process is killed before recording a result, keep that attempt uncertain rather than returning it to the ordinary unsent queue. Closing resources successfully does not establish that every send succeeded.

<p class="field-guide-return"><a href="#scenario-directory">Find another scenario ↑</a></p>
