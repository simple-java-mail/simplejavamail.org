# When One Email Becomes a Million: workload field-guide planning

This outline is planning material, not a Journal entry or a generated website page.
The agreed direction is a scenario-based reference guide, grouped by design pattern.
Readers should find their situation through a lookup directory and read each entry
independently, with concrete objectives, useful examples and measurable verification.
Total length is secondary to clear navigation and brisk individual scenarios.
The initial working guide now lives in `src/guides/email-workloads.md`, with its
scenario lookup in `email-workloads.11tydata.json`. It is a companion
to Use cases, not a Journal entry or a replacement for the API reference. The
original outline below is retained as source material for further scenarios.

---
title: "When One Email Becomes a Million"
description: "How to reason about extreme-volume SMTP submission using bounded concurrency, advanced pooling, backpressure, fairness, retries, and failure isolation."
date: "2026-09-11"
category: "System design"
typora-root-url: ..
typora-copy-images-to: ../assets/journal/articles/when-one-email-becomes-a-million
banner-type: note
banner-header: "AI-Assisted"
banner-body: "This draft began as an AI-assisted outline for a future Engineering Journal article."
---

<!-- TODO: Replace this outline with the finished article and confirm the publication date. -->

**Hook:** A morning invoice run, a burst of password resets, continuous tenant notifications and an outage replay can all produce a million emails. The count is the same; almost every useful pooling decision is different.

## Define the workload first

*Reader journey:* Replace “a million emails” with workload shapes, latency goals and delivery constraints so the reader has something concrete to design for.

## Build a throughput budget

*Reader journey:* Turn those workloads into a capacity model and separate time spent in Simple Java Mail from provider, network and relay limits.

## Pool topology follows the failure domain

*Reader journey:* Use the capacity model to choose among shared, clustered, regional, per-tenant and priority-separated pools based on isolation and failure boundaries.

## Backpressure is a feature

*Reader journey:* Move from normal capacity to overload behaviour, showing why admission control and bounded queues protect the system rather than diminish it.

## Fairness, priority, and noisy neighbours

*Reader journey:* Add competing workloads and teach the reader to trade utilization for fairness, latency protection and tenant isolation.

## Retry only what the protocol permits

*Reader journey:* Introduce failure semantics before scaling retries, preventing a high-volume recovery mechanism from becoming a high-volume duplicate generator.

## Bound every resource

*Reader journey:* Complete the resource model beyond pool size by accounting for heap, queued content, threads, sockets, leases and the time required to drain or stop them.

## Operate the system from evidence

*Reader journey:* Close the loop with measurements, saturation signals and reproducible load tests so configuration becomes an evidence-based operating decision rather than copied folklore.
