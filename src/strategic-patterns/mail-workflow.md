---
title: "A workflow waits for mail feedback"
description: "Let a business process react to later mail feedback without putting the workflow inside the mail library."
stack: "Temporal · PostgreSQL · Camunda variation"
demoSlug: "mail-workflow"
tacticalScenarios:
  - title: "The invoice was accepted, then bounced"
    url: "/email-workload-field-guide.html#the-invoice-was-accepted-then-bounced"
patternOrder: 3
permalink: "/patterns/mail-workflow.html"
---

## Start here

Download and extract the [complete Simple Java Mail sources](https://github.com/bbottema/simple-java-mail/archive/refs/heads/codex/10.0.0.zip), or use your existing [matching source checkout](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0). Open a terminal in the directory containing `pom.xml` and `tools/`.

Use Docker Engine/Desktop with Linux containers and Compose 2.24.4 or newer. Allow several GB of disk space and at least 4 GB of Docker memory; brokers and workflow engines may need more. No host JDK, Maven or real mail account is needed.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml run --rm scenario
```

Open [the application's job evidence](http://localhost:8787/jobs) and [the fixture's capture summary](http://localhost:8788/stats). These links only work while your local demo is running. The first build downloads images and dependencies; later runs reuse the cache. Run one pattern at a time, or choose other loopback ports using `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Normal sends should be `SUBMITTED`; deliberately partial or uncertain attempts should be `HELD`. The scenario compares those records with actual captures and checks that repeated input does not send again.

## Follow one job

Read [`TemporalMailWorkflow.FeedbackWorkflowImpl.run`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/mail-workflow/src/main/java/org/simplejavamail/examples/patterns/TemporalMailWorkflow.java) first: submit a guarded activity, hold an unsafe result, otherwise wait for one report and record a decision. The activity uses [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java). Then follow received EML through [`PatternEndpoints.report`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java) into the workflow signal. The [Camunda BPMN](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/mail-workflow/src/main/resources/mail-feedback.bpmn) expresses the alternative path.

Append `delayed` to the scenario command and inspect the `WORKFLOW_DECISION` event. This deliberately small workflow finishes after its first correlated report, including a delay; it does not track all later delivery updates.

## The problem

Submitting a request by email is only one step in a process. The application may later receive a delayed or failed delivery report and need a different business action.

## Where Simple Java Mail helps

Temporal executes a guarded mail activity, then waits for its first correlated report. The receiving endpoint converts a synthetic notification into Email, reads its report, correlates the envelope identifier and signals the workflow. The Camunda variation expresses the same handoff with BPMN jobs and a correlated message. A delay can be that first report; the example then records a decision and ends, rather than waiting for final delivery.

The workflow engine owns durable process history, waiting and business transitions. Activities own side effects; SJM interprets received mail and performs SMTP operations. No Email, private key or SJM implementation object is stored in workflow history.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

The technology variation uses the same application boundary and evidence checks. Stop the primary stack first, then use both Compose files for startup, scenarios and cleanup:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml up --build -d --wait
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml run --rm scenario
```

*Switch the supporting platform without changing what SMTP acceptance means.*

## Inspect the failure, not just the happy path

The scenario sends happy, partially accepted and uncertain submissions, repeats business input and injects a delayed notification. It checks database evidence and actual SMTP content submissions rather than simply checking that a Java call returned.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Abbreviated application evidence after the fixture accepted content but deliberately lost the final SMTP reply.*

The scenario explicitly injects a synthetic delivery notification. Waiting for it is not a new SMTP connection or proof of actual delivery. Missing correlation is recorded for review, not guessed. A production workflow must decide trust, duplicate/out-of-order handling and how long to wait.

Recording the report and notifying the workflow are separate operations. A failed signal produces visible `FEEDBACK_HANDOFF_FAILED` evidence and a `RECORDED_HANDOFF_FAILED` response. Repeating the same report remains a duplicate, not an automatic signal retry; a durable production handoff needs its own outbox or equivalent arrangement.

## Keep the boundary honest

Run this framework example as one application instance. Its startup scan assumes the previous process has stopped before it holds unfinished `SENDING` records. It must not run beside another live copy against the same database. [Polar Meridian](/patterns/polar-meridian.html) demonstrates the separate claim-ownership work needed for two instances.

The fixture never sends Internet mail. Notifications are explicitly injected synthetic DSNs, not observed downstream deliveries. A successful submission is not proof of final delivery, and no database, broker or workflow transaction can make SMTP exactly-once. Hold partial or uncertain acceptance for an application decision; do not blindly replay the original email.

Report fields are received claims. Production receivers need trusted ingress, correlation and duplicate/out-of-order handling before changing customer or business state. Workflow/broker payloads should be application DTOs, not serialized Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/mail-workflow) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) records resource, image, licensing and architecture boundaries.

Reserve several GB of disk and at least 4 GB of Docker memory, with more headroom for brokers/workflow engines. Pinned image manifests are not a claim that every CPU architecture was tested. These local development examples need no paid service or cloud account; framework production licensing still applies.

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml down --volumes --remove-orphans
```

*Delete only this Compose project's demo data. Omit `--volumes` to retain it; never use a global Docker prune.*

For Camunda, keep both files on cleanup:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml down --volumes --remove-orphans
```
