# Correlate sends with application jobs

These application-owned Java helpers accompany [Correlate sends with application jobs](/sending-and-execution.html#section-correlate-application-jobs). They use the current public API and Java 11.

- `JobCorrelatedMailer.java` owns one shared Mailer, one handler factory and a private ThreadLocal.
- `JobCorrelationExample.java` supplies explicit callbacks and an application-owned outcome executor, then submits two business job IDs with the same Email.

Use a fresh, approved Mailer builder for the helper. Its constructor installs its own handler factory. Other configuration and shared handlers can be supplied on that builder before construction. Submit through `sendAsync(jobId, email)`; the helper deliberately exposes only individual asynchronous sends.

The job ID is scoped around initiation, captured into a final local value inside the handler factory, and restored or removed in `finally` before `sendAsync` returns. Progress/outcome callbacks use their captured values. They never consult the ThreadLocal later. Queued sends and admission failures therefore retain their own job ID after the submitting thread moves on.

Keep the business job ID, generated observation UUID and MIME Message-ID separate. A new call gets a new observation UUID even when it reuses a job ID or Email. Retries/failover inside that logical send retain its factory-created handlers and captured state.

Lazy batches invoke their handler factories on the execution thread. A caller's ThreadLocal is not automatically propagated there; this wrapper must not be extended to batches by merely wrapping a batch call in the same scope.

Both callbacks must be thread-safe. Progress is lossy and can follow the terminal outcome. Use full outcomes and receipts for terminal decisions. The outcome executor belongs to the application; helper close drains sends and handoff attempts, then the application drains callbacks separately. Executor handoff and console output do not establish durable storage or downstream acknowledgement.

The executable `tests/application-examples/JobCorrelatedMailerTest.java` fixture uses CustomMailer without an SMTP connection. It checks two concurrent sends, two queued sends, queue rejection, distinct observation IDs for one reused Email, captured business-job/outcome correlation, immediate ThreadLocal cleanup and restoration of an earlier scope. It makes no assertion that every progress event arrives. Its compile/run instructions are in `tests/application-examples/README.md` in the website checkout.
