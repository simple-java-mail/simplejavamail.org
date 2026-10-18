---
title: "Turn incoming mail into application data"
description: "Use typed mail facts as input to an ordinary integration flow, without introducing an SJM event bus."
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

Use Docker Engine/Desktop with Linux containers and Compose 2.24.4 or newer. Allow several GB of disk space and at least 4 GB of Docker memory; brokers and workflow engines may need more. No host JDK, Maven or real mail account is needed.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/incoming-feedback/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/incoming-feedback/compose.yaml run --rm scenario
```

Open [the application's job evidence](http://localhost:8787/jobs) and [the fixture's capture summary](http://localhost:8788/stats). These links only work while your local demo is running. The first build downloads images and dependencies; later runs reuse the cache. Run one pattern at a time, or choose other loopback ports using `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Normal sends should be `SUBMITTED`; deliberately partial or uncertain attempts should be `HELD`. The scenario compares those records with actual captures and checks that repeated input does not send again.

## Follow one job

Begin at [`PatternEndpoints.report`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java), not the send path. It converts received EML to Email and passes typed facts to [`JobStore.recordFeedback`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/JobStore.java) for correlation and retention. Follow the small job/action projection into [`IncomingFeedback`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/incoming-feedback/src/main/java/org/simplejavamail/examples/patterns/IncomingFeedback.java) and its business HTTP endpoint. Downstream application code sees that projection rather than having to learn MIME.

Append `delayed` to the scenario command. Inspect `DELAYED` in the job record and the resulting `HTTP_BUSINESS_FEEDBACK` event. Repeated or uncorrelated received reports must not invent another business transition.

## The problem

A receiving service must turn delivery notifications into a small, usable HTTP message. Parsing diagnostic prose or handing raw MIME to every downstream consumer spreads mail knowledge through the application.

## Where Simple Java Mail helps

The receiving endpoint converts supplied EML into Email and reads its DeliveryStatusReport. After application-owned correlation, it projects a job ID and action into a Spring Integration flow, which invokes the example business HTTP endpoint.

The application owns the endpoint, trust policy, correlation and business event. Spring Integration owns the HTTP flow. SJM supplies interpreted facts through Email; it does not own a dispatcher, webhook subscription or persistent workflow.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

## Delivery reports into application data

The receiving endpoint converts the synthetic notification through the ordinary Email converter and reads `getDeliveryStatusReport()`. The application checks correlation, duplicates and ordering, then projects facts into its own HTTP DTO. The original Email/report object is not a workflow state or a serialized integration contract.

## Inspect the failure, not just the happy path

The scenario sends happy, partially accepted and uncertain submissions, repeats business input and injects a delayed notification. It checks database evidence and actual SMTP content submissions rather than simply checking that a Java call returned.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Abbreviated application evidence after the fixture accepted content but deliberately lost the final SMTP reply.*

This example uses a synchronous direct channel and local HTTP service. Durable downstream handoff requires the application's own outbox or durable messaging arrangement. A recorded notification and a completed HTTP callback are not one atomic transaction.

If the callback fails after the report is stored, inspect `FEEDBACK_HANDOFF_FAILED` and the `RECORDED_HANDOFF_FAILED` response. Repeating the same EML does not retry the callback: duplicate detection protects stored evidence, not downstream delivery.

## Keep the boundary honest

Run this framework example as one application instance. Its startup scan assumes the previous process has stopped before it holds unfinished `SENDING` records. It must not run beside another live copy against the same database. [Polar Meridian](/patterns/polar-meridian.html) demonstrates the separate claim-ownership work needed for two instances.

The fixture never sends Internet mail. Notifications are explicitly injected synthetic DSNs, not observed downstream deliveries. A successful submission is not proof of final delivery, and no database, broker or workflow transaction can make SMTP exactly-once. Hold partial or uncertain acceptance for an application decision; do not blindly replay the original email.

Report fields are received claims. Production receivers need trusted ingress, correlation and duplicate/out-of-order handling before changing customer or business state. Workflow/broker payloads should be application DTOs, not serialized Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/incoming-feedback) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) records resource, image, licensing and architecture boundaries.

Reserve several GB of disk and at least 4 GB of Docker memory, with more headroom for brokers/workflow engines. Pinned image manifests are not a claim that every CPU architecture was tested. These local development examples need no paid service or cloud account; framework production licensing still applies.

```text
docker compose -f tools/integration-patterns/incoming-feedback/compose.yaml down --volumes --remove-orphans
```

*Delete only this Compose project's demo data. Omit `--volumes` to retain it; never use a global Docker prune.*
