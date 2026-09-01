---
title: "Simple Java Mail's Origin Story"
description: "How an email bug at an insurance company became a utility class, then Vesijama, and eventually Simple Java Mail."
date: "2026-08-29"
category: "Project history"
typora-root-url: ..
typora-copy-images-to: ../assets/journal
---

## It's 2006 and there's no Stack Overflow

We are going back all the way to 2006. I was fresh out of computer science school and had joined a Java team at a large insurance company. A bug report came in that had apparently been bouncing between the dev team and the business manager for a while: emails sent from the backends behaved inconsistently in mail clients. Attachments weren't shown properly, downloads sometimes had no progress indicator because their size was indeterminate, or the plain text body was rendered even though an HTML body was available. We are talking about Outlook, Thunderbird, and a plethora of webmail clients, including small internet providers with their own webmail interfaces. It was a mess and the ticket kept growing back like a bad weed. Specifically a hogweed, because developers didn't like touching it and kept burning themselves whenever they did.

And now it was my turn.

## Down the MIME dungeon

The email bug ended up on my plate. `new MimeMessage(...)` this, `new MimeMultipart("alternative")` that, with `MimeBodyPart`s, `DataHandler`s and hand-written `Content-ID` headers scattered between them. And it's recursive! I couldn't match any of it to what in my mind was a simple object tree: email → body, plus optional attachments and inline images. Boy was I wrong.

So as the RFCs popped up, I rose to the challenge and went deeper and deeper. Each RFC was another step down into the dungeon, the JavaMail API my map and other people's code samples my candle. I studied the `MimeMessage` structure thoroughly... err, well... actually no. That's a complete lie. I was never an academic and the MIME standards have always confounded me, even to this day. What I did instead was scour the internet for tutorials, examples and blog posts until I connected enough dots to see that every combination of content needed its own nesting: plain text and HTML as alternatives, inline images related to the body, and attachments wrapped around the whole thing. I identified [eight main configurations](/rfc-compliant.html#section-explore-multipart), and wrote a utility class that figured out the right structure. Lo and behold, emails started rendering consistently across Outlook, Thunderbird and the assorted webmail clients we'd been fighting with.

That idea is still visible in the code [today](https://github.com/bbottema/simple-java-mail/blob/982007485db7a5397e7c2782bfc296c530636a14/modules/simple-java-mail/src/main/java/org/simplejavamail/converter/internal/mimemessage/MimeMessageProducerHelper.java):

```java
private static final List<SpecializedMimeMessageProducer> mimeMessageProducers = Arrays.asList(
	new MimeMessageProducerSimple(),
	new MimeMessageProducerAlternative(),
	new MimeMessageProducerRelated(),
	new MimeMessageProducerMixed(),
	new MimeMessageProducerMixedRelated(),
	new MimeMessageProducerMixedAlternative(),
	new MimeMessageProducerRelatedAlternative(),
	new MimeMessageProducerMixedRelatedAlternative()
);
```

## Why turn it into a library?

Considering the countless Sun JavaMail articles out there, I knew I wasn't the only one with this issue, yet the structure I had discovered seemed to be missing from all of them. Even Sun's own documentation was bare bones; they had no cookbook, no holistic tutorials, no guides that I was aware of that dealt with this top-down view of how all these pieces were supposed to fit together. Or perhaps it was out there, buried under the same low-level terminology you already needed to understand before you could find it.

So, I thought, "let's share this epiphany with the world," and while I was at it: "Why burden anyone with thinking in MIME structures at all? Just tell the API what kind of email you want to send, and let it figure out the appropriate `MimeMessage` structure".

## What's a Vesijama?

And so, on April 26th, 2009, I posted the first release to Google Code. It was named... Vesijama. WHAT!?

Yeah, I even wrote a blog post about it, [still available](https://web.archive.org/web/20091119045617/http://blog.projectnibble.org/2009/04/27/vesijama-very-simple-java-mail) in the Internet Archive's Wayback Machine. Vesijama, or **Ve**ry **Si**mple **Ja**va **Ma**il... I thought I was being clever, but as one of my blog readers [pointed out](https://web.archive.org/web/20150531075139/http://blog.projectnibble.org/2009/04/27/vesijama-very-simple-java-mail/comment-page-1/#comment-1305): "there is no way I’m installing a file on my client’s computer with a name like “vesijama” :)". Ouch. In March 2011, the project was renamed to Simple Java Mail. A name with its own problems, but it was appropriate at the time.

![A 2010 blog comment praising the library but criticizing the Vesijama filename](/assets/journal/user-indicates-vesijama-is-bad.png)

## Twenty years after that first ticket

Twenty years? Ouch again. Well, the library has grown far beyond that first utility class, but the original idea survived: you should describe the email you want to send, not the MIME tree to make that work. The difference is that I just took it way further and Simple Java Mail now covers a [wide range of capabilities](/features.html) that go beyond Jakarta Mail itself, like [S/MIME](/security.html#section-sending-smime) and [advanced connection pooling and clustering](/smtp-connection-pooling.html), to name a few.

That promise has become harder to define as the library grew, however. Hiding complexity versus giving control requires a delicate balance. Simple Java Mail tries to take responsibility for the things it can solve but leaves [escape hatches](/features.html#section-extension-points) for users that need more control. The balance is not always simple, despite the name. Twenty years later, I am still working on that same ticket.
