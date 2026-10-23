---
title: "Turn incoming mail into application data"
description: "Turn delivery reports into data your application can use, then pass it along with Spring Integration."
stack: "Spring Integration · application HTTP endpoint · PostgreSQL"
demoSlug: "incoming-feedback"
tacticalScenarios:
  - title: "The invoice was accepted, then bounced"
    url: "/email-workload-field-guide.html#the-invoice-was-accepted-then-bounced"
patternOrder: 6
permalink: "/patterns/incoming-feedback.html"
---

## Start here

Download and extract the [complete Simple Java Mail sources](https://github.com/bbottema/simple-java-mail/archive/refs/heads/codex/10.0.0.zip), or use your existing [matching source checkout](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0). Open a terminal in the directory containing `pom.xml` and `tools/`.

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and test mail server for you, so you don't need to install them or connect a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/incoming-feedback/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/incoming-feedback/compose.yaml run --rm scenario
```

Once the demo is running, open [the job records](http://localhost:8787/jobs) and [the test server's capture summary](http://localhost:8788/stats) to compare what the application recorded with what the server received. The first build downloads images and dependencies, which Docker caches for later runs. If you want to run more than one pattern at once, choose different local ports with `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Successful submissions should appear as `SUBMITTED`. If only some recipients were accepted, or the server's reply was lost, the job should stay `HELD` for review. The scenario checks those records against the captured messages and repeats the input to check that it doesn't send again.

## Follow one job

Begin at [`PatternEndpoints.report`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java) to see how received mail enters the application. It converts the EML into an Email, then passes the report data to [`JobStore.recordFeedback`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/JobStore.java), which matches it to a job and saves it. From there, follow the job ID and action into [`IncomingFeedback`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/incoming-feedback/src/main/java/org/simplejavamail/examples/patterns/IncomingFeedback.java) and its business HTTP endpoint. That endpoint gets a small message it can act on without needing to understand MIME.

Append `delayed` to the scenario command, then look for `DELAYED` in the job record and the resulting `HTTP_BUSINESS_FEEDBACK` event. Try repeating the report or supplying one that cannot be matched to a job, and check that neither triggers another business action.

## The problem

You want a delivery notification to become something the rest of your application can act on, such as a small HTTP message. If every consumer has to parse diagnostic text or understand raw MIME, that simple task soon spreads mail-specific code everywhere.

## Where Simple Java Mail helps

The receiving endpoint converts an EML file into an Email and reads its DeliveryStatusReport. Once the application has matched the report to a send, it passes a job ID and action to Spring Integration, which calls the demo's business HTTP endpoint.

SJM reads the mail and gives you typed report data. You decide whether to trust it, which job it belongs to and what it means for the business. Spring Integration then carries the resulting HTTP request to your service.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

## Delivery reports into application data

Look for `getDeliveryStatusReport()` after the ordinary Email conversion. The application checks which job the report belongs to, whether it's a duplicate and whether a newer update has already arrived. It then builds its own HTTP DTO from the report data, so downstream code doesn't need the Email or report object.

<span id="inspect-the-failure-not-just-the-happy-path" aria-hidden="true"></span>

## Try a send where the reply goes missing

The scenario tries successful sends, sends accepted for only some recipients, and sends where the final reply goes missing. It also repeats the input and supplies a delayed delivery notification. You can compare the database records with the messages captured by the test server to see what actually happened.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Part of the result after the test server accepted the message but deliberately dropped its final SMTP reply.*

The direct channel and local HTTP call are synchronous in this example. Storing a report and completing that call aren't one atomic operation, so you'll need an outbox or durable messaging if the handoff must survive a failure.

If the HTTP call fails after the report is stored, you'll see `FEEDBACK_HANDOFF_FAILED` and a `RECORDED_HANDOFF_FAILED` response. Sending the same EML again won't retry the call, because the application recognizes the report as a duplicate. You'll need a separate way to retry failed downstream work.

<span id="keep-the-boundary-honest" aria-hidden="true"></span>

## Before you adapt this example

Run just one copy of this application against its database. At startup, it puts unfinished `SENDING` jobs on hold, assuming the previous process has stopped. Running a second copy could put the first copy's active jobs on hold too. If you need two instances, [Polar Meridian](/patterns/polar-meridian.html) shows how to track which instance claimed each job.

All mail stays in the local test server, and the delivery notifications are synthetic DSNs supplied by the scenario. Even with a real server, SMTP acceptance wouldn't tell you whether the message reached its final destination. A database transaction, broker or workflow can't make SMTP exactly-once, so leave partial or uncertain submissions on hold until you can decide whether a retry is safe.

Before using a delivery report to update customer records, check where it came from and which send it belongs to. You'll also need to handle duplicates and reports that arrive out of order. When passing data to a broker or workflow, use your own small DTOs rather than serializing Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/incoming-feedback) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resource requirements, container images, licensing and supported architectures.

The memory and disk requirements above are a starting point; brokers and workflow engines may need more. The examples pin their container images, but haven't been tested on every CPU architecture. You don't need a paid service or cloud account to run them locally. Check each framework's licensing before using it in production.

```text
docker compose -f tools/integration-patterns/incoming-feedback/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` if you want to keep it, and avoid a global Docker prune that could remove unrelated work.*
