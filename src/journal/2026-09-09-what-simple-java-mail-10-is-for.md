---
title: "So, let's discuss Simple Java Mail 10"
description: "Twenty years of careful library growth met an LLM-powered development explosion. Simple Java Mail 10 is where that local singularity turns a convenient SMTP client into an enterprise-grade application-mail framework without abandoning the promise in its name."
date: "2026-09-09"
category: "Maintainer practice"
draft: true
typora-root-url: ..
typora-copy-images-to: ../assets/journal/articles/what-simple-java-mail-10-is-for
banner-type: note
banner-header: "From the author"
banner-body: "I wanted to give version 10 more space than a release note. Coding agents helped me build it, and helped me shape this draft too. I'm excited about what the library has become, even if keeping up with it has been quite a ride."
---

[![A maintainer grips luminous controls as giant AI coding hands expand an SJM apparatus into a growing software architecture amid a storm of SMTP envelopes](/assets/journal/articles/what-simple-java-mail-10-is-for/sjm-singularity-10.0.0.jpg "The local singularity")](/assets/journal/articles/what-simple-java-mail-10-is-for/sjm-singularity-10.0.0.jpg)

*The agents keep building, the mail keeps flying, and I'm still holding the reins.*

Simple Java Mail 10 is the result of what I can only describe as a local singularity. Almost twenty years of carefully accumulated structure met coding agents capable of turning months of intent into days of implementation. The project began growing faster than I could keep every implementation detail in my head.

That led to the rather uncomfortable question of whether it was [still my library](/journal/is-it-still-my-library.html). I'll leave the identity crisis over there for now. Here I want to look at what came out of the explosion, because the answer has changed how I think about SJM's place in an application.

It has grown into an enterprise-grade application-mail framework. Quite a mouthful for something called Simple Java Mail, but I think version 10 earns it.

## A local singularity

SJM had already grown considerably before this release. It could construct the awkward MIME structures, convert messages, sign and encrypt them, reuse connections and work with groups of SMTP servers. Those capabilities accumulated over years, often in response to somebody needing the library to do one more useful thing.

With coding agents, I could pursue several of those things at once. A question about configuration became work on immutable snapshots and value provenance. A question about failed sends led into recipient results, uncertainty and safe retries. Once those pieces existed, failover had to respect them too. Each addition made another improvement possible, while raising the expectations for how all of them should work together.

The scale became rather hard to miss. On **13 November 2026**, the [version 10 release history](https://github.com/bbottema/simple-java-mail/blob/218f2f78669f934f45852d342ff66d31af8e84d2/RELEASE_HISTORY.md) referred to **153 distinct GitHub issues**, while the [architecture directory](https://github.com/bbottema/simple-java-mail/tree/218f2f78669f934f45852d342ff66d31af8e84d2/docs/adr) contained **42 decision records**. Those numbers include fixes and longstanding design decisions, not just new features; they do give some idea of how much there is to keep straight.

<!-- Source snapshot: 2026-11-13, SJM commit 218f2f78669f934f45852d342ff66d31af8e84d2. Count distinct bbottema/simple-java-mail issues/<number> references in the v10.0.0 section of RELEASE_HISTORY.md and numbered docs/adr/*.md files. These are issue references and project-wide decision records, not counts of released features. -->

For a more personal measure, the failover review alone was divided into thirty batches. Even the architectural summary became a lot to absorb. I was getting the kind of implementation breadth I'd normally associate with a team, with my own intentions still supplying the direction.

The existing discipline made that possible. The modules, established patterns and separation of concerns gave the agents somewhere to put their work, while giving me a way to notice when they were putting it in the wrong place. Twenty years of being particular about a library turned out to be quite useful preparation for this.

## Where I went looking for growth

Having agents that could implement changes quickly gave me more room to investigate what would be worth adding. I approached that question from four directions:

1. **Start with SJM's existing API.** Given the objects and operations we already have, what useful next step could a developer take? Preparing an email, inspecting it and sending it should fit together comfortably, so a capability can grow out of something the caller already understands.
2. **Look at Angus.** [Angus supplies the SMTP transport](https://eclipse-ee4j.github.io/angus-mail/docs/api/org.eclipse.angus.mail/org/eclipse/angus/mail/smtp/package-summary.html), and it has controls and protocol behavior that SJM hasn't always made easy to reach. Which would help our users through our usual API, and where could the transport itself improve?
3. **Look outside Java.** The [wider SMTP-library comparison](#standing-beside-the-serious-smtp-frameworks) challenged my assumptions about what a mature client should offer. It gave me useful gaps to investigate, as well as examples of how other projects make demanding mail workloads easier to manage.
4. **Ask what our case-study developers still need.** Building the [case studies](/case-studies.html) gave me concrete jobs and constraints to work through, and another way to notice where the library left developers with unnecessary work. What would make a performance investigation easier, or give a SaaS developer a clearer explanation of a failed customer send? The companies are fictional, but the difficulties their developers encounter are quite recognizable.

These views informed one another: a case study could reveal an awkward task, Angus might already provide part of the machinery, and another library might show a comfortable way to expose it. My job was to decide whether the result belonged in SJM and how it should feel to the person using it. Faster implementation made that judgment more important.

## What actually exploded

The interesting growth is around the work an application does with email. Constructing a valid message is only the beginning of the questions its developers will ask.

| The application needs to know | What the 10.0.0 work brings together |
| --- | --- |
| Which settings will this send use? | [Configuration snapshots and provenance](/debugging.html#section-config-diagnostics), with [locked requirements](/configuration.html#section-locked-configuration) where customization must preserve a rule. |
| What are we about to submit? | [Offline rehearsal](/debugging.html#section-choose-diagnostic) of the effective message, envelope and encoded size before contacting SMTP. |
| How much work can we take on? | [Async queue limits](/sending-and-execution.html#section-async-queue), [sending limits](/sending-and-execution.html#section-sending-limits) and [deadlines](/sending-and-execution.html#section-send-deadlines), alongside the existing connection pools. |
| Can this server handle the message? | [Connection probes](/debugging.html#section-smtp-capabilities) and submission checks for requirements such as internationalized addresses, message size and [onward TLS](/security.html#section-requiretls). |
| What happened to each recipient? | [Submission receipts](/analyzing-send-results.html#section-get-receipt) with recipient evidence, partial acceptance and explicit uncertainty. |
| When can we try again, or use another server? | [Bounded retries](/mail-send-retries.html) for safely refused temporary submissions and [connection failover](/smtp-connection-failover.html), with different rules for each. |
| Can we investigate the communication later? | [Send-result observation](/analyzing-send-results.html#section-observer-results), timing diagnostics and [exact EML submission](/email-conversion.html#section-exact-eml) for preserving an authoritative message. |
| What can we use from received mail? | [Readable content and retained originals](/email-conversion.html#section-source-inspection), with protection facts for the content we actually use. |
| What did a later delivery report say? | [Parsed notifications](/delivery-reports.html), with recipient results and identifiers for matching the report to a send. |

*Version 10 connects message construction, sending controls and received-mail inspection through the same library.*

### Recovery needs to know what failed

Consider an invoice whose SMTP connection disappears after the application uploads it. A retry sounds helpful, until you realise the server might already have accepted the invoice. The application needs to know what was observed before it can choose responsibly, and sometimes the honest answer is that acceptance is unknown.

The recent [connection-failover work](/smtp-connection-failover.html) handles an earlier failure: the chosen relay cannot provide a usable connection. SJM can try an approved alternative and reconsider the primary on later sends, while preserving the sending requirements that apply. A busy pool still follows its normal waiting rules, because more work than the pool can handle doesn't establish that the relay is broken.

The separately configured [retry policy](/mail-send-retries.html) deals with a relay that clearly refused the whole submission temporarily. It can schedule bounded attempts with backoff, reusing the prepared message and staying with the selected relay. Partial or uncertain acceptance stops automatic replay. That gives the application useful recovery without turning an exception into permission to send the invoice twice.

Both capabilities preserve one logical send and its final result, so the application can investigate the recovery as part of the same operation. If the server's reply goes missing, the application still has to decide what to do, since the invoice may already have been accepted.

[Live progress](/analyzing-send-results.html#section-live-progress) also shows what a send is doing now, including available upload progress and connection stages. It extends the same direction: the application should have useful information while work is happening, as well as when it finishes.

## From convenience library to application-mail framework

This is where my description of SJM began to feel too small. A convenient builder is still a good place to start, but it doesn't describe the help a developer now gets when email becomes part of a service people depend on.

At [Polar Meridian Systems](/case-studies/polar-meridian.html), the fictional enterprise in our case studies, Ravi needs login codes to keep moving during a large newsletter run. He also needs protected partner communications and records that explain what the application submitted. Noor needs to notice degrading performance before it becomes everybody's problem. SJM supplies preparation, protection, sending controls and evidence that their application can build on; their Dispatcher gives those pieces a company-wide job to do.

[RelayDesk](/case-studies/relaydesk.html) puts a different demand on the same library. Each customer controls its own mail infrastructure, so one customer's broken credentials must leave everyone else able to send. Reusable Mailers, approved server groups and useful failure results become part of maintaining those separate integrations. The cyberpunk setting is optional, although I became rather attached to the orc.

Meanwhile, [Staple & Sons](/case-studies/staple-and-sons.html) uses a smaller, self-managed setup. Its developers need to stop abuse, protect their messages and bring an overloaded mail service back under control. They can use the same library without first building Polar Meridian's organization around it.

Those stories helped me see the framework taking shape. Their applications need different arrangements, but all three can assemble them from a coherent set of mail capabilities. Version 10 gives developers more room to grow within SJM.

## Enterprise does not mean becoming Exchange

An enterprise already has mail servers, network controls and teams looking after them. SJM earns a place there by helping the applications that use that infrastructure. A relay can accept an invoice, but it cannot explain why the application queued it behind a newsletter or which configuration selected its archive recipient.

The application also has decisions the library cannot make for it. Polar Meridian decides how urgent a login code is, stores jobs durably, allocates shared provider capacity and sets its retention policy. SJM's queue and rate controls work within the configured local scope; a fleet of application processes still needs coordination where they share an account-wide quota.

Security follows the same division of work. Version 10 adds [OpenPGP/MIME](/security.html#section-sending-openpgp) and lets callers [inspect the protection of the exact received content they use](/security.html#section-inspecting-received-protection). It also strengthens how message requirements, effective configuration and transport decisions fit together. The application still has to approve recipients and keys, protect stored copies and choose the appropriate settings. Having a security feature available does not enable it for every send.

That's the kind of enterprise framework I want to make: a dependable part of an application, with enough control and information that the surrounding system can do its job well. It remains a client of the mail infrastructure, even when its responsibilities are substantial.

## Standing beside the serious SMTP frameworks

Once I began evaluating SJM at that level, comparing it only with other Java wrappers stopped being enough. The [cross-language research from August](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/docs/research/simple-java-mail-world-class-smtp-research.pdf) gave me a broader set of expectations. It predates the failover and retry implementations; the [progress companion](https://github.com/bbottema/simple-java-mail/blob/codex/10.0.0/docs/research/simple-java-mail-world-class-smtp-progress-report.md) follows those additions and records the remaining gaps.

[MailKit and MimeKit](https://mimekit.net/) set a serious standard for SMTP protocol coverage and message handling. [Nodemailer's pooling and capacity notifications](https://nodemailer.com/smtp/pooled) make operating a workload part of the normal API experience, while [Symfony Mailer](https://symfony.com/doc/current/mailer.html#high-availability) combines transport failover with the surrounding framework's job-processing facilities. In Java, [Vert.x Mail Client](https://vertx.io/docs/vertx-mail-client/java/) offers asynchronous I/O and negotiated PIPELINING, a different approach from running blocking SMTP work on SJM's workers.

Looking at those projects gave the release a more demanding target. I wanted SJM to be evaluated beside them for the whole experience of constructing, protecting, configuring, operating and investigating application mail. Many individual capabilities already exist elsewhere; the opportunity is in how comfortably they work together here.

There are still gaps. [MailKit's SMTP capabilities](https://mimekit.net/docs/html/T_MailKit_Net_Smtp_SmtpCapabilities.htm) include PIPELINING, CHUNKING and BINARYMIME. SJM 10 supports PIPELINING and CHUNKING as well. An async SJM API also does not turn its transport into an event-loop client. The research is a comparison of documented behavior and implementation evidence; it doesn't establish cross-library throughput leadership.

Even with those differences, I think SJM can now make a serious case for one of the strongest overall application-mail experiences across these ecosystems. The contribution I find most compelling is that a developer can configure a send, control its resources, preserve its message and understand its failure through APIs designed to work together.

## The growth reaches upstream

The protocol comparison took me beyond exposing what Angus already did and into improving the transport itself. The work led to several changes in Angus itself. One fixes [message lines beginning with a dot when using BDAT](https://github.com/eclipse-ee4j/angus-mail/pull/210); another prevents [SMTP capabilities from carrying over when they no longer apply](https://github.com/eclipse-ee4j/angus-mail/pull/218).

Other changes came out of SJM's connection and security work. Angus can now [use separate connection and TLS socket factories](https://github.com/eclipse-ee4j/angus-mail/pull/228), making it possible to combine a custom connection path, such as a proxy, with custom TLS settings. A [hostname-verifier rejection](https://github.com/eclipse-ee4j/angus-mail/pull/236) also retains a distinct exception type, so an application can tell it apart from an ordinary connection failure. SJM 10 brings these upstream improvements along through its updated Angus runtime, and other Angus users benefit too.

The [PIPELINING work](https://github.com/eclipse-ee4j/angus-mail/issues/213) lets a client send several SMTP commands before waiting for their replies, reducing network round trips. The investigation also led to [hostname-verification fixes in Angus](https://github.com/eclipse-ee4j/angus-mail/pull/242) and [a bug report further upstream in Google's Conscrypt](https://github.com/google/conscrypt/issues/1567). The ability to investigate and contribute at that level changes where the project can go next, and AI assistance has made that practical for me at this pace.

## Complexity moved; it did not disappear

Of course, somebody still has to implement all of that. The tiny failover API that set off my identity crisis reaches into message preparation, configuration, connection pools, recovery, cancellation and completion. Keeping it comfortable for the caller required a much larger change underneath.

I want that trade to be useful to the developer. They should be able to choose another approved relay without writing the library's recovery machinery themselves. They should also be able to see why a retry stopped, or why a requirement prevented submission, instead of needing to learn the implementation to explain its behavior.

Some decisions rightly remain visible. The library cannot guess whether two servers are equivalent, whether an application permits partial recipient acceptance, or how much queued work it can afford. Making those choices explicit gives the application control without asking it to rebuild SMTP handling from scratch.

That is the promise I explore in [The Simple in Simple Java Mail](/journal/the-simple-in-simple-java-mail.html). The first email should remain approachable, and the more demanding email should still feel like it belongs in the same library.

## A major version that earns its number

Making the pieces fit together has a cost for existing users. Version 10 reorganizes builder entry points around an explicit factory, moves application configuration into immutable snapshots, separates synchronous and asynchronous execution, and makes submission results part of the ordinary send contract.

Some migration work is mechanical. Other changes deserve a closer look: asynchronous validation happens during execution, clustered sends use the selected Mailer's message configuration, and live Mailers cannot compete to own the same mutable Session. The [migration notes](/migration-notes-10.0.0.html) explain those changes because the new model needs to be dependable for users upgrading from the old one too.

The release also needs evidence beyond my enthusiasm. Work such as the [retry verification](https://github.com/bbottema/simple-java-mail/blob/45c8182b6f52429424ae08a28490bd708e4a4881/docs/plans/756-safe-mail-send-retries.md#execution-evidence) and [API cleanup review](https://github.com/bbottema/simple-java-mail/blob/45c8182b6f52429424ae08a28490bd708e4a4881/docs/plans/756-api-boundary-cleanup.md#verification-evidence) checks how those decisions hold up in real sending and integration scenarios.

## After the explosion

I set out to make email easier to work with, and almost twenty years later that ambition has become considerably larger. Coding agents made a pace of development possible that I couldn't have sustained on my own. The library's existing shape helped me keep that growth pointed in a direction I still recognize.

SJM 10 is where I want the resulting framework to stand up in enterprise applications and beside the leading SMTP libraries, with the evidence and ergonomics to justify its place. The name can stay approachable even as the work behind it grows.

I'm still working out what that means for me as its maintainer. But the direction I want for the library is clear: more capable, easier to reason about, and still Simple to use.

<!-- TODO: Confirm the publication date and refresh the development snapshot, review status, evidence links and capability claims against the final 10.0.0 release. -->
