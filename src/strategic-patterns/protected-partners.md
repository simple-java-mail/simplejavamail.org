---
title: "Exchange protected partner documents"
description: "Coordinate partner work while keeping protection, inspection and byte preservation at the mail boundary."
stack: "Apache Camel · S/MIME · local archive"
demoSlug: "protected-partners"
tacticalScenarios:
  - title: "A partner update must stay confidential"
    url: "/email-workload-field-guide.html#a-partner-update-must-stay-confidential"
  - title: "Reproduce last month's instructions"
    url: "/email-workload-field-guide.html#reproduce-last-month-s-instructions"
patternOrder: 5
permalink: "/patterns/protected-partners.html"
---

## Start here

Download and extract the [complete Simple Java Mail sources](https://github.com/bbottema/simple-java-mail/archive/refs/heads/codex/10.0.0.zip), or use your existing [matching source checkout](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0). Open a terminal in the directory containing `pom.xml` and `tools/`.

Use Docker Engine/Desktop with Linux containers and Compose 2.24.4 or newer. Allow several GB of disk space and at least 4 GB of Docker memory; brokers and workflow engines may need more. No host JDK, Maven or real mail account is needed.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/protected-partners/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/protected-partners/compose.yaml run --rm scenario
```

Open [the application's job evidence](http://localhost:8787/jobs) and [the fixture's capture summary](http://localhost:8788/stats). These links only work while your local demo is running. The first build downloads images and dependencies; later runs reuse the cache. Run one pattern at a time, or choose other loopback ports using `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Normal sends should be `SUBMITTED`; deliberately partial or uncertain attempts should be `HELD`. The scenario compares those records with actual captures and checks that repeated input does not send again.

## Follow one job

Start with [`PartnerDocuments`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/protected-partners/src/main/java/org/simplejavamail/examples/patterns/PartnerDocuments.java), whose Camel route calls [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java) and then `archiveVerifiedCopy`. Follow that second step carefully: it reads the fixture's captured MIME, verifies it through SJM and archives those same bytes. Parsing is for inspection, not permission to rebuild the representation you are preserving.

Append `unknown` to the scenario command and compare its held result with a known accepted job's `PROTECTED_ARCHIVED` event. A valid signature or stored archive does not settle an uncertain SMTP result.

## The problem

A partner exchange needs a signed message and a faithful archive of the received representation. Rebuilding the MIME after verification can destroy the very evidence the archive should keep.

## Where Simple Java Mail helps

A Camel route submits a signed message through SJM, fetches the local fixture's captured bytes, verifies them through the existing Email converter and archives those captured bytes without rebuilding MIME.

Camel owns routing and the application owns its archive. SJM owns S/MIME and MIME interpretation. The locally generated identity demonstrates signature integrity, not a trusted partner identity or a production PKI.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

## Byte-preserving archive

After submission, the Camel route reads the fixture's captured MIME, verifies its S/MIME signature through SJM and archives those same bytes. It records a `PROTECTED_ARCHIVED` application event only after verification and storage. The synthetic certificate tests integrity, not a production chain of partner trust.

## Inspect the failure, not just the happy path

The scenario sends happy, partially accepted and uncertain submissions, repeats business input and injects a delayed notification. It checks database evidence and actual SMTP content submissions rather than simply checking that a Java call returned.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Abbreviated application evidence after the fixture accepted content but deliberately lost the final SMTP reply.*

The signing key is generated inside the build and valid for thirty days. It is a synthetic identity with a plainly documented demo password. Replace the whole local deployment model, not just that password, before considering production use.

## Keep the boundary honest

Run this framework example as one application instance. Its startup scan assumes the previous process has stopped before it holds unfinished `SENDING` records. It must not run beside another live copy against the same database. [Polar Meridian](/patterns/polar-meridian.html) demonstrates the separate claim-ownership work needed for two instances.

The fixture never sends Internet mail. Notifications are explicitly injected synthetic DSNs, not observed downstream deliveries. A successful submission is not proof of final delivery, and no database, broker or workflow transaction can make SMTP exactly-once. Hold partial or uncertain acceptance for an application decision; do not blindly replay the original email.

Report fields are received claims. Production receivers need trusted ingress, correlation and duplicate/out-of-order handling before changing customer or business state. Workflow/broker payloads should be application DTOs, not serialized Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/protected-partners) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) records resource, image, licensing and architecture boundaries.

Reserve several GB of disk and at least 4 GB of Docker memory, with more headroom for brokers/workflow engines. Pinned image manifests are not a claim that every CPU architecture was tested. These local development examples need no paid service or cloud account; framework production licensing still applies.

```text
docker compose -f tools/integration-patterns/protected-partners/compose.yaml down --volumes --remove-orphans
```

*Delete only this Compose project's demo data. Omit `--volumes` to retain it; never use a global Docker prune.*
