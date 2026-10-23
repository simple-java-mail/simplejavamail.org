---
title: "Exchange protected partner documents"
description: "Send signed partner documents with Camel and SJM, then verify and archive the bytes the mail server received."
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

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and test mail server for you, so you don't need to install them or connect a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/protected-partners/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/protected-partners/compose.yaml run --rm scenario
```

Once the demo is running, open [the job records](http://localhost:8787/jobs) and [the test server's capture summary](http://localhost:8788/stats) to compare what the application recorded with what the server received. The first build downloads images and dependencies, which Docker caches for later runs. If you want to run more than one pattern at once, choose different local ports with `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

Successful submissions should appear as `SUBMITTED`. If only some recipients were accepted, or the server's reply was lost, the job should stay `HELD` for review. The scenario checks those records against the captured messages and repeats the input to check that it doesn't send again.

## Follow one job

Start with [`PartnerDocuments`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/protected-partners/src/main/java/org/simplejavamail/examples/patterns/PartnerDocuments.java). Its Camel route calls [`MailWork.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java), then `archiveVerifiedCopy`. Follow that second step to see it read the test server's captured MIME, verify it through SJM and archive the original bytes. Keeping those bytes is what lets you retain the message you actually verified.

Append `unknown` to the scenario command and compare its held result with a known accepted job's `PROTECTED_ARCHIVED` event. A valid signature or stored archive does not settle an uncertain SMTP result.

## The problem

You need to send a partner a signed message and keep an exact copy of what arrived. If you parse the message and rebuild it after checking the signature, the archive may no longer contain the bytes you verified.

## Where Simple Java Mail helps

The Camel route sends a signed message through SJM, then fetches the bytes captured by the local test server. It uses the Email converter to verify the signature and archives the original bytes, so parsing the message doesn't change the copy you keep.

Camel connects those steps, and your application stores the archive. SJM handles S/MIME and reads the MIME message. The generated certificate lets you test whether the signature is intact, but it doesn't establish that the sender is a trusted partner.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain the mail APIs used here.

## Byte-preserving archive

Look for the `PROTECTED_ARCHIVED` event after the send. The Camel route records it only once SJM has verified the captured message's signature and the application has stored those same bytes. The synthetic certificate is enough for this integrity check; trusting a real partner requires your own certificate setup.

<span id="inspect-the-failure-not-just-the-happy-path" aria-hidden="true"></span>

## Try a send where the reply goes missing

The scenario tries successful sends, sends accepted for only some recipients, and sends where the final reply goes missing. It also repeats the input and supplies a delayed delivery notification. You can compare the database records with the messages captured by the test server to see what actually happened.

```json
{"scenario":"unknown","state":"HELD","submission":"UNKNOWN","smtpSubmissions":1,"duplicateSuppressed":true}
```

*Part of the result after the test server accepted the message but deliberately dropped its final SMTP reply.*

The build generates a signing key valid for thirty days, with a documented demo password. It's a synthetic identity for local testing. Before using this approach in production, you'll need a different deployment and key-management setup, rather than just a new password.

<span id="keep-the-boundary-honest" aria-hidden="true"></span>

## Before you adapt this example

Run just one copy of this application against its database. At startup, it puts unfinished `SENDING` jobs on hold, assuming the previous process has stopped. Running a second copy could put the first copy's active jobs on hold too. If you need two instances, [Polar Meridian](/patterns/polar-meridian.html) shows how to track which instance claimed each job.

All mail stays in the local test server, and the delivery notifications are synthetic DSNs supplied by the scenario. Even with a real server, SMTP acceptance wouldn't tell you whether the message reached its final destination. A database transaction, broker or workflow can't make SMTP exactly-once, so leave partial or uncertain submissions on hold until you can decide whether a retry is safe.

Before using a delivery report to update customer records, check where it came from and which send it belongs to. You'll also need to handle duplicates and reports that arrive out of order. When passing data to a broker or workflow, use your own small DTOs rather than serializing Email, Mailer or private-key objects.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) and extract them into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/protected-partners) explain this pattern; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resource requirements, container images, licensing and supported architectures.

The memory and disk requirements above are a starting point; brokers and workflow engines may need more. The examples pin their container images, but haven't been tested on every CPU architecture. You don't need a paid service or cloud account to run them locally. Check each framework's licensing before using it in production.

```text
docker compose -f tools/integration-patterns/protected-partners/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` if you want to keep it, and avoid a global Docker prune that could remove unrelated work.*
