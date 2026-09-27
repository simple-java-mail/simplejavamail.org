# Polar Meridian's dispatcher

This is the assembled application example for the [Polar Meridian case study](/journal/mail-at-polar-meridian-systems.html), using the Simple Java Mail 10.0.0 API. It is not an SJM feature or a ready-to-deploy mail service.

- [PolarMeridianDispatcher.java](PolarMeridianDispatcher.java): polling, permission checks, message preparation, dispatch decisions, attempt insertion, submission, result handling and stopping the polls.
- [JdbcDispatchLimits.java](JdbcDispatchLimits.java): the shared PostgreSQL-backed admission check.
- [dispatch-limits.sql](dispatch-limits.sql): tables and explicitly fictional allocations.

## Connect it to your application

The dispatcher is assembled; your existing application supplies the `MailOutbox`, `MessagePreparation` and `AttemptArchive` adapters. Their contracts are documented beside the interfaces. They are intentionally not fake in-memory substitutes for durable storage, certificate validation or authorization.

`MessagePreparation` loads the request and current permissions, chooses a permitted Mailer, renders the template and applies any required S/MIME protection. It can use the article's `protectedRecipient()` helper. After the dispatcher assigns a fresh attempt Message-ID, `checkFinalMessage()` checks the complete message, including the effect of factory defaults and Mailer configuration. All envelope recipients must be included in the count; this example forbids later recipient additions/rewrites and rejects logging-only Mailers for real requests.

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

Every instance shares the same PostgreSQL database. A transaction locks one pre-provisioned `(quota_scope, workload)` row with `SELECT ... FOR UPDATE`, reads usage using the database clock, checks both limits and records a charge before committing. No SMTP or certificate work takes place while that lock is held. The same check in a Java `synchronized` block would not coordinate separate processes.

Workload allocations are separate, so bulk cannot spend the urgent allocation. Their sums must fit the messaging team's allocation to this service, accounting for every other sender using the upstream quota. The examples do not configure AWS, automatically discover provider quotas or promise extra SMTP capacity. A scope is a shared accounting key, not a pool or cluster UUID.

These are **application admission limits**. Async preparation/queues can move or bunch up actual SMTP attempts; relay-side rate enforcement and operational margin remain necessary. A bounded local queue is not a global rate limiter.

Successful charges remain counted until 24 hours after completion, conservatively covering time spent queued before SMTP. Unfinished, failed or uncertain attempts remain charged pending investigation. Only `QUEUE_FULL`, which proves no SMTP work occurred, is refunded automatically. This sacrifices some capacity rather than guessing whether a missing result consumed provider quota. Reconcile outstanding charges with durable attempt/relay evidence; do not expire them or retry their mail blindly.

The ledger query favours an inspectable example over optimized high-volume accounting. Profile it with real retention and concurrency, and use tested rollups or a dedicated shared limiter if it becomes a bottleneck. Do not infer the article's throughput from this sample.

## Queue and failure handling

The outbox atomically claims only due, unexpired work. Each claim gets a token, and subsequent updates must match it. Preserve the original request time and deadline when deferring. Keep unresolved claims on hold during recovery: a process can die after SMTP acceptance but before recording that result.

Preparation failures hold the job before submission. Missing or invalid certificates never cause plaintext fallback. `QUEUE_FULL` defers for five seconds; `ACCEPTED` records confirmed submission. Partial/unknown acceptance, other failures and missing receipts are held for review. The example deliberately does not implement automatic recipient-level retry or exactly-once delivery.

The encrypted application archive and the quota ledger are separate concerns. Failure to insert an attempt prevents its send; uncertain database failures after a charge leave that charge for review. Retaining an `Email` object does not preserve the final transmitted EML. Use SJM's finalized/preserved-message APIs if that evidence is required.

On shutdown, call `dispatcher.stopAndAwait()`, close the Mailers, then shut down and await `observationWorkers`. A failed wait is an operational failure, not permission to pretend all work finished. In-flight result callbacks may still use the outbox, archive and quota database until the executor drains.

## Verification and further work

The repository includes focused tests under `tests/journal-examples/`. They compile against the current 10.0.0 development APIs and exercise simulated sends plus JDBC accounting on an in-memory H2 database. H2 tests are not PostgreSQL integration tests or a performance benchmark. No test sends mail.

Before deployment, implement and test the application adapters, PostgreSQL concurrency, outages/recovery, permissions, certificate/PKI validation, encrypted storage, callback rejection and fleet shutdown in your own environment. The example is not a substitute for those integrations.

References: [PostgreSQL row locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS), [database clock functions](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).
