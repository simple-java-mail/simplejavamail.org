# Concurrency article: consolidated scope

The concurrency material now belongs in one Journal article:
`src/journal/2026-09-08-set-phasers-to-synchronize.md`, at
`/journal/set-phasers-to-synchronize.html`. It is not a series. The former
follow-up topics have been folded into the expanded draft where they add a
distinct concurrency concern; no additional article pages are planned here.

## Editorial direction

Use descriptive topic headings so readers can scan for a concern or tool.
Each section stands on its own: establish the problem, show the relevant
implementation decision, and explain what the regression test checks.
The maintainer's experiences and judgment belong in the prose; do not impose
one continuous incident across these unrelated examples.

Condense the SOCKS bridge history into the opening technical section. Explain
its locking once, keeping the shutdown gap and corrective commit. Later
sections should cover different mechanisms rather than repeatedly teaching
`synchronized`.

## Sections incorporated in the article

1. **Tracking active sends: from `Phaser` to `AtomicInteger`.** Dynamic
   participation, the zero-check race and waiting for listener shutdown.
2. **Backpressure with `ThreadPoolExecutor` and bounded queues.** Queue shapes,
   rejection or bounded waiting, and restoring a worker after idle expiry.
3. **Cancellation versus completion.** Detached `CompletableFuture` result
   views, explicit cancellation requests and compare-and-set arbitration
   between queued cancellation and execution.
4. **Safe cancellation of pooled connections.** Resource-specific stop
   registrations, closing an in-flight registration before reuse, and
   invalidating an aborted connection.
5. **Detecting callback self-waits with `ThreadLocal`.** Operation context,
   rejection before shutdown starts, and restoring nested context.
6. **Reproducing concurrency bugs with `CountDownLatch`.** Controlled
   interleavings, bounded waits, thread-state checks and the limits of what
   each regression test establishes.

## Source material

Historical bridge examples retain their pinned commits. Current behavior is
grounded in the parent repository's `docs/concurrency/01-send-operation.md`,
`02-mailer-lifecycle.md`, `03-executor-admission.md` and
`05-stop-registration.md`, together with their implementation and regression
tests. Keep historical and development-era behavior explicitly separate.

## Material held back

The old outline also covered `Runnable`, live registries with
`ConcurrentHashMap`, executor ownership, thread naming and daemon status,
and a fuller shutdown walkthrough. These remain possible supporting details,
not promised follow-up articles. Add them only if a concrete problem earns
the space; the draft should not become a catalogue of every concurrency
class used by the library. The detailed concurrency documentation remains
the home for full state machines and lock maps.
