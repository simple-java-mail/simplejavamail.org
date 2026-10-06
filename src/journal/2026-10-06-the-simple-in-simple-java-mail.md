---
title: "The Simple in Simple Java Mail"
description: "By our powers combined! Captain Simple Java Mail!"
date: "2026-10-06"
category: "Maintainer practice"
draft: true
typora-root-url: ..
typora-copy-images-to: ../assets/journal/articles/the-simple-in-simple-java-mail
banner-type: note
banner-header: "AI-Assisted"
banner-body: "This first draft was developed from my article brief, the project history and the SMTP comparison research."
---

![Three hands bring together superhero rings marked S, J and M](/assets/journal/articles/the-simple-in-simple-java-mail/powers-combined.png)

*Three words combine into a name. One of them has some explaining to do.*

Simple Java Mail. Three fairly unambiguous words, you would think. It is written in Java, it deals with email, and it is simple. Except that last word has been doing rather more work than I realised, and not all of it in my favour.

I meant simple to use. I increasingly suspect people read it as simple in what it can do. For much of the last decade, the name and my rather hobbyist website made that interpretation easy. Meanwhile, I kept adding capabilities, without really noticing that the way I presented the library had stopped doing it justice.

## Java and Mail get off lightly

The **Java** part tells you where it belongs. It fits into a Java application, uses the Jakarta Mail foundation, and has [Spring integration](/spring.html) for applications that already speak that language. It doesn't require your application to become a mail server just because somebody needs to receive an invoice.

**Mail** deserves a small qualification: this is about composing, inspecting, protecting and submitting email. Simple Java Mail isn't an inbox client, nor does it take over your SMTP server's onward delivery. A send result can tell you what the relay accepted; it cannot tell you that someone read the message. Those distinctions matter, but they don't make the name particularly mysterious.

Then there's **Simple**.

## Simple was always about the person using it

In the [origin story](/journal/simple-java-mails-origin-story.html), the problem was an email that looked different depending on which client opened it. I eventually worked out the MIME structures needed for plain text, HTML, attachments and embedded images. Having done that work, I didn't see why every developer after me should have to do it again.

The application already knew what it wanted to say. Why make it describe a MIME tree as well?

That thought still looks like this in the API:

```java
SimpleJavaMail mail = SimpleJavaMail.fromDefaults();

Email email = mail.emailBuilder().startingBlank()
    .from("Benny", "benny@simplejavamail.org")
    .to("Reader", "reader@yourcompany.com")
    .withSubject("Simple doesn't mean small")
    .withPlainText("Describe the email you want to send.")
    .withHTMLText("<p>Describe the email you want to send.</p>")
    .buildEmail();
```

*The application describes its message; the library works out the MIME structure.*

There is quite a bit of work behind those few lines, but the caller doesn't have to repeat it. That's the kind of simplicity I was after. It was about developer experience from the beginning: reducing the complexity of using email without reducing what the developer could accomplish. Quite the opposite, really. Once the common work is taken care of, doing something more ambitious becomes easier too.

I haven't changed my mind about that. What needed changing was how I explained it.

## Lightweight became a rather heavy label

For years I described Simple Java Mail as a lightweight library. That sounds reassuring: a small dependency, a short learning curve, no grand framework to adopt just to send an email. It also sounds like something you might outgrow.

The website wasn't helping. It looked like a hobby project because, well, it was my hobby project. I kept working on the engineering, but I hadn't given the presentation the same attention. A developer considering it for a larger system could quite reasonably come away with the impression of a convenient little wrapper around Jakarta Mail.

That description kept getting less useful. Connection pools and SMTP clusters, authenticated SOCKS, signing and encryption, message conversion, diagnostics: none of those disappear because the first example fits on a screen. Yet the name and the website still led with smallness. I had made the entrance approachable and then done a poor job of showing how much was behind it.

I hadn't realised I needed to rebrand the library. Not necessarily rename it; I still like the name. I needed to reposition it so that an easy first email didn't imply that the second, more demanding problem belonged somewhere else.

## Quite a lot of library behind that first email

I counted a few things in the development checkout on **6 October 2026**, partly to check my own impression:

- **32 top-level capability topics** on the main [Capabilities page](/features.html), before the separate security, pooling and integration references.
- **92 named configuration entries** in the property registry, covering message defaults, transport, security, execution, pools and more. That includes two wildcard property families, rather than 92 independent switches; the [configuration reference](/configuration.html#section-available-properties) explains the settings.
- **11 top-level diagnostics topics**, from [SMTP probes](/debugging.html#section-smtp-capabilities) and [configuration provenance](/debugging.html#section-config-diagnostics) to queue pressure and logging.
- **9 top-level send-result topics**, covering [submission receipts](/analyzing-send-results.html#section-get-receipt), message size, recipient rejection, uncertainty and retry decisions.

Those are documentation topics and configuration entries, not a claim to a particular number of unique features. They overlap, and a heading can cover considerably more than one API call.

Still, "lightweight" seems an odd thing to make the headline out of. The [optional modules](/modules.html) let an application bring in the parts it needs. The interesting question is how much mail-related work the developer no longer has to assemble and maintain themselves.

## Enterprise isn't a different library

I wanted the [case studies](/case-studies.html) to make that breadth tangible, without writing an even longer feature list. The companies are fictional; the library capabilities and the application decisions around them are the point.

At [Polar Meridian Systems](/case-studies/polar-meridian.html), Ravi and Noor build a shared enterprise application-mail service. Login codes need to go ahead of newsletters, confidential maintenance updates need signing and encryption, important communications need reproducible records, and somebody needs to notice when the service is getting slower. Simple Java Mail helps them prepare, protect, submit and investigate those messages; their Dispatcher supplies the durable jobs, priorities and company-wide coordination.

[Staple & Sons](/case-studies/staple-and-sons.html) has a much smaller, self-managed setup and some rather unwelcome users. [RelayDesk](/case-studies/relaydesk.html) deals with separate customers' mail infrastructure, credentials and security requirements. There is also an orc, but I'm reasonably sure that's not an enterprise prerequisite.

These aren't examples of switching from the simple library to the serious one. They use the same library, with different settings and application code for different requirements. I want someone evaluating it to see those possibilities before dismissing it as a tool for their smallest use case.

## Looking outside Java raised the bar

The [Compare libraries page](/feature-matrix.html) asks what work remains in your application when you choose among the Java mail APIs. That is useful, but staying inside that comparison would give me a rather comfortable view of my own project.

The wider SMTP-client research compared nine library stacks across seven language ecosystems. It excluded hosted delivery APIs, inbox protocols and full mail servers: I wanted to compare the software a developer uses to construct and submit an email. The [original research](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/docs/research/simple-java-mail-world-class-smtp-research.pdf) dates from August 2026; the [progress companion](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/docs/research/simple-java-mail-world-class-smtp-progress-report.md) records what changed afterward. This is a source-based comparison, not a cross-library performance benchmark.

Here is the short version of the challenge those projects set:

| Library | What makes it worth looking at |
| --- | --- |
| [MailKit](https://mimekit.net/docs/html/T_MailKit_Net_Smtp_SmtpCapabilities.htm) / [MimeKit](https://mimekit.net/), .NET | Broad modern SMTP-extension support, alongside a substantial MIME and cryptographic toolkit. A serious bar for protocol coverage. |
| [Nodemailer](https://nodemailer.com/smtp/pooled), Node.js | Reusable SMTP pools, sending limits and capacity notifications that help applications feed work without piling everything into memory. |
| [Symfony Mailer](https://symfony.com/doc/current/mailer.html), PHP | Framework integration, failover transports, testing facilities and asynchronous jobs through Messenger. |
| [Vert.x Mail Client](https://vertx.io/docs/vertx-mail-client/java/), Java | An asynchronous client with connection pooling and negotiated PIPELINING; a different execution model from dispatching blocking SMTP work to workers. |

*The comparison changes depending on whether you care about protocol coverage, operating the workload or integrating it into an application.*

None of that says Simple Java Mail should imitate every one of them. It does mean that a pleasant builder API is only part of a pleasant mailing experience. If a developer still has to guess which recipients were accepted, whether a failed send can safely be retried, or why their supposedly asynchronous service is filling up, the hard part has merely moved further down the page.

## Version 10 takes Simple past the happy path

The 10.0.0 work is meant to close those gaps while keeping the experience coherent. At this writing it is still development work, not the feature set of a published 9.x release.

Take a reply addressed to three people. The server accepts one recipient and rejects the others. An exception on its own leaves the application with an awkward question: should it send the whole message again? In 10.0.0, [recipient results and retry guidance](/analyzing-send-results.html#section-retry-decisions) let the application inspect the evidence rather than reconstruct it from an exception chain. If acceptance is uncertain, the result preserves that uncertainty instead of giving a reassuring answer it cannot support.

The same idea runs through [configuration snapshots and redacted diagnostics](/debugging.html#section-config-diagnostics), [offline rehearsal](/debugging.html#section-choose-diagnostic), and [execution controls and sending limits](/sending-and-execution.html). Which settings reached this Mailer? What does the prepared message require? Where did the send spend its time? Those are ordinary questions once email is part of an application people depend on. Making them easier to answer belongs under Simple too.

There are still gaps. The October progress assessment keeps MailKit ahead on protocol breadth, and does not count PIPELINING or CHUNKING as implemented SJM capabilities. Nor does it claim that dispatching blocking work makes SJM an event-loop-native client. I don't need the new website to hide those differences; I need it to give people a fair picture of what the library does well and what remains to be done.

## I'm keeping the Simple

<a href="/assets/journal/common/captain-sjm-darkmode.png"><img src="/assets/journal/common/captain-sjm-darkmode.png" alt="Captain Simple Java Mail winks in a blue superhero suit with the SJM emblem on his chest" class="journal-paragraph-image" style="width:320px; max-width:100%;" width="1024" height="1536" loading="lazy" decoding="async" /></a>

A better website cannot repair a broken API, but a good API can be overlooked behind a website that undersells it. That is what I am trying to fix with the new presentation, the case studies and the clearer references: make the easy entrance visible without concealing the rooms behind it.

I still want the first email to be straightforward. I also want the developer to stay comfortable when that email needs a signature, a different SMTP route, a deadline or an explanation of a partial failure. Some of those requirements are complicated. The library earns its name by helping the person using it deal with them.

Simple Java Mail. The Java and Mail parts can keep doing what they were doing. I'm keeping the Simple too; I just need to be clearer about who it is for.
