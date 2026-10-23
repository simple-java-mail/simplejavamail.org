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

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and test mail server for you, so you don't need to install them or connect a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/event-communications/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/event-communications/compose.yaml run --rm scenario
```

Once the demo is running, open [the job records](http://localhost:8787/jobs) and [the test server's capture summary](http://localhost:8788/stats) to compare what the application recorded with what the server received. The first build downloads images and dependencies, which Docker caches for later runs. If you want to run more than one pattern at once, choose different local ports with `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Successful submissions should appear as `SUBMITTED`. If only some recipients were accepted, or the server's reply was lost, the job should stay `HELD` for review. The scenario checks those records against the captured messages and repeats the input to check that it doesn't send again.

## Follow one job

Begin at [`PatternEndpoints.submit`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java), then follow the job ID into [`CommunicationEvents`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/event-communications/src/main/java/org/simplejavamail/examples/patterns/CommunicationEvents.java). Its Kafka or RabbitMQ consumer calls [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java), which claims the job before sending so a redelivered event won't send it again. Once you've followed that flow, read [`JobStore`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/JobStore.java) to see how the claim is saved.

Append `unknown` to the scenario command to try a send whose final reply goes missing. Expect one captured message and a job on hold, even when the input is repeated. Then try RabbitMQ below to see the same behavior with a different broker.

## The problem

A consumer can finish SMTP submission and stop before acknowledging its event. The broker then redelivers work that may already have reached the mail server.

## Where Simple Java Mail helps

The example publishes a job ID to Kafka. When a consumer receives it, it loads the saved request and claims the send in a separate database commit before calling SJM. You can also try RabbitMQ with the same checks around the send.

Kafka or RabbitMQ delivers events and handles acknowledgements and redelivery, while PostgreSQL keeps the record of each send attempt. SJM can't join the broker's transaction, so those features alone won't give you exactly-once email.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

You can try the alternative platform with the same application behavior and checks. Stop the first stack before switching, then include both Compose files when starting, testing or cleaning up the alternative:

```text
docker compose -f tools/integration-patterns/event-communications/compose.yaml -f tools/integration-patterns/event-communications/rabbitmq.yaml up --build -d --wait
docker compose -f tools/integration-patterns/event-communications/compose.yaml -f tools/integration-patterns/event-communications/rabbitmq.yaml run --rm scenario
```

*You can change the platform, but an SMTP acceptance still tells you the same thing.*

<span id="inspect-the-failure-not-just-the-happy-path" aria-hidden="true"></span>

## Try a send where the reply goes missing

The scenario tries successful sends, sends accepted for only some recipients, and sends where the final reply goes missing. It also repeats the input and supplies a delayed delivery notification. You can compare the database records with the messages captured by the test server to see what actually happened.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Part of the result after the test server accepted the message but deliberately dropped its final SMTP reply.*

The demo's HTTP producer doesn't guarantee that saving business data and publishing an event happen together. For that, a production producer needs an outbox or a similar approach. The consumer still needs to guard against repeated sends, even if you use Kafka transactions or RabbitMQ acknowledgements.

<span id="keep-the-boundary-honest" aria-hidden="true"></span>

## Before you adapt this example

Run just one copy of this application against its database. At startup, it puts unfinished `SENDING` jobs on hold, assuming the previous process has stopped. Running a second copy could put the first copy's active jobs on hold too. If you need two instances, [Polar Meridian](/patterns/polar-meridian.html) shows how to track which instance claimed each job.

All mail stays in the local test server, and the delivery notifications are synthetic DSNs supplied by the scenario. Even with a real server, SMTP acceptance wouldn't tell you whether the message reached its final destination. A database transaction, broker or workflow can't make SMTP exactly-once, so leave partial or uncertain submissions on hold until you can decide whether a retry is safe.

Before using a delivery report to update customer records, check where it came from and which send it belongs to. You'll also need to handle duplicates and reports that arrive out of order. When passing data to a broker or workflow, use your own small DTOs rather than serializing Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/event-communications) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resource requirements, container images, licensing and supported architectures.

The memory and disk requirements above are a starting point; brokers and workflow engines may need more. The examples pin their container images, but haven't been tested on every CPU architecture. You don't need a paid service or cloud account to run them locally. Check each framework's licensing before using it in production.

```text
docker compose -f tools/integration-patterns/event-communications/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` if you want to keep it, and avoid a global Docker prune that could remove unrelated work.*

For the RabbitMQ variation, keep both files on cleanup:

```text
docker compose -f tools/integration-patterns/event-communications/compose.yaml -f tools/integration-patterns/event-communications/rabbitmq.yaml down --volumes --remove-orphans
```
