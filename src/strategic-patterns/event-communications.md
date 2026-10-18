---
title: "Business events drive communications"
description: "Consume business events without treating broker redelivery as permission to send the same email again."
stack: "Kafka · PostgreSQL · RabbitMQ variation"
demoSlug: "event-communications"
tacticalScenarios:
  - title: "The producer outruns SMTP"
    url: "/email-workload-field-guide.html#the-producer-outruns-smtp"
  - title: "SMTP may have accepted the message"
    url: "/email-workload-field-guide.html#smtp-may-have-accepted-the-message"
patternOrder: 2
permalink: "/patterns/event-communications.html"
---

## Start here

Download and extract the [complete Simple Java Mail sources](https://github.com/bbottema/simple-java-mail/archive/refs/heads/codex/10.0.0.zip), or use your existing [matching source checkout](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0). Open a terminal in the directory containing `pom.xml` and `tools/`.

Use Docker Engine/Desktop with Linux containers and Compose 2.24.4 or newer. Allow several GB of disk space and at least 4 GB of Docker memory; brokers and workflow engines may need more. No host JDK, Maven or real mail account is needed.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/event-communications/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/event-communications/compose.yaml run --rm scenario
```

Open [the application's job evidence](http://localhost:8787/jobs) and [the fixture's capture summary](http://localhost:8788/stats). These links only work while your local demo is running. The first build downloads images and dependencies; later runs reuse the cache. Run one pattern at a time, or choose other loopback ports using `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Normal sends should be `SUBMITTED`; deliberately partial or uncertain attempts should be `HELD`. The scenario compares those records with actual captures and checks that repeated input does not send again.

## Follow one job

Begin at [`PatternEndpoints.submit`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java), then follow the job ID into [`CommunicationEvents`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/event-communications/src/main/java/org/simplejavamail/examples/patterns/CommunicationEvents.java). Its Kafka or RabbitMQ consumer calls [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java); the application claim there protects the send even when the broker redelivers. Look at [`JobStore`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/JobStore.java) after that, rather than starting with broker configuration.

For a focused lost-reply test, append `unknown` to the scenario command. Expect a held result and one SMTP capture even after repeated input. Then try the RabbitMQ variation below to change the broker without changing those facts.

## The problem

A consumer can finish SMTP submission and stop before acknowledging its event. The broker then redelivers work that may already have reached the mail server.

## Where Simple Java Mail helps

The example publishes an application job ID to Kafka. A consumer loads the intent, claims its separately committed submission guard and sends through SJM. A RabbitMQ variation changes the broker, not the meaning of the SMTP receipt.

The broker owns event transport, acknowledgement and redelivery. PostgreSQL holds the application's submission evidence. SJM does not participate in a broker transaction or provide exactly-once delivery.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

The technology variation uses the same application boundary and evidence checks. Stop the primary stack first, then use both Compose files for startup, scenarios and cleanup:

```text
docker compose -f tools/integration-patterns/event-communications/compose.yaml -f tools/integration-patterns/event-communications/rabbitmq.yaml up --build -d --wait
docker compose -f tools/integration-patterns/event-communications/compose.yaml -f tools/integration-patterns/event-communications/rabbitmq.yaml run --rm scenario
```

*Switch the supporting platform without changing what SMTP acceptance means.*

## Inspect the failure, not just the happy path

The scenario sends happy, partially accepted and uncertain submissions, repeats business input and injects a delayed notification. It checks database evidence and actual SMTP content submissions rather than simply checking that a Java call returned.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Abbreviated application evidence after the fixture accepted content but deliberately lost the final SMTP reply.*

The small HTTP producer is not a transactional event-publication guarantee. A production business producer needs its normal outbox or equivalent arrangement. The consumer still needs the SMTP guard even when Kafka transactions or RabbitMQ acknowledgements are enabled.

## Keep the boundary honest

Run this framework example as one application instance. Its startup scan assumes the previous process has stopped before it holds unfinished `SENDING` records. It must not run beside another live copy against the same database. [Polar Meridian](/patterns/polar-meridian.html) demonstrates the separate claim-ownership work needed for two instances.

The fixture never sends Internet mail. Notifications are explicitly injected synthetic DSNs, not observed downstream deliveries. A successful submission is not proof of final delivery, and no database, broker or workflow transaction can make SMTP exactly-once. Hold partial or uncertain acceptance for an application decision; do not blindly replay the original email.

Report fields are received claims. Production receivers need trusted ingress, correlation and duplicate/out-of-order handling before changing customer or business state. Workflow/broker payloads should be application DTOs, not serialized Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/event-communications) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) records resource, image, licensing and architecture boundaries.

Reserve several GB of disk and at least 4 GB of Docker memory, with more headroom for brokers/workflow engines. Pinned image manifests are not a claim that every CPU architecture was tested. These local development examples need no paid service or cloud account; framework production licensing still applies.

```text
docker compose -f tools/integration-patterns/event-communications/compose.yaml down --volumes --remove-orphans
```

*Delete only this Compose project's demo data. Omit `--volumes` to retain it; never use a global Docker prune.*

For the RabbitMQ variation, keep both files on cleanup:

```text
docker compose -f tools/integration-patterns/event-communications/compose.yaml -f tools/integration-patterns/event-communications/rabbitmq.yaml down --volumes --remove-orphans
```
