---
title: "The Library I Keep Coming Back To"
description: "On maintaining Simple Java Mail through two public sabbaticals, work, family, hyperfocus and a late return through coding agents."
date: "2026-09-01"
category: "Maintainer practice"
series:
  title: "Twenty Years of Simple Java Mail"
  part: 3
  total: 3
typora-root-url: ..
typora-copy-images-to: ../assets/journal/articles/the-library-i-keep-coming-back-to
banner-type: note
banner-header: "From the author"
banner-body: "I used AI to dig through old commits and issue threads for this series and to help shape the draft. The records tell me when I went quiet, and my memory fills in what was happening in my life at the time."
---

_"Is the project dead?"_

## The release graph tells on me

Simple Java Mail's release history shows lots of activity, but it's not entirely steady and it contains some huge gaps. It shows somebody forgetting the project exists, remembering it very intensely and then apparently refusing to sleep for a while. That somebody is me. Welcome to my ADHD-fuelled world of must-finish now, and then some time later, "cya in a year or so!" (save security support)

The main repository went all of 2013 and 2014 without a commit, and the chart shows no activity from July 2025 through February 2026, even with the supporting projects in the mix.

<div class="journal-activity-figure" data-pagefind-ignore>

<div class="journal-activity-chart" data-captioned-image>
  <img src="/assets/journal/articles/the-library-i-keep-coming-back-to/simple-java-mail-ecosystem-code-activity.svg" width="960" height="286" alt="Monthly stacked bars of code activity across eleven repositories from April 2009 through August 2026. The graph nearly flatlines during the 2012 to 2015 and 2025 to 2026 sabbaticals, then peaks in mid-2026.">
</div>

*Each bar counts repository-weeks with GitHub additions or deletions*

</div>

The Git history occasionally records the hyperfocus a little too literally. [Releasing 2.1 took **forty-two commits**](https://github.com/bbottema/simple-java-mail/compare/79410398341b293aaa2ddb196b5f481c5984747a...55a2893eb720d311b8e213f3ac0da2b3d0cf25f8) across **8 and 9 August 2012**, including seventeen release preparations, eight rollbacks and one accidental attempt to prepare 2.2 before 2.1 had escaped. The [last successful release sequence](https://github.com/bbottema/simple-java-mail/commit/e2a454d856f5cf0a786663ce504eb534e0ffb578) came at the end of two days spent arguing with the Maven release plugin. Then, naturally, I went [nearly three years without a commit](https://github.com/bbottema/simple-java-mail/commits/c6c0e7e61359047a4ba5f8c89c1d02aed3f38b28/).

For a long time I regarded those gaps as something of a minor shame. A serious maintainer is supposed to work from a roadmap, keep a sustainable cadence, triage issues on schedule and always know what comes next. I do use roadmaps and milestones, but that is not what makes me return to a project. Interest does. Once it catches, I can move a ridiculous amount of work in a short time. When I lose interest, no perfectly groomed backlog is going to make me want to pick up the project again.

## The sabbaticals have dates

### August 2012 to April 2015

If memory serves, I got burned out on the lack of user input, but more tellingly, that's when I met my wife!

I still left the occasional reply on Google Code. A custom-`Session` bug was opened in 2012; in 2013 the reporter returned to say that his project [depended on it being fixed](/sources/google-code/simple-java-mail/issue-7.html#comment-2). Another user simply asked:

<div class="journal-issue-quote journal-issue-quote--message">

> Hello?? Is anyone maintaining this library?

[5 November 2012, Google Code comment](/sources/google-code/simple-java-mail/issue-8.html#comment-1)

</div>

Development resumed in April 2015 with Jared Stewart's [fluent builder contribution](https://github.com/bbottema/simple-java-mail/commit/3290baac7dd11622ea5b224e9778e826c918104f). His proposal made me realize there was an opportunity to greatly improve on API ergonomics, which eventually led me to ditch all the [telescopic constructors and methods](https://qr.ae/pFeNJ8). Also the `Session` bug was [finally fixed during that return](/sources/google-code/simple-java-mail/issue-7.html#comment-6).

### April 2025 to April 2026

The second long break was [almost a year without a commit](https://github.com/bbottema/simple-java-mail/commits/b1c8b1ecbf05371c9d6db2d25f035f2d8c6a7002/). By then the library was mature enough for the ways people were already using it, and the backlog was filling up with harder problems around the periphery, like S/MIME edge cases, Outlook quirks and RTF parsing issues. The list was getting daunting, and frankly there was little in it I was excited to pick up, especially when just getting started meant finding an uninterrupted stretch of time I didn't have.

I archived all the email notifications under a "GitHub" label in Gmail, thinking maybe one day I'd get back to the library. I could still make time for a security update because it gave me a specific problem to fix, but at some point I started to think I was done with the rest for good.

## In between releases

### Work and family

As you can read in [Simple Java Mail's Origin Story](/journal/simple-java-mails-origin-story.html), I have had a full-time job for about as long as I have maintained this project. I married in 2015 and had my firstborn in 2018. Since then the family has grown, we bought a house, and as a freelancer I'm always busy switching jobs. Guess what that does to a man's available time.

Simple Java Mail has always had to fit around all that. I’ve learned some of my most useful lessons from it and, in all the years I’ve had a “buy me a coffee” button on the site, earned exactly one coffee.

Still, an issue on GitHub sometimes feels like an open wound and is never far from my thoughts.

### Other projects

Sometimes I spend months on something else, like an Android app or a cloud project, and Simple Java Mail takes a backseat. Occasionally I come back carrying something useful, like [connection pooling](/journal/the-libraries-behind-simple-java-mail.html#a-small-pool-grew-into-a-stack), and discover I have three more repositories that now also need updates. That’s how one thread leak in SJM ended up taking four releases to fix.

### Episodes of hyperfocus

For me, ADHD can mean getting absorbed in an architectural change that spans several repositories while I procrastinate on a small administrative task for an embarrassing amount of time.

After a stretch of that kind of focus, I sometimes hit a limit and my attention shifts to something more passive, like gaming with a good sci-fi story. That can last anywhere from a week to half a year.

The S/MIME migration left a particularly honest paper trail. In August 2021 I had permission to take over an archived dependency.

<div class="journal-issue-quote">

> So the ball is completely in my court, but for past weeks I have been preoccupied completely.

[17 August 2021, S/MIME issue](https://github.com/bbottema/simple-java-mail/issues/334#issuecomment-900194758)

</div>

By December I'd begun the Jakarta Mail migration.

<div class="journal-issue-quote">

> I put it on hold for some time to catch some breath.

[24 December 2021, Jakarta Mail migration issue](https://github.com/bbottema/simple-java-mail/issues/295#issuecomment-1000912695)

</div>

Four days later [the whole stack was migrated](https://github.com/bbottema/simple-java-mail/issues/295#issuecomment-1002168015).

## Picking up where I left off

Every return begins with reading code I used to know. Names are familiar, decisions feel vaguely justified and some piece of implementation waits like a note written by a previous version of me who assumed I would remember the context forever.

The tests, migration guides and issue history were all there, and the build still enforced the module boundaries. I could open an unfinished branch and still think, “What the hell was I up to, and how far along was it?” Working that out took a stretch of uninterrupted time I rarely had.

## Then agents changed the arithmetic

Somebody opened an issue in June 2026 with a very fair title.

<div class="journal-issue-quote journal-issue-quote--message">

> is the project dead?

[6 June 2026, issue title](https://github.com/bbottema/simple-java-mail/issues/612)

</div>

<div class="journal-issue-quote journal-issue-quote--message journal-issue-quote--reply">

> Actually I committed code this very week :) - check the branches.

[6 June 2026, my reply](https://github.com/bbottema/simple-java-mail/issues/612#issuecomment-4640671700)

</div>

I also explained that I had been busy with other projects, private life and becoming a father again, and that coding agents had helped me pick up the work. I took a proper subscription to Codex and processed roughly two years of backlog in less than a month, managing much of it remotely from my phone.

With an agent I could start an investigation, go back to the rest of my life, read the findings later, narrow the problem and then set the next piece in motion. Even a short wait gave me time to check how Codex was doing, review something or steer it in another direction.

A month later I went back to the same issue to say, ["Well, you got your wish :)"](https://github.com/bbottema/simple-java-mail/issues/612#issuecomment-4912878717). Version 9.0.0 had landed. As 10.0.0 took shape, I did start to [question my relationship with Simple Java Mail](/journal/is-it-still-my-library.html).

## Another burst, probably

Looking at the release graph, this may just be another burst, but it is certainly a _much_ more productive one. We've had a baby daughter since then, and with Codex Remote I'm still able to keep working on my projects in between everything else. That has changed what I think is possible for a project maintained in the margins of a life.
