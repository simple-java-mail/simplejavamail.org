---
title: "Benchmarking Your SMTP Server"
description: "Using Simple Java Mail to inspect an SMTP server's capabilities and take a snapshot of its performance with different workloads and connection setups."
date: "2026-10-11"
category: "Engineering practice"
draft: true
typora-root-url: ..
typora-copy-images-to: ../assets/journal/articles/benchmarking-your-smtp-server
---

One successful email tells me that a server can accept that message. It tells me very little about what happens when messages get larger, connections stay open or several sends arrive together. I'd like to use Simple Java Mail to explore those differences and find out what a particular setup can handle today.

## Inspect the server before sending

Start with a [connection probe](/debugging.html#section-smtp-capabilities): inspect the capabilities advertised on that connection, its TLS negotiation and, when requested, authentication. Keep an unreported capability distinct from one the server explicitly does not support.

## Know what you are asking it to send

Use [message rehearsal](/features.html#section-email-validation) to inspect the prepared message's encoded size and envelope recipients before contacting SMTP. Choose repeatable workloads, so a change in message size does not quietly become a change in the benchmark.

## Change the connection setup

Compare [fresh connections and open-connection batches](/sending-and-execution.html#section-batch-and-clustering) with [connection pooling](/smtp-connection-pooling.html). Explore SJM's [connection configuration](/configuration.html#section-programmatic-api-other) where the source address or connection path matters, while keeping unrelated settings constant.

## Increase the load in controlled steps

On an approved test setup, increase concurrent sends gradually and record when latency, rejections or timeouts start to change. Check whether the client is waiting for workers or connections before calling that a server limit.

## Record where the time went

Use [send observation](/sending-and-execution.html#section-mail-send-observer) and available diagnostics to separate client waiting from SMTP activity. Count attempts and recipients explicitly; acceptance by the relay is not proof of arrival in an inbox.

## Keep a snapshot rather than a permanent rating

Record the date, endpoint, connection settings, workload and observed results together. The useful result is a performance snapshot for that setup, including where it began to struggle and what changed when connections were reused.

<!-- TODO: Flesh out the article from an actual controlled experiment. Add current SJM API examples, measured results and a compact comparison chart. Do not invent benchmark numbers or infer an absolute server maximum from one client-side run. -->
