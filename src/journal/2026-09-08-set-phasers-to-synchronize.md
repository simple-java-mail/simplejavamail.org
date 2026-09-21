---
title: "Set Phasers to Synchronize: Keeping the SOCKS Bridge Alive"
subtitle: "Set phasers to ~~stun~~ synchronize!"
description: "How Simple Java Mail kept a shared SOCKS bridge alive, replaced a Phaser with an atomic counter, and learned to wait for the listener to stop."
date: "2026-09-08"
category: "Library design"
series:
  title: "Java Concurrency in Practice"
  part: 1
draft: true
typora-root-url: ..
typora-copy-images-to: ../assets/journal
banner-type: note
banner-header: "AI-Assisted"
banner-body: "This draft began as an AI-assisted outline for a future Engineering Journal article."
---

![A retro-futurist space officer fires a beam that brings floating clocks into sync.](/assets/journal/set-phasers-to-synchronize.png)

I studied concurrent programming models in Computer Science at school, where I learned the basics such as latches, semaphores, barriers, but never did I think I would actually have to use this foundation in my own projects. I mean sure, everything works on threads, but the kind of work I did for my job was mostly on top of servlets with Spring or J2EE, where this kind of thing is mostly managed (don't get me started on inherited/nested ThreadLocal holders, though).

Simple Java Mail, however, is not a servlet-based server type of application, but it wants to do a bunch of things at the same time; in parallel for performance, buffering for convenience, back-pressured for stability, multi-clustered for horizontal scaling and failover.

[Twenty years](/journal/twenty-years-of-simple-java-mail.html) in, Simple Java Mail employs a bunch of concurrency patterns, but [ten years ago](https://github.com/bbottema/simple-java-mail/commit/21634338b8c1c9cde8f5eaa591fb1e5d28371284), shortly after I added authenticated SOCKS proxy support, I reached for the [Phaser](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/concurrent/Phaser.html)...

## `Phaser`: coordinating a party whose size keeps changing

The [SOCKS bridge](<!-- TODO: link to the right website doc section -->) is a small local server that uniquely forwards JavaMail’s unauthenticated proxy connections through an authenticated SOCKS proxy. That gives it a lifecycle: start it when needed, keep it alive while sends depend on it, and stop it when the last one finishes. I covered its origins in [A tale of two proxies](/journal/the-libraries-behind-simple-java-mail.html#a-tale-of-two-proxies).

The hard part was knowing when that last send had finished. I could not know the number of sends beforehand, and new ones could arrive while others were still running. A `CountDownLatch` can only count down from its initial count. A `CyclicBarrier` lets a fixed number of participants wait for each other. Neither fitted a group that kept changing.

A `Phaser` let each send register before being submitted and deregister when it finished. As long as anyone remained registered, the bridge still had work to do. The last one out could turn off the lights.

These two excerpts come from [the implementation just before the May 2019 refactor](https://github.com/bbottema/simple-java-mail/blob/32d1941a9a5b0dd3f7230069ddf8890042ae9a84/modules/simple-java-mail/src/main/java/org/simplejavamail/mailer/internal/mailsender/MailSenderImpl.java). Logging and unrelated sending code are omitted:
```java
// At submission, inside the synchronized send(...) method:
if (smtpRequestsPhaser == null || smtpRequestsPhaser.isTerminated()) {
    smtpRequestsPhaser = new Phaser();
}
smtpRequestsPhaser.register();

// At completion:
private synchronized void checkShutDownRunningProcesses() {
    smtpRequestsPhaser.arriveAndDeregister();
    if (smtpRequestsPhaser.getUnarrivedParties() == 0) {
        if (needsAuthenticatedProxy() && proxyServer.isRunning() && !proxyServer.isStopping()) {
            proxyServer.stop();
        }
    }
}
```
The reset at the top mattered too. Once the last send deregistered, this phaser terminated. A later batch needed a new one. Notice that both methods were already `synchronized`; the phaser did not coordinate the bridge lifecycle on its own.

But by Simple Java Mail 6.0.0, I had [replaced it with an `AtomicInteger`](https://github.com/bbottema/simple-java-mail/commit/5411f9c6a4165c10d5c9251135dbf6d7478bbfe2). Looking at what the code actually did, I wasn’t asking sends to wait for each other or advance through phases. I was counting them.

## `AtomicInteger`: one more send, one less send

An `AtomicInteger` made tracking emails simpler: one more send, one less send. But just reaching zero is not enough, you also have to make sure it stays zero until the bridge has shut down. Otherwise you risk crashing send jobs mid-air. You have to somehow *synchronize* these activities.

In the replacement, the [send closure's constructor increased the shared counter](https://github.com/bbottema/simple-java-mail/blob/5411f9c6a4165c10d5c9251135dbf6d7478bbfe2/modules/simple-java-mail/src/main/java/org/simplejavamail/mailer/internal/mailsender/AbstractProxyServerSyncingClosure.java#L22-L43), before the work could be submitted to an executor. A send waiting for a worker still needed the bridge to remain available. Once the closure ran, cleanup happened in `finally`, whether sending succeeded or threw an exception:

```java
public final void run() {
    try {
        startProxyServerIfNeeded();
        executeClosure();
    } finally {
        shutDownProxyServerIfRunningAndCurrentBatchCompleted();
    }
}
```

The cleanup method decremented the counter and checked the result. An [atomic increment or decrement](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html) prevents concurrent updates from overwriting each other. It does not make the subsequent call to another object part of that same atomic operation.

## `synchronized`: Java’s multithreading workhorse

Suppose the last send decrements the counter to zero. Before it calls `stop()`, another thread registers a new send. The counter is now one, but the first thread has already decided to close the bridge. Both updates were perfectly atomic. The decision was still out of date.

Java gives every object a [monitor lock](https://docs.oracle.com/javase/specs/jls/se11/html/jls-17.html#jls-17.1). A `synchronized` block acquires that lock before entering and releases it when leaving, including when an exception escapes. Another thread trying to acquire the same lock has to wait. The important word is *same*: synchronizing on two different objects does not make the threads wait for each other.

Here are the two counter operations from [the May 2019 replacement](https://github.com/bbottema/simple-java-mail/blob/5411f9c6a4165c10d5c9251135dbf6d7478bbfe2/modules/simple-java-mail/src/main/java/org/simplejavamail/mailer/internal/mailsender/AbstractProxyServerSyncingClosure.java#L29-L74), with logging omitted:

```java
private void increaseSmtpConnectionCounter() {
    synchronized (smtpConnectionCounter) {
        smtpConnectionCounter.incrementAndGet();
    }
}

private void shutDownProxyServerIfRunningAndCurrentBatchCompleted() {
    synchronized (smtpConnectionCounter) {
        if (smtpConnectionCounter.decrementAndGet() == 0) {
            if (proxyServer != null) {
                synchronized (proxyServer) {
                    if (proxyServer.isRunning() && !proxyServer.isStopping()) {
                        proxyServer.stop();
                    }
                }
            }
        }
    }
}
```

The lock around `incrementAndGet()` may look like it does nothing and on its own that would be true. However, the lock is acquired elsewhere, too: the last send holds that same counter lock while checking for zero and calling `stop()`. A new _send_ cannot increment the counter halfway through those steps. Just calling an atomic method does not automatically acquire the object's monitor; the explicit `synchronized` block is what makes registration wait here.

The second lock, on `proxyServer`, serves a different purpose. The [startup method used that same object](https://github.com/bbottema/simple-java-mail/blob/5411f9c6a4165c10d5c9251135dbf6d7478bbfe2/modules/simple-java-mail/src/main/java/org/simplejavamail/mailer/internal/mailsender/AbstractProxyServerSyncingClosure.java#L47-L56) to coordinate checking whether the bridge was running and starting it if necessary. The actual email send ran outside these blocks, so asynchronous sends could still overlap.

There is a catch in this historical version. Holding the counter lock through `stop()` was not the same as waiting for the bridge to finish shutting down. Its [`stop()` method closed the listening socket](https://github.com/bbottema/simple-java-mail/blob/5411f9c6a4165c10d5c9251135dbf6d7478bbfe2/modules/authenticated-socks-module/src/main/java/org/simplejavamail/internal/authenticatedsockssupport/socks5server/AnonymousSocks5ServerImpl.java#L56-L84), but the bridge thread shut down its worker pool afterwards. The counter could increase again before that thread finished. The locks protected the decision and the call; they did not provide the full shutdown guarantee I described above. [This was a bug](https://github.com/bbottema/simple-java-mail/commit/38b119d9633434256e403900f5ee209e778a4ced).

## Waiting for the listener to stop

That sync bug was addressed [during the 10.0.0 work](https://github.com/bbottema/simple-java-mail/issues/694#issuecomment-5393805734), in the [24 August 2026 proxy refactor](https://github.com/bbottema/simple-java-mail/commit/38b119d9633434256e403900f5ee209e778a4ced). The bridge now keeps a reference to its listener thread, and after closing the listening socket, `stop()` calls `join()` on that thread, making it wait. The outer counter lock stays held during that call, preventing another send from registering halfway through. So, both the bridge and the user are told to wait until the work is done and new work can start the whole cycle over again.

Let's see what that looks like. To stop the bridge and wait for it to finish, [`stop()` needs two things: the listening socket to close, and the listener thread to wait for](https://github.com/bbottema/simple-java-mail/blob/38b119d9633434256e403900f5ee209e778a4ced/modules/authenticated-socks-module/src/main/java/org/simplejavamail/internal/authenticatedsockssupport/socks5server/AnonymousSocks5ServerImpl.java#L85-L114). The bridge has its own lock, `lifecycleMonitor`, to coordinate changes to its internal state. Under that lock, we mark it as stopping and save those two references for the next step:

```java
final ServerSocket serverSocketToClose;
final Thread listenerThreadToJoin;
synchronized (lifecycleMonitor) {
    if (!running) {
        return;
    }
    stopping = true;
    serverSocketToClose = serverSocket;
    listenerThreadToJoin = listenerThread;
}
```

Then it closes the socket and waits for the listener to finish. But we have to release `lifecycleMonitor` before waiting: the listener needs that same lock to clear its state before it can exit. Keep the lock while waiting, and neither thread can make progress. That's a deadlock. The outer counter lock stays held, though, so new sends still have to wait their turn:

```java
try {
    if (serverSocketToClose != null) {
        serverSocketToClose.close();
    }
} catch (final IOException e) {
    throw new SocksException(e.getMessage(), e);
}

if (listenerThreadToJoin != null && listenerThreadToJoin != Thread.currentThread()) {
    try {
        listenerThreadToJoin.join();
    } catch (final InterruptedException e) {
        Thread.currentThread().interrupt();
        throw new SocksException("interrupted while stopping socks5bridge server", e);
    }
}
```

The listener needs the same monitor to [clear its state before it exits](https://github.com/bbottema/simple-java-mail/blob/38b119d9633434256e403900f5ee209e778a4ced/modules/authenticated-socks-module/src/main/java/org/simplejavamail/internal/authenticatedsockssupport/socks5server/AnonymousSocks5ServerImpl.java#L150-L158):

```java
synchronized (lifecycleMonitor) {
    if (serverSocket == activeServerSocket) {
        serverSocket = null;
        threadPool = null;
        listenerThread = null;
        running = false;
        stopping = false;
    }
}
```

Stopping the listener does not mean killing every connection it has already accepted. Pooled SMTP connections can still be using their bridge sockets, so normal listener shutdown now calls `shutdown()` on its worker pool rather than `shutdownNow()`. Existing relay work can continue until those transports close. Waiting for the listener and waiting for every relay connection are different jobs.

There is also a [restart test](https://github.com/bbottema/simple-java-mail/blob/38b119d9633434256e403900f5ee209e778a4ced/modules/authenticated-socks-module/src/test/java/org/simplejavamail/internal/authenticatedsockssupport/socks5server/AnonymousSocks5ServerImplTest.java#L35-L56) that calls `stop()`, checks that the bridge is no longer running, occupies its old port and starts it again on a new one. That is a rather more convincing end to this story than just seeing the counter reach zero.

This is a simple setup, but as you'll see in the current 10.0.0 ongoing work, there's extensive synchronizing machinery coming to capture the complete lifecycle of sending and cancelling of send operations. <!-- TODO: make good on this promise by referencing it in a later (last?) article of this series -->
