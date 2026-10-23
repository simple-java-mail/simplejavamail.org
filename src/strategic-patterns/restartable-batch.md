---
title: "Resume an interrupted nightly run"
description: "Pick up the remaining work after a restart without resending mail that was accepted or still needs checking."
stack: "Spring Batch · PostgreSQL"
demoSlug: "restartable-batch"
tacticalScenarios:
  - title: "A nightly invoice run"
    url: "/email-workload-field-guide.html#a-nightly-invoice-run"
  - title: "SMTP may have accepted the message"
    url: "/email-workload-field-guide.html#smtp-may-have-accepted-the-message"
patternOrder: 4
permalink: "/patterns/restartable-batch.html"
---

## Start here

Download and extract the [complete Simple Java Mail sources](https://github.com/bbottema/simple-java-mail/archive/refs/heads/codex/10.0.0.zip), or use your existing [matching source checkout](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0). Open a terminal in the directory containing `pom.xml` and `tools/`.

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and test mail server for you, so you don't need to install them or connect a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/restartable-batch/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/restartable-batch/compose.yaml run --rm scenario restart
```

Once the demo is running, open [the job records](http://localhost:8787/jobs) and [the test server's capture summary](http://localhost:8788/stats) to compare what the application recorded with what the server received. The first build downloads images and dependencies, which Docker caches for later runs. If you want to run more than one pattern at once, choose different local ports with `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Expect two submissions before interruption and five after resumption, not seven. The scenario checks both stored jobs and the SMTP capture count.

## Follow one job

Start with [`NightlyMailJob.NightlyEndpoint.run`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/restartable-batch/src/main/java/org/simplejavamail/examples/patterns/NightlyMailJob.java). Follow the ready-item reader into its `submitMail` writer and [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java). Finally inspect [`JobStore.claim`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/JobStore.java): its guard is committed separately from the batch chunk because SMTP cannot roll back with a database transaction.

The restart experiment should report two submissions before interruption and five after resumption, not seven. Next run the ordinary scenario with `unknown` to see why ambiguous acceptance must stay held even when a framework can restart work.

## The problem

A nightly run stops after submitting two emails. Restarting the whole input could send those two again; trusting a rolled-back chunk index can be just as misleading.

## Where Simple Java Mail helps

Spring Batch keeps track of jobs and steps, while the application saves each send attempt and its SMTP result in separate commits. After a restart, the reader picks up only jobs that haven't been attempted. It doesn't assume a rolled-back batch chunk also rolled back the email.

That lets Spring Batch handle chunks and restarts without sending the same messages again. A completed batch still only tells you the work was processed; it doesn't tell you that every recipient received their mail.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

<span id="inspect-the-failure-not-just-the-happy-path" aria-hidden="true"></span>

## Try a send where the reply goes missing

The scenario tries successful sends, sends accepted for only some recipients, and sends where the final reply goes missing. It also repeats the input and supplies a delayed delivery notification. You can compare the database records with the messages captured by the test server to see what actually happened.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Part of the result after the test server accepted the message but deliberately dropped its final SMTP reply.*

The `restart` scenario stops after two committed submissions, then restarts the same job. It checks for five submissions in total, rather than seven from sending the first two again. If a process restart leaves a job in `SENDING` with no clear result, the application puts it on hold for review.

```text
docker compose -f tools/integration-patterns/restartable-batch/compose.yaml run --rm scenario restart
```

*Stop after two submissions, then check that resuming sends only the remaining messages.*

<span id="keep-the-boundary-honest" aria-hidden="true"></span>

## Before you adapt this example

Run just one copy of this application against its database. At startup, it puts unfinished `SENDING` jobs on hold, assuming the previous process has stopped. Running a second copy could put the first copy's active jobs on hold too. If you need two instances, [Polar Meridian](/patterns/polar-meridian.html) shows how to track which instance claimed each job.

All mail stays in the local test server, and the delivery notifications are synthetic DSNs supplied by the scenario. Even with a real server, SMTP acceptance wouldn't tell you whether the message reached its final destination. A database transaction, broker or workflow can't make SMTP exactly-once, so leave partial or uncertain submissions on hold until you can decide whether a retry is safe.

Before using a delivery report to update customer records, check where it came from and which send it belongs to. You'll also need to handle duplicates and reports that arrive out of order. When passing data to a broker or workflow, use your own small DTOs rather than serializing Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/restartable-batch) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resource requirements, container images, licensing and supported architectures.

The memory and disk requirements above are a starting point; brokers and workflow engines may need more. The examples pin their container images, but haven't been tested on every CPU architecture. You don't need a paid service or cloud account to run them locally. Check each framework's licensing before using it in production.

```text
docker compose -f tools/integration-patterns/restartable-batch/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` if you want to keep it, and avoid a global Docker prune that could remove unrelated work.*
