---
title: "The mail cluster that only exists on paper"
description: "A deliberately unfinished walk through an imaginary mail system, mostly to see what breaks before anything is real."
date: "2026-08-26"
category: "System design"
draft: true
typora-root-url: ..
typora-copy-images-to: ../assets/journal
---

I keep sketching the same imaginary mail system whenever I need to think through a new feature. It belongs to a company with too many applications, several kinds of transactional mail, a few enormous mailing lists, and at least one old system nobody is willing to switch off.

None of it exists. That is rather useful: no real architecture gets in the way of asking awkward questions.

## Start with the boring version

The first version has two SMTP servers and a load balancer. Applications hand over mail, the servers deliver it, and everybody goes home early.

```java
Mailer mailer = MailerBuilder
    .withSMTPServer("smtp.example.test", 587, "app", "secret")
    .withTransportStrategy(TransportStrategy.SMTP_TLS)
    .buildMailer();
```

That is enough until it suddenly is not. A newsletter competes with password-reset mail, one provider starts throttling, and a retry storm turns a small outage into a long one.

> The interesting part of a mail cluster is rarely choosing another server. It is deciding which kinds of mail are allowed to affect each other.

## Add one inconvenient requirement

Suppose password resets must keep moving even while a large mailing list is being processed. I would separate those workloads before adding clever routing: different queues, explicit capacity, and failure policies that make the trade-off visible.

The library can help with connections, pools, clusters, and failover. It cannot decide that a password reset matters more than a newsletter. That boundary belongs to the application, and pretending otherwise would make the API look convenient while making the system harder to reason about.

## This is only a dummy

A real entry would continue into throttling, idempotency, bounce handling, DMARC alignment, observability, and what happens when every SMTP server is healthy but the recipient domain simply does not want your mail.

For now, this is enough text to test the journal without mistaking scaffolding for a finished opinion.
