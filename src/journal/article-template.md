---
title: "Replace this with the article title"
description: "Summarize the question, position, or whole-system approach in one concrete sentence."
published: "2026-08-26"
category: "Maintainer practice"
appliesTo:
  - "Simple Java Mail 10.x"
draft: true
---

Open with the situation or tension that made this entry worth writing. The title and description already appear above the article, so the first paragraph can begin the story directly.

## Context

Establish the surrounding system, historical constraint, or maintainer concern. Link to canonical reference documentation rather than duplicating configuration that is likely to change.

## The decision

Explain the position and the trade-offs that produced it. Code fences use the normal site syntax highlighting:

```java
Mailer mailer = SimpleJavaMail.fromDefaults().mailerBuilder().buildMailer();
```

> Use blockquotes for a position, rule of thumb, or important qualification that deserves to interrupt the main argument.

## What this means now

Close with the current position, what remains uncertain, or what you would reconsider when the constraints change.
