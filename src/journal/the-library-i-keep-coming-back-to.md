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
ai-banner: "This article is from a set of three that emerged from a deep AI-assisted archaeology dig. Due to the long history and sheer number of references unearthed, this article was also streamlined using AI and wouldn't have been possible otherwise."
---

## The release graph tells on me

Simple Java Mail's release history does not show steady progress. It shows somebody forgetting the project exists, remembering it very intensely and then apparently refusing to sleep for a while. That somebody is me.

The repository contains no commits at all in 2013 and 2014. There are twenty-three release tags in 2024, two in 2025 and another eighteen by the start of September 2026. You can clearly find evidence of my attention moving in and out of the project. The development rhythm is not a line. It is a collection of spikes.

For a long time I regarded those gaps as something I should explain away. A serious maintainer is supposed to work from a roadmap, keep a sustainable cadence, triage issues on schedule and always know what comes next. I do use roadmaps and milestones, but that is not what makes me return to a project. Interest does. Once it catches, I can move a ridiculous amount of work in a short time. When it disappears, no perfectly groomed backlog is going to manufacture it.

This is not the tidy story of how to maintain an open-source library. It is how I have maintained this one.

## The sabbaticals have dates

Looking at the graph, there are two periods I can honestly call sabbaticals rather than a few quiet months.

After releasing [2.1](https://repo1.maven.org/maven2/org/codemonkey/simplejavamail/simple-java-mail/2.1/) on 9 August 2012, [the code stopped](https://github.com/bbottema/simple-java-mail/commit/55a2893eb720d311b8e213f3ac0da2b3d0cf25f8). The next repository commit was an administrative README deletion on [17 April 2015](https://github.com/bbottema/simple-java-mail/commit/c6c0e7e61359047a4ba5f8c89c1d02aed3f38b28): 981 days later. Substantive development restarted near the end of that month with Jared Stewart's [fluent builder contribution](https://github.com/bbottema/simple-java-mail/commit/3290baac7dd11622ea5b224e9778e826c918104f). The next stable release, [2.2](https://repo1.maven.org/maven2/org/codemonkey/simplejavamail/simple-java-mail/2.2/), reached Maven Central 1,003 days after 2.1.

That was a public-code and release sabbatical, not a complete disappearance. I left a few replies on Google Code. In some ways that made the absence more visible. A custom-`Session` bug was opened in 2012; in 2013 the reporter returned to say that his project [depended on it being fixed](/sources/google-code/simple-java-mail/issue-7.html#comment-2). Another issue simply asked, ["Hello?? Is anyone maintaining this library?"](/sources/google-code/simple-java-mail/issue-8.html#comment-1). Both waited for the 2015 return.

The second proper sabbatical is recent. After 8.12.6 on [18 April 2025](https://github.com/bbottema/simple-java-mail/commit/892c322c616828980cdcc3b7267a8d375b7cad8e), the repository recorded nothing at all for 348 days. I resurfaced on [1 April 2026](https://github.com/bbottema/simple-java-mail/commit/b1c8b1ecbf05371c9d6db2d25f035f2d8c6a7002), first reconciling branches and writing down an [API workflow for developers and coding agents](https://github.com/bbottema/simple-java-mail/commit/32d6b5e72465066c8bc547d5b84342dba90d5628). Feature development resumed in June. Version 9.0.0 followed on 8 July, about 446 days after the previous release.

Even the early Vesijama years came in bursts, with code gaps of 335 and 235 days before 2011. I do not count those as sabbaticals because I was answering issues during at least part of them. Nor does every long gap between release tags mean the project was inactive. Some versions were never tagged and some quiet release periods contain plenty of development. The early commit history was imported from Google Code as well, so the timestamps are meaningful but the Git hashes themselves are migration artefacts. The point is not to find the most dramatic number. The point is that the stop-start rhythm is quite real and has been public from the beginning.

## In between work and family

As you can read in [Simple Java Mail's Origin Story](/journal/simple-java-mails-origin-story.html), I have had a full-time job for about as long as I have maintained this project. I married ten years ago and had my firstborn eight years ago. Since then the family has grown, the jobs have changed and the available hours have mostly moved in one direction.

Simple Java Mail is not my job. I have never earned anything with it. It is a work of passion and a source of some of my most useful learning experiences, but it still has to fit around the parts of life that are not optional. That is not a complaint or a claim to martyrdom. It is simply the budget the project has always had.

Open source can make that budget strangely invisible. Users encounter a library at the point where they need it. They do not see whether its maintainer is on a lunch break, putting a child to bed, on holiday or supposed to be finishing something for an actual employer. An issue remains equally present on GitHub during all of those situations. I remain very inconsistently present beside it.

## In between projects

I have also had numerous other projects running continuously. Sometimes I focus on them for a prolonged time and Simple Java Mail takes a backseat. They are not distractions in the sense that Simple Java Mail is the one true project and everything else gets in the way. They are things I wanted to build, problems I wanted to understand and, quite often, the place where my attention had decided to live.

That has produced some long silences. It has also fed work back into Simple Java Mail. Problems near the library branched into separate projects for pooling, Outlook and RTF parsing, DKIM, S/MIME and proxy test infrastructure. Some I built, some I extracted from other work and some I inherited from earlier maintainers. The actual family history is complicated enough to need [its own article](/journal/the-libraries-behind-simple-java-mail.html).

So the attention does not merely leave and return. It branches. Occasionally I come back carrying something useful. Occasionally I come back to discover that I have several more repositories that now also need updates.

## Episodes of hyperfocus

I have ADHD, and for me that is both a boon and a curse. Hyperfocus allows me to get a great deal of work done in a very short time. I can hold a large architectural change in my head, chase it through multiple modules and supporting repositories, and keep going until the shape of the whole thing feels right.

The other side is that interest has an off switch. When I lose it, the project goes on the backburner until I come around. I can still respond to something urgent, especially a security problem, but the energy needed to reopen a large design question is not reliably available just because the issue has been waiting for six months.

The Git history occasionally records the hyperfocus a little too literally. [Releasing 2.1 took forty-two commits](https://github.com/bbottema/simple-java-mail/compare/79410398341b293aaa2ddb196b5f481c5984747a...55a2893eb720d311b8e213f3ac0da2b3d0cf25f8) across 8 and 9 August 2012, including seventeen release preparations, eight rollbacks and one accidental attempt to prepare 2.2 before 2.1 had escaped. The [last successful release sequence](https://github.com/bbottema/simple-java-mail/commit/e2a454d856f5cf0a786663ce504eb534e0ffb578) came at the end of two days spent arguing with the Maven release plugin. Then, naturally, the project went quiet for almost three years.

Maven Central had already taken more attention than the code. [A user asked for it in 2010](/sources/project-nibble/vesijama-very-simple-java-mail.html#comment-1221) and I said I would look into it. Sonatype's process felt too involved, I tried it, abandoned it and eventually [announced the 1.9 release in Central](/sources/project-nibble/simple-java-mail-1-9-is-now-available-in-maven-central.html) in August 2011. I was much better at solving a MIME problem than shepherding a release through somebody else's infrastructure.

This is useful to admit because otherwise a burst can look like a promise. A month with several releases does not necessarily mean that Simple Java Mail has entered a new era of weekly development. It might mean that I am in the middle of an episode and should make good use of it while it lasts.

It also affects which work I enjoy. A thorny problem that connects API design, architecture and several odd SMTP behaviours can pull me in completely. A small administrative task can remain open next to it for an embarrassing amount of time. The issue tracker records both without distinction.

## Leaving myself a way back

Every return begins with reading code I used to know. Names are familiar, decisions feel vaguely justified and some piece of implementation waits like a note written by a previous version of me who assumed I would remember the context forever.

Over time I got better at leaving more than vague memories behind. Tests preserve behaviour. Migration guides preserve the cost of old decisions. Issues preserve the discussion that led to a feature. Maven modules enforce dependency directions even when I no longer remember why a shortcut was rejected. S/MIME, Outlook support, batch processing and Spring integration have boundaries that prevent a change in one domain from quietly spreading everywhere else.

I describe how those boundaries developed in [Still the Same Ticket](/journal/twenty-years-of-simple-java-mail.html). Their personal value is simpler: they let me leave. The architecture acts as memory with a compiler attached.

That does not make returning effortless. Builds rot, dependencies move and assumptions age. But a project that explains and tests its own structure gives a returning maintainer somewhere to stand. Much of what looks like engineering discipline from the outside was also me trying to protect the project from my future absence.

## I thought I was done

At some point I basically gave up on maintaining the library other than security updates. There was no announcement and no dramatic moment where I archived the repository. Projects kept piling up, my family kept growing and my job demanded more of my time. I still cared about Simple Java Mail, but caring and actively developing it had stopped being the same thing.

The backlog accumulated accordingly. Some issues were feature requests I had already postponed several times. Others needed research across Jakarta Mail, SMTP providers or one of the supporting libraries. Even when a solution looked straightforward, getting enough uninterrupted time to reload all the relevant context made starting unattractive.

The S/MIME migration left a particularly honest paper trail. In August 2021 I had permission to take over an archived dependency and wrote that ["the ball is completely in my court"](https://github.com/bbottema/simple-java-mail/issues/334#issuecomment-900194758), followed immediately by the admission that I had no time span for doing it. By December I had all the permissions and had begun the Jakarta Mail migration, but [put it on hold to catch my breath](https://github.com/bbottema/simple-java-mail/issues/295#issuecomment-1000912695). Four days later the whole stack was migrated. The issue is practically a graph of the switch turning off and on.

Security updates were different. They arrived with a clear reason to act and a boundary around the work. Everything else could wait, and increasingly I assumed that it probably would.

## Then agents changed the arithmetic

On 6 June 2026 somebody opened an issue with a very fair title: ["is the project dead?"](https://github.com/bbottema/simple-java-mail/issues/612). From the outside it looked like a year without commits, milestones or movement. I could answer, slightly cheekily, ["Actually I committed code this very week :)"](https://github.com/bbottema/simple-java-mail/issues/612#issuecomment-4640671700) and point to the branches. I also explained that I had been busy with other projects, private life and becoming a father again, and that coding agents had helped me pick up the work.

I started getting comfortable with Claude Code and Codex and realised something: the library's architecture and existing code had matured enough that coding agents could add features without wandering off too much. That qualification matters. They can still wander. But tests, module boundaries, established patterns and seventeen years of repository history give them rails that a younger project would not have had.

Combined with my experience as a software developer and architect, that made me unexpectedly effective with a coding agent. I took a proper subscription to Codex and processed roughly two years of backlog in less than a month. Much of it happened while managing the work remotely from my phone, wherever I happened to be.

That last detail changed more than the speed of typing. Previously I needed a block of time large enough to load the problem, investigate it, implement it and keep the whole thing warm in my head. With an agent I could start an investigation, go back to the rest of my life, read the findings later, narrow the problem and then set the next piece in motion. Fragmented time became useful.

The result was the 9.0 release cycle and then the work toward 10.0.0: not because an agent appeared and wrote a new library, but because the activation energy required for me to return had dropped dramatically. One month after that "is the project dead?" issue, I could go back and answer: ["Well, you got your wish :)"](https://github.com/bbottema/simple-java-mail/issues/612#issuecomment-4912878717). Version 9.0.0 had landed.

## What agent-based development actually looks like

I do not hand an issue to an agent and accept whatever commit falls out. I make it investigate the code and history, research the external behaviour, come up with proposals and write a plan. I review that work, correct assumptions, set boundaries and reduce the scope. Only then do I put it to work.

After the implementation I review the diff, the tests and the claims it makes. Usually there are another two or three iterations. Sometimes the implementation is technically sound but solves a neighbouring problem I did not ask to change. Sometimes it follows a local pattern that should itself be retired. Sometimes every test passes and the API still feels wrong.

Agents are extremely good at sustained execution. They can trace a call path across modules without becoming bored, enumerate compatibility cases, write the repetitive tests and hold a large amount of repository context at once. They are also perfectly capable of being confidently wrong at greater speed. The workflow works because I do not confuse persistence with judgment.

The most useful division is not that I design and the agent types. Investigation and implementation move back and forth between us. The division is responsibility. The agent can propose what belongs in the library; I have to decide. It can produce a migration; I have to decide whether the break is justified. It can report that the test suite is green; I have to believe the tests describe the promise I intend to make.

## The work that does not delegate

As implementation became cheaper, decisions became more visible as the scarce part of maintenance. Should a feature expand Simple Java Mail's responsibility or remain application code? Does a convenience method clarify the API or begin another overload jungle? Is an escape hatch genuinely supported, or merely an internal object users happened to reach? Does a security default protect most users without making a legitimate deployment impossible?

Those are library-ethics questions as much as technical ones. They affect users who will never read the issue discussion and may remain on a version for years. An agent can find every call site of a method. It cannot own the promise attached to that method after publication.

Nor can it decide what kind of maintainer I want to be. I still have to be willing to say no, admit that an earlier decision was wrong, preserve an awkward compatibility path when users depend on it, or remove one when its long-term cost is worse. The machine can make each option unusually well researched. The choice remains mine.

## Another burst, probably

Coding agents did not cure my ADHD, create more hours in a day or turn Simple Java Mail into my job. They did not guarantee that this pace will continue. Looking at the release graph, it would be dishonest to declare that I have finally found a stable development cadence.

This may be another burst. It is certainly a much more productive one, and it has changed what I think is possible for a project maintained in the margins of a life. More importantly, it has shown me that the years spent adding tests, boundaries and written context were not merely cleanup. They stored enough of the project outside my head for both an agent and a returning maintainer to work with.

Stewardship, for me, is not continuous motion. It is leaving the project in a state that can survive my absence, and caring enough to understand it again when I return.

Simple Java Mail is the library I keep coming back to.
