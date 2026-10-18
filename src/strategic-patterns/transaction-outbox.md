---
title: "A committed order needs an email"
description: "Save the business intent first, then let a durable job send it without turning redelivery into duplicate mail."
stack: "Spring Boot · PostgreSQL · JobRunr"
demoSlug: "transaction-outbox"
tacticalScenarios:
  - title: "A few emails a day"
    url: "/email-workload-field-guide.html#a-few-emails-a-day"
  - title: "SMTP may have accepted the message"
    url: "/email-workload-field-guide.html#smtp-may-have-accepted-the-message"
patternOrder: 1
permalink: "/patterns/transaction-outbox.html"
---

## Start here

Download and extract the [complete Simple Java Mail sources](https://github.com/bbottema/simple-java-mail/archive/refs/heads/codex/10.0.0.zip), or use your existing [matching source checkout](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0). Open a terminal in the directory containing `pom.xml` and `tools/`.

Use Docker Engine/Desktop with Linux containers and Compose 2.24.4 or newer. Allow several GB of disk space and at least 4 GB of Docker memory; brokers and workflow engines may need more. No host JDK, Maven or real mail account is needed.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/transaction-outbox/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/transaction-outbox/compose.yaml run --rm scenario
```

Open [the application's job evidence](http://localhost:8787/jobs) and [the fixture's capture summary](http://localhost:8788/stats). These links only work while your local demo is running. The first build downloads images and dependencies; later runs reuse the cache. Run one pattern at a time, or choose other loopback ports using `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Normal sends should be `SUBMITTED`; deliberately partial or uncertain attempts should be `HELD`. The scenario compares those records with actual captures and checks that repeated input does not send again.

## Follow one job

Start at [`PatternEndpoints.submit`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java), which saves the job before waking a worker. Follow [`OutboxJobs.dispatchCommittedIntents`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/transaction-outbox/src/main/java/org/simplejavamail/examples/patterns/OutboxJobs.java) into [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java). The important step is the separately committed claim: if JobRunr delivers the same work again, that is not permission to send it twice. Read [`JobStore`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/JobStore.java) last for the SQL and terminal-result storage.

Try a lost final reply with `docker compose -f tools/integration-patterns/transaction-outbox/compose.yaml run --rm scenario unknown`. Expect one capture and a `HELD` job with `UNKNOWN` acceptance, not an automatic resend.

## The problem

An HTTP request commits an order, then the application stops before a confirmation can be sent. Moving SMTP onto another thread does not make that work durable.

## Where Simple Java Mail helps

The application commits its mail intent to PostgreSQL. Its outbox poller enqueues a stable JobRunr job. The worker commits a submission guard, invokes SJM and stores the returned receipt facts.

JobRunr owns background execution and its persistent job history. The application owns the outbox and the decision to hold uncertain mail. SJM owns one SMTP submission, not the transaction spanning those systems.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

## Inspect the failure, not just the happy path

The scenario sends happy, partially accepted and uncertain submissions, repeats business input and injects a delayed notification. It checks database evidence and actual SMTP content submissions rather than simply checking that a Java call returned.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Abbreviated application evidence after the fixture accepted content but deliberately lost the final SMTP reply.*

A crash after SMTP acceptance but before the SQL result is recorded leaves `SENDING`. Restart holds that attempt for reconciliation instead of turning it back into ready work. This deliberately avoids duplicates at the cost of manual recovery for some possibly unsent mail.

## Keep the boundary honest

Run this framework example as one application instance. Its startup scan assumes the previous process has stopped before it holds unfinished `SENDING` records. It must not run beside another live copy against the same database. [Polar Meridian](/patterns/polar-meridian.html) demonstrates the separate claim-ownership work needed for two instances.

The fixture never sends Internet mail. Notifications are explicitly injected synthetic DSNs, not observed downstream deliveries. A successful submission is not proof of final delivery, and no database, broker or workflow transaction can make SMTP exactly-once. Hold partial or uncertain acceptance for an application decision; do not blindly replay the original email.

Report fields are received claims. Production receivers need trusted ingress, correlation and duplicate/out-of-order handling before changing customer or business state. Workflow/broker payloads should be application DTOs, not serialized Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/transaction-outbox) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) records resource, image, licensing and architecture boundaries.

Reserve several GB of disk and at least 4 GB of Docker memory, with more headroom for brokers/workflow engines. Pinned image manifests are not a claim that every CPU architecture was tested. These local development examples need no paid service or cloud account; framework production licensing still applies.

```text
docker compose -f tools/integration-patterns/transaction-outbox/compose.yaml down --volumes --remove-orphans
```

*Delete only this Compose project's demo data. Omit `--volumes` to retain it; never use a global Docker prune.*
