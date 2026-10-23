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

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and test mail server for you, so you don't need to install them or connect a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml run --rm scenario
```

Once the demo is running, open [the job records](http://localhost:8787/jobs) and [the test server's capture summary](http://localhost:8788/stats) to compare what the application recorded with what the server received. The first build downloads images and dependencies, which Docker caches for later runs. If you want to run more than one pattern at once, choose different local ports with `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Successful submissions should appear as `SUBMITTED`. If only some recipients were accepted, or the server's reply was lost, the job should stay `HELD` for review. The scenario checks those records against the captured messages and repeats the input to check that it doesn't send again.

## Follow one job

Start with [`TemporalMailWorkflow.FeedbackWorkflowImpl.run`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/mail-workflow/src/main/java/org/simplejavamail/examples/patterns/TemporalMailWorkflow.java). It submits mail through an activity using [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java), then either holds the job for review or waits for a report. To see how the report gets back, follow received EML through [`PatternEndpoints.report`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java) into the workflow signal. The [Camunda BPMN](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/mail-workflow/src/main/resources/mail-feedback.bpmn) shows the alternative implementation.

Append `delayed` to the scenario command and inspect the `WORKFLOW_DECISION` event. This deliberately small workflow finishes after its first correlated report, including a delay; it does not track all later delivery updates.

## The problem

Submitting a request by email is only one step in a process. The application may later receive a delayed or failed delivery report and need a different business action.

## Where Simple Java Mail helps

Temporal runs the mail activity with a check against repeated sends, then waits for the first report that matches the job. When the receiving endpoint gets a synthetic notification, it converts it into an Email, reads the report and uses the envelope identifier to find the workflow. The Camunda version does the same with BPMN jobs and a correlated message. In either version, even a delay report ends this small example workflow after it records a decision.

Temporal or Camunda keeps the process history and remembers what it's waiting for. Its activities do the work that affects outside systems, with SJM handling SMTP and reading received mail. The workflow history contains the data needed for the process, without storing Email objects, private keys or SJM implementation objects.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

You can try the alternative platform with the same application behavior and checks. Stop the first stack before switching, then include both Compose files when starting, testing or cleaning up the alternative:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml up --build -d --wait
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml run --rm scenario
```

*You can change the platform, but an SMTP acceptance still tells you the same thing.*

<span id="inspect-the-failure-not-just-the-happy-path" aria-hidden="true"></span>

## Try a send where the reply goes missing

The scenario tries successful sends, sends accepted for only some recipients, and sends where the final reply goes missing. It also repeats the input and supplies a delayed delivery notification. You can compare the database records with the messages captured by the test server to see what actually happened.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Part of the result after the test server accepted the message but deliberately dropped its final SMTP reply.*

The scenario supplies the delivery notification itself, so waiting for it doesn't open another SMTP connection or demonstrate real delivery. If the application can't match a report to a job, it records it for review. In production, you'll also need to decide which reports to trust, how to handle duplicates and late arrivals, and how long the workflow should wait.

The report is stored before the workflow is notified. If that signal fails, you'll see `FEEDBACK_HANDOFF_FAILED` and a `RECORDED_HANDOFF_FAILED` response. Repeating the report won't retry the signal because it's already recorded as a duplicate. Use an outbox or a similar durable handoff if the workflow notification must survive that failure.

<span id="keep-the-boundary-honest" aria-hidden="true"></span>

## Before you adapt this example

Run just one copy of this application against its database. At startup, it puts unfinished `SENDING` jobs on hold, assuming the previous process has stopped. Running a second copy could put the first copy's active jobs on hold too. If you need two instances, [Polar Meridian](/patterns/polar-meridian.html) shows how to track which instance claimed each job.

All mail stays in the local test server, and the delivery notifications are synthetic DSNs supplied by the scenario. Even with a real server, SMTP acceptance wouldn't tell you whether the message reached its final destination. A database transaction, broker or workflow can't make SMTP exactly-once, so leave partial or uncertain submissions on hold until you can decide whether a retry is safe.

Before using a delivery report to update customer records, check where it came from and which send it belongs to. You'll also need to handle duplicates and reports that arrive out of order. When passing data to a broker or workflow, use your own small DTOs rather than serializing Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/mail-workflow) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resource requirements, container images, licensing and supported architectures.

The memory and disk requirements above are a starting point; brokers and workflow engines may need more. The examples pin their container images, but haven't been tested on every CPU architecture. You don't need a paid service or cloud account to run them locally. Check each framework's licensing before using it in production.

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` if you want to keep it, and avoid a global Docker prune that could remove unrelated work.*

For Camunda, keep both files on cleanup:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml down --volumes --remove-orphans
```
