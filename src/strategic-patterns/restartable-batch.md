---
title: "Resume an interrupted nightly run"
description: "Restart the untouched remainder while preserving evidence of emails already accepted or left uncertain."
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

Use Docker Engine/Desktop with Linux containers and Compose 2.24.4 or newer. Allow several GB of disk space and at least 4 GB of Docker memory; brokers and workflow engines may need more. No host JDK, Maven or real mail account is needed.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/restartable-batch/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/restartable-batch/compose.yaml run --rm scenario restart
```

Open [the application's job evidence](http://localhost:8787/jobs) and [the fixture's capture summary](http://localhost:8788/stats). These links only work while your local demo is running. The first build downloads images and dependencies; later runs reuse the cache. Run one pattern at a time, or choose other loopback ports using `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Expect two submissions before interruption and five after resumption, not seven. The scenario checks both stored jobs and the SMTP capture count.

## Follow one job

Start with [`NightlyMailJob.NightlyEndpoint.run`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/restartable-batch/src/main/java/org/simplejavamail/examples/patterns/NightlyMailJob.java). Follow the ready-item reader into its `submitMail` writer and [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java). Finally inspect [`JobStore.claim`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/JobStore.java): its guard is committed separately from the batch chunk because SMTP cannot roll back with a database transaction.

The restart experiment should report two submissions before interruption and five after resumption, not seven. Next run the ordinary scenario with `unknown` to see why ambiguous acceptance must stay held even when a framework can restart work.

## The problem

A nightly run stops after submitting two emails. Restarting the whole input could send those two again; trusting a rolled-back chunk index can be just as misleading.

## Where Simple Java Mail helps

Spring Batch owns job and step metadata. The application separately commits each submission guard and its resulting receipt facts. A restarted reader selects only untouched ready jobs, rather than assuming SMTP rolled back with the chunk.

The batch framework owns restart and chunk processing. The application's independently committed evidence protects the SMTP boundary. A completed batch means work was processed, not that every recipient received mail.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

## Inspect the failure, not just the happy path

The scenario sends happy, partially accepted and uncertain submissions, repeats business input and injects a delayed notification. It checks database evidence and actual SMTP content submissions rather than simply checking that a Java call returned.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Abbreviated application evidence after the fixture accepted content but deliberately lost the final SMTP reply.*

Run the additional `restart` scenario: it deliberately fails after two committed submissions, restarts the same job and checks that exactly five messages, not seven, were submitted. Ambiguous `SENDING` attempts are held after process restart, not silently resent.

```text
docker compose -f tools/integration-patterns/restartable-batch/compose.yaml run --rm scenario restart
```

*Interrupt after two submissions, resume the remainder and assert zero duplicates.*

## Keep the boundary honest

Run this framework example as one application instance. Its startup scan assumes the previous process has stopped before it holds unfinished `SENDING` records. It must not run beside another live copy against the same database. [Polar Meridian](/patterns/polar-meridian.html) demonstrates the separate claim-ownership work needed for two instances.

The fixture never sends Internet mail. Notifications are explicitly injected synthetic DSNs, not observed downstream deliveries. A successful submission is not proof of final delivery, and no database, broker or workflow transaction can make SMTP exactly-once. Hold partial or uncertain acceptance for an application decision; do not blindly replay the original email.

Report fields are received claims. Production receivers need trusted ingress, correlation and duplicate/out-of-order handling before changing customer or business state. Workflow/broker payloads should be application DTOs, not serialized Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/restartable-batch) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) records resource, image, licensing and architecture boundaries.

Reserve several GB of disk and at least 4 GB of Docker memory, with more headroom for brokers/workflow engines. Pinned image manifests are not a claim that every CPU architecture was tested. These local development examples need no paid service or cloud account; framework production licensing still applies.

```text
docker compose -f tools/integration-patterns/restartable-batch/compose.yaml down --volumes --remove-orphans
```

*Delete only this Compose project's demo data. Omit `--volumes` to retain it; never use a global Docker prune.*
