# Polar Meridian's dispatcher

This is the assembled application example for the [Polar Meridian case study](/journal/mail-at-polar-meridian-systems.html), using the Simple Java Mail 10.0.0 API. It is not an SJM feature or a ready-to-deploy mail service.

- [PolarMeridianDispatcher.java](PolarMeridianDispatcher.java): polling, permission checks, message preparation, dispatch decisions, attempt insertion, submission, result handling and stopping the polls.
- [OrderConfirmationComposer.java](OrderConfirmationComposer.java): the article's concrete conversion of a stored order-confirmation request into an SJM Email, with its Mailer and retention choice.
- [JdbcDispatchLimits.java](JdbcDispatchLimits.java): the shared PostgreSQL-backed admission check.
- [dispatch-limits.sql](dispatch-limits.sql): tables and explicitly fictional allocations.

## Connect it to your application

The dispatcher is assembled; your existing application supplies the `MailOutbox`, `MessagePreparation` and `AttemptArchive` adapters. Their contracts are documented beside the interfaces. They are intentionally not fake in-memory substitutes for durable storage, certificate validation or authorization.

Keep the configuration separate: SJM's builders configure the Email and Mailer (addresses, message protection, SMTP/TLS, pools and local workers). The application configures sending permissions, traffic classes, database-backed sending limits and archive retention. `ComposedMail` and `PreparedMail` are application classes that carry both kinds of information; they are not SJM APIs.

`sendingQuotaGroup`, for example `"eu-application-mail"`, is the Dispatcher's shared sending-limit group. All instances using that name and the same workload consult the same database counters. It becomes the third argument (`sendingQuotaGroup`) of the application's `SendLimits.tryAcquire(...)`, selecting the `(sending_quota_group, workload)` database row. It is never passed to an SJM API, pool or SMTP server. `Retention` likewise controls the application archive, not a library setting.

`MessagePreparation.checkPermissions(job)` checks the requesting application's current sending permissions before `compose(job)` loads the request and constructs an Email. Composition returns a `ComposedMail` containing that Email, its permitted Mailer, the shared sending quota group and an approved retention rule. It supplies any required signing/encryption configuration; rehearsal applies that protection later. Use `Retention.EXACT_EML` for order confirmations and maintenance updates, and `METADATA_ONLY` for login codes, newsletters and other streams. Retention is not inferred from traffic priority or accepted unchecked from the requester.

For order-confirmation jobs, the application's `MessagePreparation` implementation connects the repository to the composer as follows. `orderConfirmations` is the application's repository for saved confirmation requests; `orderConfirmationComposer` is an `OrderConfirmationComposer` constructed with the SJM factory. This European deployment selects the SJM `orderConfirmationMailer` and the Dispatcher limit group `"eu-application-mail"`:

```java
@Override
public ComposedMail compose(Job job) {
    OrderConfirmation confirmation =
        orderConfirmations.loadByRequestId(job.requestId);
    return orderConfirmationComposer.composeOrderConfirmation(
        confirmation, orderConfirmationMailer, "eu-application-mail");
}
```

This is the order-confirmation implementation, not a catch-all for login codes, newsletters or maintenance updates. The application selects their corresponding composition logic while keeping the Dispatcher's `preparation.compose(job)` call unchanged. The helper constructs the Email with SJM; it does not implement authorization or load requests from a database. If the application uses a template engine, rendering the subject and body is only one part of composition.

After fixing a fresh Message-ID, the dispatcher calls `mailer.rehearse(email)`. `checkFinalMessage()` inspects that full rehearsal's effective message, actual envelope, size and protection, including factory defaults and Mailer configuration. It rejects logging-only Mailers for real requests. Preparation checks happen outside the send timeout, so bound template/certificate/storage work and measure it in the application's end-to-end target. No SMTP connection is made by rehearsal.

Quota accounting uses the rehearsed SMTP envelope, not just visible To/Cc headers. The example explicitly carries override recipients when copying an Email; the current `copying(...)` API does not copy that list. Do not mutate the selected Mailer/Session/configuration while a job is being prepared or sent. Metadata-only sends use the original composed inputs after rehearsal; their later MIME rendering is not claimed to be byte-identical.

Configure reusable Mailers, their bounded worker queues and the `MailSendObserver` as shown in the article. Pass the same bounded `observationWorkers` executor as `completionWorkers` here, with explicit rejection and failure monitoring. It handles both archive observations and request-result updates; asynchronous callback failures leave requests unresolved for investigation, not automatically retryable. Never use a silent-discard policy.

Then construct and start the dispatcher:

```java
PolarMeridianDispatcher dispatcher = new PolarMeridianDispatcher(
    mail, outbox, preparation, new JdbcDispatchLimits(dataSource), archive,
    observationWorkers, failure -> log.error("Dispatcher needs attention", failure),
    Clock.systemUTC());
dispatcher.start();
```

Each workload has its own polling task, running one job per pass. The 20ms polling delay is illustrative, not a throughput guarantee. Tune polling, database timeouts, preparation concurrency and upstream margins together. Use a finite, bounded-time database connection pool; do not share an exhausted bulk-only resource with urgent processing.

## What the quota code does

Every instance shares the same PostgreSQL database. A transaction locks one pre-provisioned `(sending_quota_group, workload)` row with `SELECT ... FOR UPDATE`, reads usage using the database clock, checks both limits and records a charge before committing. No SMTP or certificate work takes place while that lock is held. The same check in a Java `synchronized` block would not coordinate separate processes.

Workload allocations are separate, so bulk cannot spend the urgent allocation. Their sums must fit the messaging team's allocation to this service, accounting for every other sender using the upstream quota. The examples do not configure AWS, automatically discover provider quotas or promise extra SMTP capacity. A sending quota group is a shared accounting key, not a pool or cluster UUID.

These are **application admission limits**. Async preparation/queues can move or bunch up actual SMTP attempts; relay-side rate enforcement and operational margin remain necessary. A bounded local queue is not a global rate limiter.

Successful charges remain counted until 24 hours after completion, conservatively covering time spent queued before SMTP. Unfinished, failed or uncertain attempts remain charged pending investigation. Only `QUEUE_FULL`, which proves no SMTP work occurred, is refunded automatically. This sacrifices some capacity rather than guessing whether a missing result consumed provider quota. Reconcile outstanding charges with durable attempt/relay evidence; do not expire them or retry their mail blindly.

The ledger query favours an inspectable example over optimized high-volume accounting. Profile it with real retention and concurrency, and use tested rollups or a dedicated shared limiter if it becomes a bottleneck. Do not infer the article's throughput from this sample.

## Queue and failure handling

The outbox atomically claims only due, unexpired work. Each claim gets a token, and subsequent updates must match it. Preserve the original request time and deadline when deferring. Keep unresolved claims on hold during recovery: a process can die after SMTP acceptance but before recording that result.

Preparation failures hold the job before submission. Missing or invalid certificates never cause plaintext fallback. `QUEUE_FULL` defers for five seconds; `ACCEPTED` records confirmed submission. Partial/unknown acceptance, other failures and missing receipts are held for review. The example deliberately does not implement automatic recipient-level retry or exactly-once delivery.

The application archive and the quota ledger are separate concerns. Failure to insert an attempt prevents its send; uncertain database failures after a charge leave that charge for review.

## Retaining the attempted communication

`AttemptArchive.insertAttempt()` receives an `AttemptEvidence`, never the `Email` or `MailRehearsal` object. The metadata includes the envelope sender, ordered recipient occurrences and DSN preferences, shared DSN/ENVID, REQUIRETLS and encoded size. The separately supplied attempt Message-ID and business-event ID connect it to the request. `getEmlBytes()` is empty for metadata-only messages: do not fetch their bodies from elsewhere to fill it in. Recipients and metadata still require restricted access.

For retained messages, full rehearsal performs signing/encryption first. `finishSmtpLine()` explicitly supplies the final CRLF that SMTP would add to an unterminated last line. It never repairs bare CR/LF or reserializes MIME; tests cover signature validity and decryption after this finalization. `exactSubmission()` rejects Bcc, Resent-Bcc and Content-Length headers and requires an explicit `withBounceTo(...)` sender. Templates needing hidden recipients must use an approved separate envelope without emitting Bcc headers. Do not strip or normalize protected content to make a rejected snapshot pass.

The exact builder preserves those finalized bytes and explicitly restores envelope recipients, recipient-level NOTIFY, shared DSN/ENVID and REQUIRETLS. It deliberately bypasses a second defaults/overrides/signing pass. The archive encrypts and commits its copy before the exact Email reaches the send API; the observer calls `recordOutcome()` on the same archive adapter to update that attempt by Message-ID, including failures. Outcome writes must be thread-safe and idempotent. These are submission records, not delivery receipts or automatic legal compliance, and can complement corporate journaling.

Implement storage encryption, access auditing and retention in the archive adapter. Retaining encrypted S/MIME without an approved means of decrypting it later is not a readable long-term record: arrange archival key access or a separately protected readable record under the company's records policy. Private signing keys and passwords must not be serialized as archive content.

On shutdown, call `dispatcher.stopAndAwait()`, close the Mailers, then shut down and await `observationWorkers`. A failed wait is an operational failure, not permission to pretend all work finished. In-flight result callbacks may still use the outbox, archive and quota database until the executor drains.

## Verification and further work

The repository includes focused tests under `tests/journal-examples/`. They compile against the current 10.0.0 development APIs and exercise real offline MIME/S/MIME preparation, fake send calls and JDBC accounting on an in-memory H2 database. Checks include selective retention, preserved EML/envelopes/DSN/REQUIRETLS, unsafe headers, rejected preparations and archive/result failures. The S/MIME fixture verifies decryption and signature integrity, not production certificate trust. H2 tests are not PostgreSQL integration tests or a performance benchmark. No test sends external mail.

Before deployment, implement and test the application adapters, PostgreSQL concurrency, outages/recovery, permissions, certificate/PKI validation, encrypted storage, callback rejection and fleet shutdown in your own environment. The example is not a substitute for those integrations.

References: [PostgreSQL row locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS), [database clock functions](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).
