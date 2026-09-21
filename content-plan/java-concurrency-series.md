# Java Concurrency in Practice: remaining series material

Part 1 is the SOCKS bridge article in `src/journal/2026-09-08-set-phasers-to-synchronize.md`, at `/journal/set-phasers-to-synchronize.html`. These are unpublished drafts, so filenames and URLs can change with the content. The series has no fixed total yet; decide subsequent article divisions as the material is written.

This is a planning draft, outside the published site. The remaining outline below was moved intact from the original article. References to preceding sections or later in the article need adapting when each follow-up is drafted.

Possible groupings, not a committed part count: scheduling and overload; results and cancellation; shutdown and testing. Do not publish empty placeholder articles for these groups.

Keeping the bridge alive was one problem. Deciding how much work to run at once was another.

## `Runnable`: the job is not the thread

*Reader journey:* Follow the send closure from the preceding sections back to `sendMail()`. Show where synchronous and asynchronous execution diverge: the same packaged operation can run directly or be handed to an executor. Introduce the queue and worker here without repeating the whole send path as a separate overview.

## When sends arrive faster than they finish

*Reader journey:* Follow the asynchronous branch into `ThreadPoolExecutor` and `BlockingQueue`: how many sends run, where the rest wait, and what happens when there is no room left. Introduce backpressure through that concrete situation. Date the later bounded-admission implementation explicitly; explain worker count, queue capacity, timed admission and rejection before secondary settings such as fairness and keep-alive. Bring in atomic rejection counters where they are used rather than as a separate catalogue of atomic classes.

## `CompletableFuture`: getting the result back

*Reader journey:* Now follow completion, failure and rejected work back to the caller. Distinguish the executor running the send from the future reporting its outcome. Show any compare-and-set completion guards alongside the race they prevent, and be precise about what cancellation does and does not stop.

## `ConcurrentHashMap`: keeping a live registry

*Reader journey:* Follow a running send into its pooled transport lease. Show how active leases are tracked while other sends acquire and release theirs. Reconnect to the bridge example: a concurrent collection makes its own operations safe, but coordinating lease acquisition with shutdown still takes more than choosing the right map.

## Threads are resources too

*Reader journey:* Return to the original question of when shared infrastructure can stop, now at the scale of the mailer. Follow shutdown through accepted sends, transport leases and executor threads. Explain draining with monitor `wait()` and `notifyAll()`, caller-supplied versus library-created executors, daemon status and core-thread timeout using the current implementation, clearly separated from the earlier bridge history.

## `ThreadLocal`: detecting a worker from the inside

*Reader journey:* Introduce the shutdown corner case: what if a callback running on a mailer worker asks the mailer to close? Show how thread-confined context identifies that worker and prevents it from waiting for its own termination. This also pays off the ThreadLocal aside in the introduction.

## The concurrency laboratory

*Reader journey:* Use latches and deliberately stalled operations to manufacture queue saturation, cancellation, lease, and shutdown interleavings, showing how a test can prove a race-handling claim instead of merely hoping to encounter the race.

## Choosing the mechanism from the invariant

*Reader journey:* Return briefly to the Phaser that became a counter. Tie the ending to the problems the reader has followed: keeping the bridge alive, scheduling sends, handling overload, reporting results and shutting down. Let those examples carry the conclusion instead of summarizing every concurrency class again.
