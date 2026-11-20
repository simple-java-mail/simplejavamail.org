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

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and the services for each demo. The local examples use synthetic data and run without a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml run --rm scenario
```

Once the demo is running, open [the job records](http://localhost:8787/jobs) and [the test server's capture summary](http://localhost:8788/stats) to compare what the application recorded with what the server received. The first build downloads images and dependencies, which Docker caches for later runs. If you want to run more than one pattern at once, choose different local ports with `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

A successful send should show up as `SUBMITTED`. If the server accepts only some recipients or its reply goes missing, the job stays `HELD` so you can decide what to do. The demo also checks that asking for the same job again doesn't send another email.

## Follow one job

Start with [`TemporalMailWorkflow.FeedbackWorkflowImpl.run`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/mail-workflow/src/main/java/org/simplejavamail/examples/patterns/TemporalMailWorkflow.java). It submits mail through an activity using [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java), then either holds the job for review or waits for a report. To see how the report gets back, follow received EML through [`PatternEndpoints.report`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/PatternEndpoints.java) into the workflow signal. The [Camunda BPMN](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/mail-workflow/src/main/resources/mail-feedback.bpmn) shows the alternative implementation.

Append `delayed` to the scenario command and inspect the `WORKFLOW_DECISION` event. This deliberately small workflow finishes after its first correlated report, including a delay; it does not track all later delivery updates.

## The problem

Say your process sends a request by email and needs to know what happens next. If a delivery report comes back saying the message was delayed or bounced, the process may need to wait or take a different action.

## Where Simple Java Mail helps

Temporal runs the mail activity with a check against repeated sends, then waits for the first report that matches the job. When the receiving endpoint gets a synthetic notification, it converts it into an Email, reads the report and uses the envelope identifier to find the workflow. The Camunda version does the same with BPMN jobs and a correlated message. In either version, even a delay report ends this small example workflow after it records a decision.

Temporal or Camunda keeps the process history and remembers what it's waiting for. Its activities do the work that affects outside systems, with SJM handling SMTP and reading received mail. The workflow history contains the data needed for the process, without storing Email objects, private keys or SJM implementation objects.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

Want to try the other option? Stop the first stack, then use both Compose files when starting, testing and cleaning up:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml up --build -d --wait
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml run --rm scenario
```

*Changing the platform doesn't change what an SMTP acceptance tells you.*

<span id="inspect-the-failure-not-just-the-happy-path" aria-hidden="true"></span>

## Try a send where the reply goes missing

The demo tries a normal send, a send accepted for only some recipients, and a send whose final reply goes missing. It also submits the same request twice and supplies a delayed delivery notification. Take a look at the job records and the test server's captured messages to see how each case turned out.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Part of the result after the test server accepted the message but deliberately dropped its final SMTP reply.*

## When the report is saved and the workflow signal fails

The scenario supplies a synthetic notification. An unmatched report goes to review. When a report matches, the application saves it before signaling the workflow.

If the signal fails, look for the `FEEDBACK_HANDOFF_FAILED` event and the `RECORDED_HANDOFF_FAILED` response. The report stays saved. Submit it again and the application recognizes it as a duplicate. Use an outbox or similar durable handoff to retry the signal separately.

Before adapting the example, decide which reports to trust, which duplicates and late arrivals should affect state, and how long the workflow can wait.

<span id="keep-the-boundary-honest" aria-hidden="true"></span>

## Before you adapt this example

- **Run one instance per database.** At startup, this demo holds unfinished `SENDING` jobs on the assumption the previous instance has stopped. For a shared database, track which instance claimed each job. See [Polar Meridian](/patterns/polar-meridian.html).
- **Review partial or uncertain sends before retrying.** The local scenario uses a test mail server and synthetic DSNs. In production, SMTP acceptance records submission. Transactions, brokers and workflows leave that SMTP outcome separate from application state.
- **Verify and match reports.** Check where the report came from, match it to the send, and handle duplicates and late arrivals. Pass small application DTOs to brokers or workflows and keep Email, Mailer and private-key objects inside the application.

## Source, resources and cleanup

[Download the example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/mail-workflow) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resource requirements, container images, licensing and supported architectures.

The memory and disk requirements above are a starting point; brokers and workflow engines may need more. The examples pin their container images, but haven't been tested on every CPU architecture. You don't need a paid service or cloud account to run them locally. Check each framework's licensing before using it in production.

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` if you want to keep it, and avoid a global Docker prune that could remove unrelated work.*

For Camunda, keep both files on cleanup:

```text
docker compose -f tools/integration-patterns/mail-workflow/compose.yaml -f tools/integration-patterns/mail-workflow/camunda.yaml down --volumes --remove-orphans
```
