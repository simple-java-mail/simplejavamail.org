---
title: "Simple Java Mail's Origin Story"
description: "How an email bug at an insurance company became a utility class, then Vesijama, and eventually Simple Java Mail."
date: "2026-08-29"
category: "Project history"
draft: true
typora-root-url: ..
typora-copy-images-to: ../assets/journal
---

## It's 2006 and there's no Stack Overflow

We are going back all the way to 2006, I was just out of computer science school and joined a Java team in a large insurance company. A bug report comes in which apparently had been bouncing between the dev team and the business manager for a while now: emails sent from the backends behaved inconsistently in mail clients and sometimes outright wrong. Attachments weren't shown properly, the size wasn't shown or the plain text body was rendered even though an HTML body was available. We are talking about Outlook, Thunderbird, and a plethora of user platforms, like minor internet providers that have their own email interface. It was a mess and the ticket kept growing back like a bad weed. And like the hogweed, developers kept burning themselves by touching this ticket.

And now it was my turn.

## Down the MIME dungeon

The email bug ends up on my plate. `new MimeMessage(...)` this, `new MimeMultipart("alternative")` that, with `MimeBodyPart`s, `DataHandler`s and hand-written `Content-ID` headers scattered between them. I couldn't match any of it to what in my mind was a simple Object tree: email -> content body, optional list of attachments and images. Boy was I wrong.

So as the RFCs popped up, I rose to the challenge and went deeper and deeper. Each RFC was another step down into the dungeon, the JavaMail API my map and other people's code samples my candle. I studied the `MimeMessage` structure thoroughly... err, well... actually no. That's a complete lie. I was never an academic and the MIME standards always confounded me, even to this day. What I did instead was scour the internet for tutorials, examples and blog posts until I connected enough dots to see that every combination of content needed its own nesting: plain text and HTML as alternatives, inline images related to the body, and attachments wrapped around the whole thing. I identified [5 main configurations](/rfc-compliant.html#section-explore-multipart). So I wrote a utility class at this company, to form the right structure. Lo and behold, emails started rendering consistently across email clients, operating systems and web-based clients.

## Why turn it into a library?

Considering the millions of Sun JavaMail articles out there, I knew I wasn't the only one with this issue, yet it seemed the structure as I discovered was somehow missing among them. Even Sun's own documentation was bare bones; they had no cookbook, no holistic tutorials, no guides that I was aware of that dealt with this whole-concept narrative. Or perhaps there were, buried deep under the low-level concept keywords that was part of the rest of the MimeMessage spec.

So, I thought, let's share this epiphany with the world, and while I was at it, I thought: "why even bother anyone with the burden of thinking in MIME structures" Let's think of an API that makes it even simpler: just tell it what you want, and it will figure out the appropriate MimeMessage structure automatically.

## What's a Vesijama?

And so it went, on April 26th 2009, I posted the first release to Google Code. It was named... Vesijama. WHAT!?

Yeah, I even wrote a blog post about it, [still available](https://web.archive.org/web/20091119045617/http://blog.projectnibble.org/2009/04/27/vesijama-very-simple-java-mail) in the Wayback machine internet archive. Vesijama, or **Ve**ry **Si**mple **Ja**va **Ma**il... I thought I was being clever, but as one of my blog readers [pointed out](https://web.archive.org/web/20150531075139/http://blog.projectnibble.org/2009/04/27/vesijama-very-simple-java-mail/comment-page-1/#comment-1305): "there is no way I’m installing a file on my client’s computer with a name like “vesijama” :)". Ouch. In March 2011, the project was renamed to Simple Java Mail. A name with its own problems, but it was appropriate at the time.

![A 2010 blog comment praising the library but criticizing the Vesijama filename](/assets/journal/user-indicates-vesijama-is-bad.png)

## Twenty years later

Twenty years? Ouch again. Well, the library has grown far beyond that first utility class, but the original idea survived: you should describe the email you want to send, not the MIME tree to make that work. The difference is that I just took it to the extreme and Simple Java Mail now covers a [wide range of capabilities](/features.html) not supported out of the box by Jakarta Mail, like [S/MIME](/security.html#section-sending-smime) and [advanced connection pooling and clustering](/smtp-connection-pooling.html), to name a few.

That promise has become harder to define as the library grew, however. Hiding complexity versus giving control requires a delicate balance. Simple Java Mail tries to take responsibility for the things it can solve but leaves [escape hatches](/features.html#section-extension-points) for users that need more control. The balance is not always simple, despite the name. Twenty years later, I am still working on that same ticket.
