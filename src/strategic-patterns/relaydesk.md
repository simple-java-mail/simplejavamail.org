---
title: "Operate customer-owned mail routes"
description: "Give each customer its own approved SMTP route without making one customer's outage everybody's problem."
stack: "Java · PostgreSQL · authenticated SMTP"
demoSlug: "relaydesk"
tacticalScenarios:
  - title: "Customers bring their own servers"
    url: "/email-workload-field-guide.html#customers-bring-their-own-servers"
  - title: "The customer rotates credentials"
    url: "/email-workload-field-guide.html#the-customer-rotates-credentials"
caseStudy:
  title: "RelayDesk case study"
  url: "/case-studies/relaydesk.html"
patternOrder: 7
permalink: "/patterns/relaydesk.html"
mermaid: true
---

## Start here

Download and extract the [complete Simple Java Mail sources](https://github.com/bbottema/simple-java-mail/archive/refs/heads/codex/10.0.0.zip), or use your existing [matching source checkout](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0). Open a terminal in the directory containing `pom.xml` and `tools/`.

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and test mail server for you, so you don't need to install them or connect a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/relaydesk/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/relaydesk/compose.yaml run --rm scenario
```

Tenant evidence at `http://localhost:8787/jobs` needs its demo token. Use the HTTP client already inside the application container to include A's token:

```text
docker compose -f tools/integration-patterns/relaydesk/compose.yaml exec app curl --silent -H "X-Demo-Tenant-Token: tenant-a-local" http://localhost:8080/jobs
```

The fixtures capture synthetic `.test` messages and have no forwarding implementation. TLS uses a development certificate trusted only inside the example images, never in your computer's trust store.

Expect ordinary jobs to reach `SUBMITTED`, with partial or uncertain attempts held. A failed credential replacement pauses only A; B should still complete.

## Follow one job

Begin at [`RelayDeskApplication.enqueue`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/relaydesk/src/main/java/RelayDeskApplication.java), then follow `dispatchNext`, `submit` and `recordOutcome` in the same file. Next, read `TenantRoute.replace` to see how it pauses one customer while replacing their Mailer. The application uses the [original article helpers](/assets/journal/articles/relaydesk/examples/RelayDeskMailExamples.java) unchanged, adding a database and separate routes for each customer.

Inspect A's job evidence after the scenario. A bad password replacement should leave only A paused while B still completes; a later valid replacement resumes A. The command uses development tokens, not production authentication.

## The problem

Your support platform sends mail through each customer's own server. When one server stalls, the other customers still need to send. You also need to replace credentials without losing work that's already been accepted for sending.

The [RelayDesk case study](/case-studies/relaydesk.html) explains that setup, and you can use its [original helpers](/assets/journal/articles/relaydesk/examples/README.md) on their own. This Docker application gives you a way to try the ideas with a database and test servers, though it isn't a production service for multiple customers.

```mermaid
flowchart LR
    accTitle: Separate customer sending routes
    accDescr: The application checks each customer's access and selects their approved Mailer. Separate Mailers connect to separate test SMTP servers, and the application saves each result with that customer's jobs.
    requests["Customer requests"] --> app["Authorization + durable dispatch"]
    app --> a["Tenant A Mailer"] --> smtpA["Tenant A SMTP"]
    app --> b["Tenant B Mailer"] --> smtpB["Tenant B SMTP"]
    a --> records["Tenant-scoped attempt evidence"]
    b --> records
```

## Tenant isolation

Each customer's approved host, credentials and sender defaults come from a registry, so a request can't choose arbitrary SMTP settings. The demo uses a separate token per customer to keep requests on their own route and prevent access to another customer's jobs.

Before the article helper sends a message, the application records the attempt in PostgreSQL. A result observer then saves the outcome. To check that customers can make progress independently, the scenario stalls customer A at its server while customer B completes a send.

You can use the public development tokens to inspect the demo. For a real service, you'll need authentication and authorization, a way to approve destinations, and restrictions on DNS resolution and outgoing connections.

## Fair turns and route replacement

Each customer gets separate workers and local sending limits, so one can't use up another's workers. If you also need to enforce a provider quota across several application instances, you'll need a shared limit.

When you replace a password, the application pauses that customer's route and lets admitted sends finish. It closes the old Mailer, builds and checks the replacement, then resumes sending if the check succeeds. If it fails, that customer stays paused while the others continue.

This demo replaces credentials for a fixed set of customers. If your service continually adds and removes customers, you'll also need to limit registry size and retire routes that are no longer used.

## Inspect the evidence

The scenario checks that customers can't access each other's jobs or delivery reports, and that each can keep sending while the other is stalled. It also tries duplicate input, credential replacement, and partial or uncertain SMTP results. A bad password leaves only that customer's route paused until a valid replacement is supplied. Here's part of the output:

```json
{"pattern":"relaydesk","tenantIsolation":true,"fairTurns":true,"credentialRevision":3,"oldRouteRetired":true,"partialAndUnknownHeld":true}
```

These results show what the application observed, rather than whether mail reached its final destination. It leaves partial or uncertain submissions on hold. If saving a result fails, check what happened before deciding to resend.

## Source and cleanup

[Download the examples](/assets/guides/integration-patterns/strategic-patterns.zip). The [source README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/relaydesk) lists the endpoints and explains how customer access is checked. The [workbench notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) cover resource requirements, container images, licensing and what has been tested.

```text
docker compose -f tools/integration-patterns/relaydesk/compose.yaml down --volumes --remove-orphans
```

Omit `--volumes` to retain this project's development data. Never use a global Docker prune.
