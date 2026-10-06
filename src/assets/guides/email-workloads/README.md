# Email workload field-guide examples

These are the Java snippets from [When One Email Becomes a Million](https://www.simplejavamail.org/email-workload-field-guide.html).

The examples target the current development API. Use `org.simplejavamail:simple-java-mail`; connection pooling and multiple built-in asynchronous workers also require the optional `org.simplejavamail:batch-module` with the matching version. The source can be compiled on Java 11 or newer with those dependencies. It has no `main` method and sends no mail unless you call its sending methods.

`smtpBuilder` parameters are `MailerRegularBuilder` instances obtained from a `SimpleJavaMail` factory and already configured for an authorized SMTP endpoint, credentials and transport strategy. Builder settings are applied before constructing a reusable Mailer. Customer cluster keys come from your application configuration; use distinct keys for unrelated customers and reuse a key only for approved, equivalent relays.

The application constructs each `Email` and supplies an `Iterable<Email>` for a batch. The iterable may load messages lazily. A batch stops at its first failure; a completion observer and your job store must preserve attempted-message results if you need restartable progress.

`recipientsSafeToRetry` selects candidates; it neither submits nor schedules retries. An empty list can mean accepted mail, permanent rejection or insufficient/ambiguous evidence. Persist and inspect the full receipt before deciding what to do. The application rebuilds any retry envelope without confirmed recipients and chooses timing and attempt limits.

`verifyReplacement` performs an authenticated connection probe and refuses an unsuccessful or unauthenticated report. It sends no email and does not replace a controlled test message. `preparedBytes` prepares the complete encoded message offline; it neither probes a relay nor promises delivery. `advertisesSmtpUtf8` preserves the distinction between unknown capabilities and an inspected set without SMTPUTF8.

`allowPartialReply` copies a composed email and enables sending to accepted recipients for that workflow. A partial submission still reports a failed operation with recipient facts. Do not use copying to preserve an exact-EML submission; that has a separate byte-preserving path. `observedMailer` demonstrates a timing-only observer: combine it with existing result/archive handling rather than replacing that handling. The supplied `recordTimings` consumer should be lightweight, or use the observer's executor support for blocking storage.

`stopAndAwaitDispatch` is an application callback that stops new job handoffs and waits for existing handoffs to finish. Invoke `stopSending` from the shutdown coordinator, not from a send callback. The application owns `observationWorkers` and must account separately for any other executors or downstream acknowledgements. The callback timeout does not bound the preceding Mailer close.

The field guide's rates, deadlines and volumes are hypothetical design inputs, not performance measurements or provider defaults. These methods do not provide durable storage, tenant authorization, distributed quotas, priority scheduling or final-delivery guarantees. For assembled application examples, see the [case studies](https://www.simplejavamail.org/case-studies.html).
