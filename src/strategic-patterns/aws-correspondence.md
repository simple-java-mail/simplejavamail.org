---
title: "Deliver protected correspondence on AWS"
description: "Send protected mail through SES from an SQS worker, keeping a record of each attempt and the feedback that arrives later."
stack: "ECS/Fargate · SQS · S3 · DynamoDB · SES · Terraform · CloudFormation"
demoSlug: "aws-correspondence"
tacticalScenarios:
  - title: "A partner update must stay confidential"
    url: "/email-workload-field-guide.html#a-partner-update-must-stay-confidential"
  - title: "The invoice was accepted, then bounced"
    url: "/email-workload-field-guide.html#the-invoice-was-accepted-then-bounced"
patternOrder: 10
permalink: "/patterns/aws-correspondence.html"
mermaid: true
---

## Start here

Download and extract the [complete Simple Java Mail sources](https://github.com/bbottema/simple-java-mail/archive/refs/heads/codex/10.0.0.zip), or use your existing [matching source checkout](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0). Open a terminal in the directory containing `pom.xml` and `tools/`.

You'll need Docker Engine or Docker Desktop with Linux containers and Compose 2.24.4 or newer. Set aside several GB of disk space and at least 4 GB of Docker memory, with more room for brokers and workflow engines. Docker runs the JDK, Maven and the services for each demo. The local examples use synthetic data and run without a real mail account.

Run these commands from that directory:

```text
docker compose -f tools/integration-patterns/aws-correspondence/compose.yaml up --build -d --wait
docker compose -f tools/integration-patterns/aws-correspondence/compose.yaml run --rm scenario
```

Open [the job records](http://localhost:8787/jobs). Repeating the input should produce just one submission. Rejected attempts and sends with an uncertain result stay on hold for review, while delivery feedback is recorded separately.

Docker builds the matching source and runs ElasticMQ, DynamoDB Local, S3Mock and a TLS SMTP test server, so you don't need a host JDK, Maven or cloud account. The scenario supplies SES JSON to test how the application handles it. These substitutes let you try the application locally, but they don't reproduce AWS or prove SES compatibility.

## Follow one job

Begin at [`CorrespondenceWorker.deliver`](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/aws-correspondence/src/main/java/org/simplejavamail/examples/aws/CorrespondenceWorker.java). Follow the job claim into `prepareArchiveAndSubmit`, then `recordOutcome` to see how it saves the SMTP result. Next, read `recordFeedback` for the SES JSON that arrives later. Those events refer to the same job, but they are processed separately from the original send and database transaction. Try this locally before moving on to the Terraform or CloudFormation templates.

In `/jobs`, check that the attempt with a lost reply stays on hold and that a late delay report doesn't overwrite an already recorded delivery. Once you've tried those checks locally, the separate AWS deployment below lets you explore the same flow with billable cloud resources.

## The problem

You need to send protected documents to partners, keep a record of what was submitted and handle delivery feedback later. SQS can carry the work, but it can't guarantee exactly-once email. Your application still needs to prepare each message and decide what to do with uncertain results or later feedback.

## Where SJM fits

Each SQS job points to a document in S3. A long-running Fargate worker claims the job in DynamoDB, uses SJM to sign and encrypt the mail, saves the finalized message and submits it through SES SMTP. Reusing the Mailer lets the worker keep its connection pool between jobs.

```mermaid
flowchart LR
    accTitle: Protected correspondence on AWS
    accDescr: SQS jobs reach an SJM Fargate worker, which reads S3 documents, retains an archive and records attempts in DynamoDB. SES SMTP submission is separate from subsequent SES events sent through SNS and a feedback queue.
    work["SQS work"] --> worker["SJM on Fargate"] --> ses["SES SMTP"]
    worker <--> objects["S3 documents + archive"]
    worker <--> evidence["DynamoDB attempt evidence"]
    ses --> sns["SNS feedback"] --> feedback["Feedback SQS"] --> worker
```

SJM prepares the MIME message, applies the configured protection and submits it over SMTP. AWS provides the queue, storage, conditional database updates and mail service. Your application decides who may send, prevents repeated input from sending twice and checks attempts whose outcome is unclear.

You can run the worker without a public HTTP endpoint, load balancer, workflow engine or inbound SES receiving service. Its certificate is synthetic, so real partner correspondence will need a separate way to manage identities and trust.

## SES feedback

A dedicated SES configuration set sends events through SNS to the feedback queue. The worker uses application attempt tags to match each event to a stored job and recipient, since you can't assume SES will preserve the application's Message-ID.

The worker reads SES JSON and keeps the feedback even when events are duplicated or arrive out of order. If you're receiving actual notification emails instead, see [Reading delivery reports](/delivery-reports.html) for parsing those MIME reports.

TLS between your worker and SES only covers that connection; SES has a separate policy for onward delivery. S/MIME protects the message content, but an SMTP response or delivery event still won't tell you whether a person read or decrypted it.

The local scenario repeats input, compares protected archive hashes and supplies duplicate feedback in different orders. It holds rejected or uncertain submissions for review and sends feedback it can't match to a dead-letter queue. Local mail stays in the test server.

On AWS, the mailbox simulator can accept a submission and report a bounce later. The scenario keeps both outcomes on the job and checks the archive hash.

```json
{"case":"bounce","smtp":"ACCEPTED","feedback":["Bounce","Send"],"archiveHashMatches":true}
```

Keep the acceptance and bounce together when deciding whether to resend. If connection cleanup fails after acceptance, the inline result observer saves that acceptance and holds the operation for inspection. If the result write itself fails, the job stays `SENDING` so you can check what happened before retrying.

## Identify the application to SES

The worker sets `ConnectionConfig.Builder.withSmtpClientHostname("correspondence.example.test")` because a container's generated hostname may not be useful to the mail server. For a real deployment, choose your approved client hostname. This sets EHLO/HELO without changing the sender, SES endpoint or TLS certificate checks, and the demo script doesn't need to change DNS.

## AWS deployment

`deploy` creates billable AWS resources. Choose Terraform or CloudFormation and use a separate run name for each deployment. The local Compose run exercises the application with fixtures. The AWS run exercises IAM, network access, SES submission, feedback and archive storage.

1. **Check the inputs with `preflight`.** Supply your profile, expected account, region, unique run name, existing verified SES domain and sender. Start from the [cloud runner command](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/aws-correspondence#actual-cloud-lane).
2. **Review `plan`.** It validates the proposed changes before provisioning. The runner provisions resources for this run and treats your existing SES identity, DNS, suppression settings and production feedback routes as read-only.
3. **Run `deploy`, then `scenario`.** Both formats deploy the same worker pinned to an ECR image digest. The scenario addresses the SES mailbox simulator. Check submission, feedback and stored archive hashes. Partner decryption needs its own test.
4. **Check `status`, then run `destroy` when finished.** Keep the saved run details for the cleanup steps below. The dated verification record in the [workbench notes](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/tools/integration-patterns/VERIFICATION.md) shows what was deployed and cleaned up.

<details class="doc-disclosure">
<summary>Resources and credential storage</summary>

The run creates a task security group with no inbound access, an ECR repository, queues and dead-letter queues, an archive bucket, a table, a configuration set, a feedback subscription, logs and scoped roles. The runner can use an isolated network or reference an approved one. It puts demo SMTP credentials in Secrets Manager, outside the templates, state, image and download.

</details>

## Source and cleanup

[Download the sources and cloud scripts](/assets/guides/integration-patterns/strategic-patterns.zip). The [AWS source README](https://github.com/bbottema/simple-java-mail/tree/codex/10.0.0/tools/integration-patterns/aws-correspondence) has the full commands, prerequisites and checks that keep changes specific to your deployment.

```text
docker compose -f tools/integration-patterns/aws-correspondence/compose.yaml down --volumes --remove-orphans
```

To remove cloud resources, run `destroy` with the same arguments and saved run manifest. Before deleting bucket contents or images, the script checks the recorded resource identities and ownership tags, rather than relying on names alone. It also checks that the sending identity is unchanged. Keep cleanup specific to this run so it doesn't affect unrelated resources.
