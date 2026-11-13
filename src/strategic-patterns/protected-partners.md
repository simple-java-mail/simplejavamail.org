---
title: "Exchange protected partner documents"
description: "Receive a protected document, check its approved signing key and coverage, then process or hold it while retaining original input."
stack: "Apache Camel · S/MIME · local archive"
demoSlug: "protected-partners"
tacticalScenarios:
  - title: "Check a partner document before processing it"
    url: "/email-workload-field-guide.html#check-a-partner-document-before-processing-it"
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

```text
docker compose -f tools/integration-patterns/protected-partners/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/protected-partners/compose.yaml run --rm scenario
```

Once the demo is running, open [the job records](http://localhost:8787/jobs) and [application events](http://localhost:8787/events). An accepted required document should have `PARTNER_DOCUMENT_PROCESSED` and `PROTECTED_ARCHIVED` events. Partial or unknown SMTP submissions should remain `HELD`; a document decision does not settle an uncertain send. The scenario repeats its input to check that it does not send again.

The first build downloads images and dependencies, which Docker caches. If you run more than one pattern at once, choose different local ports with `PATTERN_PORT` and `PATTERN_SMTP_PORT`.

## Follow one job

Start with [`PartnerDocuments`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/protected-partners/src/main/java/org/simplejavamail/examples/patterns/PartnerDocuments.java). Its Camel route calls [`MailWork.deliverPartnerDocument`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/common/src/main/java/org/simplejavamail/examples/patterns/MailWork.java), then `archiveVerifiedCopy`. That method reads the local server's actual captured MIME and passes it to [`PartnerDocumentPolicy.receive`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/protected-partners/src/main/java/org/simplejavamail/examples/patterns/PartnerDocumentPolicy.java). Follow the policy to see conversion, exact document selection, requirements checks and process-or-hold storage.

The receive step uses captured server bytes because SMTP itself has no “download the sent message” operation. The fixture's HTTP API is local demonstration infrastructure.

## The problem

A partner emails you instructions that your application will act on. Before you use the attachment, you want to know that the right partner signed that document and that it has the protection you expect. You also want to keep the original message, so you can check exactly what arrived later.

## Where Simple Java Mail helps

SJM opens supported protected content as it converts the message, so you can work with its bodies and attachments through the usual Email API. You can inspect a particular attachment to see where it came from, whether it's available and what protection was found. Then use a reusable set of requirements to check that information. Your application still chooses the document, decides which partner keys it trusts and decides what to do with the result.

Camel connects the steps, and the application stores the documents, originals and keys. The certificates in this demo are made up for local testing. In a real exchange, you'll need to approve your partner's keys yourself: a familiar From address, successful decryption or a valid signature from an unknown key isn't enough.

## Check the required document

The application looks for exactly one attachment named `partner-order.txt` and checks the protection on that particular attachment. If the file is missing or appears twice, it holds the message for review. A signed attachment next to an unsigned document doesn't make the unsigned document signed.

```java
ProtectionRequirements requirements = ProtectionRequirements.builder()
    .requireVerifiedSignatureFrom(approvedPartner)
    .requireDecryptedContent()
    .requireAllSignaturesVerified()
    .build();

ProtectionCheck decision = requirements.check(
    received.getInspection().getAttachment(documentIndex));
```

*This application's deliberate strict policy for one required document.*

The basic signature requirement needs one verified signature that covers the whole document and was made with an approved signing key. A partial signature or an unknown result won't pass that check. This example also asks for *all* relevant signatures to verify, so it holds the document if any are invalid or unresolved. That means a `MIXED` result can pass the basic check but still be held by the stricter policy here.

The [complete receiving guide](/security.html#section-inspecting-received-protection) explains the outcome/reason codes, approved-key rotation and OpenPGP signing-key fingerprints. A protected plain-text body with native HTML fallback needs a separate HTML decision. Check the value your application will use.

## Byte-preserving archive

The application saves `received.getInspection().getOriginalMessage()` without rebuilding it, and uses `received.getAttachments()` to get the bytes it can process. If an attachment was opened separately, its usable content can differ from the original file you keep. An original MSG remains an MSG; if the complete original wasn't available, a captured prefix won't magically make a complete archive.

Reading an attached Email does not rewrite its parent's resource. `forwarding(received)` deliberately renders the current interpreted view; `forwardingOriginal(received)` carries suitable retained original input. Automatically reusing confidential content in a reply or interpreted forward requires suitable outgoing protection or the explicit operation/conversion permission described in the [reuse guide](/security.html#received-protection-reuse). Incoming keys do not provide outgoing protection, and body encryption does not hide every outer header.

A child's original contains its own EML or MSG, without the parent's envelope. When that file was extracted through parent encryption, original forwarding still requires outgoing protection or explicit conversion permission; encrypting only the child's body may leave its headers clear. Known confidential originals get neutral new carrier metadata while their actual input metadata and bytes remain available unchanged.

<span id="inspect-the-failure-not-just-the-happy-path" aria-hidden="true"></span>

## Try a protection decision

Run only the receiving cases without another SMTP submission:

```text
docker compose -f tools/integration-patterns/protected-partners/compose.yaml run --rm scenario protection
```

[`PartnerDocumentFixtures`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/protected-partners/src/main/java/org/simplejavamail/examples/patterns/PartnerDocumentFixtures.java) creates actual MIME/S/MIME input for an acceptable document, a valid unapproved signer, unavailable verification, unavailable decryption, differing signature outcomes and content outside the required coverage. The application holds the uncertain or unmet decisions while preserving their originals.

```json
{"scenario":"mixed","document":{"action":"HELD","outcome":"NOT_SATISFIED","baseOutcome":"SATISFIED","reasons":["STRICT_SIGNATURE_INVALID"],"signature":"MIXED","encryption":"DECRYPTED","originalPreserved":true,"processedBytes":0}}
```

*Selected fields from the expected decision when one approved signature verifies and another signature is invalid. The response also carries actual input-processing Problem codes separately.*

## Try a send where the reply goes missing

Append `unknown` to the ordinary scenario command. The test server accepts the message but deliberately drops its final SMTP reply. The job stays `HELD` with `UNKNOWN` submission evidence. Verifying or archiving content cannot make that transport outcome known or authorize another send. The default run retains happy, partial and delayed-feedback cases too, then exercises all document decisions.

The [submission-receipt walkthrough](/analyzing-send-results.html) and [Reading delivery reports](/delivery-reports.html) explain those separate mail outcomes. The delivery notifications here are synthetic DSNs supplied by the scenario, not downstream delivery reports obtained from the Internet.

<span id="keep-the-boundary-honest" aria-hidden="true"></span>

## Before you adapt this example

Run one copy of this application against its database. On startup it puts unfinished `SENDING` jobs on hold, assuming the previous copy has stopped. A second copy could put a job the first one is still sending on hold. [Polar Meridian](/patterns/polar-meridian.html) shows how to track which worker claimed a job when you need more than one instance.

The build generates two synthetic identities valid for thirty days with documented demo passwords. The local receiving scenario endpoints use trusted fixtures. Production needs a different key-management, approval, access, retention and receiving-service design. Storage does not become safe merely because the original arrived encrypted. SMTP acceptance still does not establish final delivery, and no database transaction or framework makes SMTP exactly-once.

## Source, resources and cleanup

[Download the example sources](/assets/guides/integration-patterns/strategic-patterns.zip) into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/protected-partners) explain the scenarios; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resources, licensing and supported architectures. No paid service or cloud account is needed. Resource figures are starting points, and the pinned images do not establish interoperability on every CPU architecture.

```text
docker compose -f tools/integration-patterns/protected-partners/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` to keep it; avoid a global prune that could remove unrelated work.*
