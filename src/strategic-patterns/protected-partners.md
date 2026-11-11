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

A partner sends protected instructions that an application will act on. A readable attachment and a valid signature somewhere in the message are insufficient: the required document needs the right signature coverage, an explicitly approved signing key and the protection your application requires. You also want the original input for later evidence, without replacing it with a reconstructed version.

## Where Simple Java Mail helps

SJM opens supported protected content during conversion and keeps useful bodies and resources in the ordinary Email API. Its inspection layer describes the selected value's origin, availability and protection; a reusable requirements value evaluates already captured evidence. The application supplies partner approval, chooses its required document and decides whether to process or hold it.

Camel connects the steps. The application owns persistence and the security of its retained plaintext, originals and keys. The generated local certificates are synthetic identities, not production partner trust. A From address, successful decryption or a mathematically valid unapproved signature cannot supply that approval.

## Check the required document

The application expects exactly one attachment named `partner-order.txt`. It keeps the selected occurrence and checks that occurrence's inspection; a missing or duplicate candidate is held. An independent protected child does not sign a plain document next to it.

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

The base approved-signature requirement needs one same observation with verified status, full coverage and the approved actual signing key. Known partial coverage and unknown evidence cannot become a passing witness. The stricter all-signatures choice additionally holds any relevant invalid or unresolved signature. `MIXED` can satisfy the base rule when one full verified approved signature qualifies; it is this application's choice to hold that case.

The [complete receiving guide](/security.html#section-inspecting-received-protection) explains the outcome/reason codes, approved-key rotation and OpenPGP signing-key fingerprints. A protected plain-text body with native HTML fallback needs a separate HTML decision. Check the value your application will use.

## Byte-preserving archive

The application retains `received.getInspection().getOriginalMessage()` without rebuilding MIME, and processes the usable bytes from `received.getAttachments()`. An independently opened protected file can have a different selected payload from its retained original; those are deliberate different resources. A complete retained MSG stays MSG, while an unavailable complete original remains unavailable. A captured prefix is diagnostic evidence, not a complete archive.

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

Run one application instance against its database. At startup it holds unfinished `SENDING` jobs, assuming the previous process stopped. A second instance could put active work on hold; [Polar Meridian](/patterns/polar-meridian.html) shows owned claims for multiple workers.

The build generates two synthetic identities valid for thirty days with documented demo passwords. The local receiving scenario endpoints use trusted fixtures. Production needs a different key-management, approval, access, retention and receiving-service design. Storage does not become safe merely because the original arrived encrypted. SMTP acceptance still does not establish final delivery, and no database transaction or framework makes SMTP exactly-once.

## Source, resources and cleanup

[Download the canonical example sources](/assets/guides/integration-patterns/strategic-patterns.zip) into the matching source checkout. The [source and usage notes](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/protected-partners) explain the scenarios; the [shared workbench README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns) covers resources, licensing and supported architectures. No paid service or cloud account is needed. Resource figures are starting points, and the pinned images do not establish interoperability on every CPU architecture.

```text
docker compose -f tools/integration-patterns/protected-partners/compose.yaml down --volumes --remove-orphans
```

*This removes the demo data for this Compose project. Leave out `--volumes` to keep it; avoid a global prune that could remove unrelated work.*
