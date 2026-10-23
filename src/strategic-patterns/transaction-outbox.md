---
title: "A committed order needs an email"
description: "Save the work when you commit an order, then send the email in the background without sending it twice on a retry."
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

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and test mail server for you, so you don't need to install them or connect a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/transaction-outbox/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/transaction-outbox/compose.yaml run --rm scenario
```

Once the demo is running, open [the job records](http://localhost:8787/jobs) and [the test server's capture summary](http://localhost:8788/stats) to compare what the application recorded with what the server received. The first build downloads images and dependencies, which Docker caches for later runs. If you want to run more than one pattern at once, choose different local ports with `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Successful submissions should appear as `SUBMITTED`. If only some recipients were accepted, or the server's reply was lost, the job should stay `HELD` for review. The scenario checks those records against the captured messages and repeats the input to check that it doesn't send again.

## Follow one job

Start at [`PatternEndpoints.submit`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java), which saves the job before waking a worker. Follow [`OutboxJobs.dispatchCommittedIntents`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/transaction-outbox/src/main/java/org/simplejavamail/examples/patterns/OutboxJobs.java) into [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java). Before sending, the worker claims the job in a separate database commit. That stops a repeated JobRunr job from sending the same email again. Once you have that flow in mind, read [`JobStore`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/JobStore.java) to see the SQL and how it saves the result.

Try a lost final reply with `docker compose -f tools/integration-patterns/transaction-outbox/compose.yaml run --rm scenario unknown`. Expect one capture and a `HELD` job with `UNKNOWN` acceptance, not an automatic resend.

## The problem

An HTTP request commits an order, then the application stops before a confirmation can be sent. Moving SMTP onto another thread does not make that work durable.

## Where Simple Java Mail helps

The application saves the request to send mail in PostgreSQL, where an outbox poller picks it up and creates a JobRunr job with a stable ID. Before calling SJM, the worker records that it has claimed the send in a separate commit. Afterwards, it saves what the SMTP receipt tells it.

JobRunr runs the background work and keeps its job history. Your application still needs to manage the outbox and decide what to do when it can't tell whether mail was accepted. SJM handles the SMTP submission, but that submission can't be part of the database transaction.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

<span id="inspect-the-failure-not-just-the-happy-path" aria-hidden="true"></span>

## Try a send where the reply goes missing

The scenario tries successful sends, sends accepted for only some recipients, and sends where the final reply goes missing. It also repeats the input and supplies a delayed delivery notification. You can compare the database records with the messages captured by the test server to see what actually happened.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Part of the result after the test server accepted the message but deliberately dropped its final SMTP reply.*

If the process crashes after SMTP acceptance but before saving the result, the job stays `SENDING`. On restart, the application puts it on hold so you can check what happened before retrying. This avoids automatic duplicates, though it also means some mail that never left may need manual recovery.

<span id="keep-the-boundary-honest" aria-hidden="true"></span>

## Before you adapt this example

Run just one copy of this application against its database. At startup, it puts unfinished `SENDING` jobs on hold, assuming the previous process has stopped. Running a second copy could put the first copy's active jobs on hold too. If you need two instances, [Polar Meridian](/patterns/polar-meridian.html) shows how to track which instance claimed each job.

All mail stays in the local test server, and the delivery notifications are synthetic DSNs supplied by the scenario. Even with a real server, SMTP acceptance wouldn't tell you whether the message reached its final destination. A database transaction, broker or workflow can't make SMTP exactly-once, so leave partial or uncertain submissions on hold until you can decide whether a retry is safe.

Before using a delivery report to update customer records, check where it came from and which send it belongs to. You'll also need to handle duplicates and reports that arrive out of order. When passing data to a broker or workflow, use your own small DTOs rather than serializing Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/transaction-outbox) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resource requirements, container images, licensing and supported architectures.

The memory and disk requirements above are a starting point; brokers and workflow engines may need more. The examples pin their container images, but haven't been tested on every CPU architecture. You don't need a paid service or cloud account to run them locally. Check each framework's licensing before using it in production.

```text
docker compose -f tools/integration-patterns/transaction-outbox/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` if you want to keep it, and avoid a global Docker prune that could remove unrelated work.*
