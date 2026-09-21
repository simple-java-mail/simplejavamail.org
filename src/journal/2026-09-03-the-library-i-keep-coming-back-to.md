---
title: "The Library I Keep Coming Back To"
description: "On maintaining Simple Java Mail through two public sabbaticals, work, family, hyperfocus and a late return through coding agents."
date: "2026-09-01"
category: "Maintainer practice"
series:
  title: "Twenty Years of Simple Java Mail"
  part: 3
  total: 3
draft: true
typora-root-url: ..
typora-copy-images-to: ../assets/journal
banner-type: note
banner-header: "AI-Assisted"
banner-body: "This article is from a set of three that emerged from a deep AI-assisted archaeology dig. Due to the long history and sheer number of references unearthed, this article was also streamlined using AI and wouldn't have been possible otherwise."
---

## The release graph tells on me

Simple Java Mail's release history shows lots of activity, but it's not entirely steady and it contains some huge gaps. It shows somebody forgetting the project exists, remembering it very intensely and then apparently refusing to sleep for a while. That somebody is me. Welcome in my ADHD-fuelled world of must-finish now, and then some time later: "cya in a year or so!" (save security support)

Case in point: the repository contains no commits at all in 2013 and 2014. There are twenty-three release tags in 2024, two in 2025 and another eighteen by the start of September 2026.

<figure class="journal-activity-figure" data-pagefind-ignore>
  <div class="journal-activity-chart">
    <img src="/assets/journal/simple-java-mail-ecosystem-code-activity.svg" width="960" height="286" alt="Monthly stacked bars of code activity across eleven repositories from April 2009 through August 2026. The graph nearly flatlines during the 2012 to 2015 and 2025 to 2026 sabbaticals, then peaks in mid-2026.">
  </div>
  <figcaption>Monthly activity across eleven repositories. Each bar counts repository-weeks in which GitHub recorded additions or deletions</figcaption>
</figure>

Adding the supporting projects does not make the gaps disappear. Across all eleven repositories, there are no recorded code changes from September 2012 through October 2014, and none again from July 2025 through February 2026. This is public code activity rather than a diary, but the blank space is telling.

For a long time I regarded those gaps as something of a minor shame. A serious maintainer is supposed to work from a roadmap, keep a sustainable cadence, triage issues on schedule and always know what comes next. I do use roadmaps and milestones, but that is not what makes me return to a project. Interest does. Once it catches, I can move a ridiculous amount of work in a short time. When it disappears, no perfectly groomed backlog is going to manufacture it.

This is not the tidy story of how to maintain an open-source library. It is how I have maintained Simple Java Mail.

## The sabbaticals have dates

After releasing 2.1 in August 2012, I went [nearly three years without a commit](https://github.com/bbottema/simple-java-mail/commits/c6c0e7e61359047a4ba5f8c89c1d02aed3f38b28/).

I still left the occasional reply on Google Code. A custom-`Session` bug was opened in 2012; in 2013 the reporter returned to say that his project [depended on it being fixed](/sources/google-code/simple-java-mail/issue-7.html#comment-2). Another user simply asked, ["Hello?? Is anyone maintaining this library?"](/sources/google-code/simple-java-mail/issue-8.html#comment-1).

Development resumed in April 2015 with Jared Stewart's [fluent builder contribution](https://github.com/bbottema/simple-java-mail/commit/3290baac7dd11622ea5b224e9778e826c918104f). His proposal made me realize there was an opportunity to greatly improve on API ergonomics, which eventually led me to ditch all the [telescopic constructors and methods](https://qr.ae/pFeNJ8). Also the `Session` bug was [finally fixed during that return](/sources/google-code/simple-java-mail/issue-7.html#comment-6).

The second long break ran from April 2025 to April 2026, [almost a year without a commit](https://github.com/bbottema/simple-java-mail/commits/b1c8b1ecbf05371c9d6db2d25f035f2d8c6a7002/). Feature development resumed in June and 9.0.0 followed in July.

## In between work and family

As you can read in [Simple Java Mail's Origin Story](/journal/simple-java-mails-origin-story.html), I have had a full-time job for about as long as I have maintained this project. I married ten years ago and had my firstborn eight years ago. Since then the family has grown, the jobs have changed and the available hours have mostly moved in one direction.

Simple Java Mail is not my job. I have never earned anything with it. It is a work of passion and a source of some of my most useful learning experiences, but it still has to fit around the parts of life that are not optional. That is not a complaint or a claim to martyrdom. It is simply the budget the project has always had.

Open source can make that budget strangely invisible. Users encounter a library at the point where they need it. They do not see whether its maintainer is on a lunch break, putting a child to bed, on holiday or supposed to be finishing something for an actual employer. An issue remains equally present on GitHub, and sometimes feels like an open wound.

## In between projects

I have also had numerous other projects running continuously. Sometimes I focus on them for a prolonged time and Simple Java Mail takes a backseat. They are not distractions in the sense that Simple Java Mail is the one true project and everything else gets in the way. They are things I wanted to build, problems I wanted to understand and, quite often, the place where my attention had decided to live.

That has produced some long silences. It has also fed work back into Simple Java Mail. Problems near the library branched into separate projects for pooling, Outlook and RTF parsing, DKIM, S/MIME and proxy test infrastructure. Some I built, some I extracted from other work and some I inherited from earlier maintainers. The actual family history is complicated enough to need [its own article](/journal/the-libraries-behind-simple-java-mail.html).

So the attention does not merely leave and return. It branches. Occasionally I come back carrying something useful. Occasionally I come back to discover that I have several more repositories that now also need updates. It's a juggling act and my ADHD has me focus narrowly on a few projects at a time.

## Episodes of hyperfocus

I have ADHD, and for me that is both a boon and a curse. Hyperfocus allows me to get a great deal of work done in a very short time. I can hold a large architectural change in my head, chase it through multiple modules and supporting repositories, and keep going until the shape of the whole thing feels right.

The other side is that interest has an off switch. When I lose it, the project goes on the backburner until I come around. I can still respond to something urgent, especially a security problem, but the energy needed to reopen a large design question is not reliably available just because the issue has been waiting for six months.

The Git history occasionally records the hyperfocus a little too literally. [Releasing 2.1 took forty-two commits](https://github.com/bbottema/simple-java-mail/compare/79410398341b293aaa2ddb196b5f481c5984747a...55a2893eb720d311b8e213f3ac0da2b3d0cf25f8) across 8 and 9 August 2012, including seventeen release preparations, eight rollbacks and one accidental attempt to prepare 2.2 before 2.1 had escaped. The [last successful release sequence](https://github.com/bbottema/simple-java-mail/commit/e2a454d856f5cf0a786663ce504eb534e0ffb578) came at the end of two days spent arguing with the Maven release plugin. Then, naturally, the project went quiet for almost three years.

A month with several releases does not necessarily mean that Simple Java Mail has entered a new era of weekly development. It might mean that I am in the middle of an episode and should make good use of it while it lasts.

It also affects which work I enjoy. A thorny problem that connects API design, architecture and several odd SMTP behaviours can pull me in completely. A small administrative task can remain open next to it for an embarrassing amount of time.

## Leaving myself a way back

Every return begins with reading code I used to know. Names are familiar, decisions feel vaguely justified and some piece of implementation waits like a note written by a previous version of me who assumed I would remember the context forever.

Over time I got better at leaving more than vague memories behind. Tests remind me what the code is supposed to do, migration guides explain what changed for users and issues record why I added a feature. S/MIME, Outlook support, batch processing and Spring integration live in separate Maven modules. The build still enforces which can depend on which, even when I no longer remember why a shortcut was rejected.

I describe how that structure developed in [Still the Same Ticket](/journal/twenty-years-of-simple-java-mail.html). The architecture acts as memory with a compiler attached.

That does not make returning effortless. Builds rot, dependencies move and assumptions age. But a project that explains and tests its own structure gives a returning maintainer somewhere to stand. I'm pretty meticulous about the engineering. I want the codebase to be readable and maintainable for anyone looking at it, including future me. It's matter of personal integrity, but pride as well. A public project like this also exposes you to some extend.

## I thought I was done

At some point I basically gave up on maintaining the library other than security updates. There was no announcement and no dramatic moment where I archived the repository. Projects kept piling up, my family kept growing and my job demanded more of my time. I archived all the email notifications under a "GitHub" label in Gmail, thinking maybe one day I'll get back to it.

The backlog accumulated accordingly. Some issues were feature requests I had already postponed several times. Others needed research across Jakarta Mail, SMTP providers or one of the supporting libraries. Even when a solution looked straightforward, getting enough uninterrupted time to reload all the relevant context made starting unattractive.

The S/MIME migration left a particularly honest paper trail. In August 2021 I had permission to take over an archived dependency and wrote that ["the ball is completely in my court"](https://github.com/bbottema/simple-java-mail/issues/334#issuecomment-900194758), followed immediately by the admission that I had no time span for doing it. By December I had all the permissions and had begun the Jakarta Mail migration, but [put it on hold to catch my breath](https://github.com/bbottema/simple-java-mail/issues/295#issuecomment-1000912695). Four days later the whole stack was migrated. The issue is practically a graph of the switch turning off and on.

Security updates were different. They gave me a specific problem to fix and a clear reason to make time for it. Everything else could wait, and increasingly I assumed that it probably would.

## Then agents changed the arithmetic

On 6 June 2026 somebody opened an issue with a very fair title: ["is the project dead?"](https://github.com/bbottema/simple-java-mail/issues/612). From the outside it looked like a year without commits, milestones or movement. I could answer, slightly cheekily, ["Actually I committed code this very week :)"](https://github.com/bbottema/simple-java-mail/issues/612#issuecomment-4640671700) and point to the branches. I also explained that I had been busy with other projects, private life and becoming a father again, and that coding agents had helped me pick up the work.

I started getting comfortable with Claude Code and Codex and realised something: the library's architecture and existing code had matured enough that coding agents could add features without wandering off too much. They can still wander, but tests, module boundaries, established patterns and seventeen years of repository history give them rails that a younger project would not have had.

Combined with my long experience as a software developer and architect, that made me more effective with a coding agent than I anticipated. I took a proper subscription to Codex and processed roughly two years of backlog in less than a month. Much of it happened while managing the work remotely from my phone, wherever I happened to be. I acted as product owner, UX expert (yes API ergonomics is a thing) and architect, Codex my dev team. I'm not shy about it.

This changed more than the speed of typing. Previously I needed a block of time large enough to load the problem, investigate it, implement it and keep the whole thing warm in my head. With an agent I could start an investigation, go back to the rest of my life, read the findings later, narrow the problem and then set the next piece in motion. Fragmented time became useful. Literally, any small amount of waiting time allowed me to check how Codex was doing, review something, or steer direction. I've never felt so productive before.

One month after that "is the project dead?" issue, I could go back and answer: ["Well, you got your wish :)"](https://github.com/bbottema/simple-java-mail/issues/612#issuecomment-4912878717). Version 9.0.0 had landed. It is fitting that the next major version is 10.0.0, which is turning out to be a celebration release of magnitude. Great things are coming.

## What agent-based development actually looks like

I think I am in a luxury position with the project as its own agent harness. I documented how the project works, what the important mechanics are, a [complete API expansion workflow](https://github.com/bbottema/simple-java-mail/commit/32d6b5e72465066c8bc547d5b84342dba90d5628) and a release workflow.

I wrote a comprehensive [Coding Style document](https://github.com/bbottema/simple-java-mail/blob/cc1db5122ecd06e8f0f0cd698a5f5dbb7cb131ee/CODING_STYLE_GUIDE.md) that is the culmination of my experience as a software engineer. It combines and balances Clean Code, all the abbreviations like YAGNI, and most important to me: how to keep the code readable, maintainable, cognitive low-pressure. I want the process to be functionally written before implementing low-level details, enabling functional drill-down when reading it. I've always considered coding a craft and I make coding agents live my vision.

I do not hand an issue to an agent and accept whatever commit falls out. I make it investigate the code and history, research the external behaviour, come up with proposals and write a plan. I review that work, correct assumptions and reduce the scope. Only then do I put it to work.

After the implementation I review the diff, the tests and the claims it makes. I check whether the changes are in the right parts of the code and work together end-to-end. The API expansion guide lays out those routes. A new email option needs to reach the model, survive copying and affect the final `MimeMessage`. Where applicable, it also needs to work through configuration and the CLI.

Am I seeing weird code. Is the documentation concentrated in the right place with the right density etc. etc. Usually there are another two or three iterations. Sometimes the implementation is technically sound but solves a neighbouring problem I did not ask to change. Sometimes it follows a local pattern that should itself be retired. Sometimes every test passes and the API still feels wrong.

I don't consider this 'vibe' coding; I don't go by vibe, I go by rigorous standards, reviews, rails. I'm still very much hands-on and I'll kill any vibe that doesn't live up to my standards. That said, agents keep improving and I find myself having to correct them less and less.

Agents are extremely good at sustained execution. They can trace a call path across modules without becoming bored, enumerate compatibility cases, write the repetitive tests and hold a large amount of repository context at once. They are also perfectly capable of being confidently wrong at greater speed.

## The work that does not delegate

I still spend plenty of time deciding whether I want a feature at all. Should a feature expand Simple Java Mail's responsibility or remain the user's responsibility? Does a convenience method clarify the API or begin another overload jungle? Is an escape hatch genuinely supported, or merely an internal object users happened to reach? Does a security default protect most users without making a legitimate deployment impossible?

Those are library-ethics questions as much as technical ones. They affect users who will never read the issue discussion and may remain on a version for years. I still have to be willing to say no, admit that an earlier decision was wrong, preserve an awkward compatibility path when users depend on it, or remove one when its long-term cost is worse.

## Another burst, probably

Coding agents did not cure my ADHD, create more hours in a day or turn Simple Java Mail into my job. They do not guarantee a predictable cadence. Looking at the release graph, it would be dishonest to declare that I have finally found a stable development cadence. This may just be another burst, but it is certainly a _much_ more productive one, and it has changed what I think is possible for a project maintained in the margins of a life.

Simple Java Mail is the library I keep coming back to.
